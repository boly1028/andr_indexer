import {
  CleanedTx,
  getAdoType,
  getAttribute,
} from "@andromedaprotocol/andromeda.js";
import { Log } from "@cosmjs/stargate/build/logs";
import {
  getADOByAddress,
  saveNewAdo,
  splitAttributesByKey,
  updateAdoOwner,
} from "../services";
import { TransactionError } from "../errors";
import { configDotenv } from "dotenv";
configDotenv();
import { createOrUpdateIndexingStatus } from "../processors";

/**
 * Creates a new ADO object after checking that the ADO does not already exist in the DB
 * @param owner
 * @param address
 * @param minter
 * @param adoType
 * @param height
 * @param hash
 * @param appContract
 * @returns A new ADO object
 */
async function newADO(
  owner: string,
  address: string,
  minter: string,
  name: string,
  adoType: string,
  height: number,
  hash: string,
  appContract?: string
) {
  // Check ADO hasn't been added already
  const savedADO = await getADOByAddress(address);
  if (savedADO) return;

  return {
    owner,
    address,
    minter,
    name,
    adoType,
    instantiateHeight: height,
    instantiateHash: hash,
    lastUpdatedHash: hash,
    lastUpdatedHeight: height,
    appContract,
    chainId: process.env.CHAIN_ID ?? "uni-5",
  };
}

interface AppInstantiationComponentInfo {
  address: string;
  adoType: string;
  owner: string;
  minter: string;
  name: string;
}

/**
 * Returns info about any components instantiated by an app
 * @param logs The logs to retrieve the data from
 * @param appAddress The current app contract address
 * @returns
 */
export function getAppInstantiationComponentInfo(
  logs: readonly Log[],
  appAddress: string
) {
  const components: AppInstantiationComponentInfo[] = [];
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const wasm = log.events.find((ev) => ev.type === "wasm");
    if (!wasm) continue;

    // Attributes are split in to sections, each beginning with the contract address
    const attrSlices = splitAttributesByKey("_contract_address", wasm);

    // Each slice contains info about the component's instantiation
    attrSlices.forEach((attrs) => {
      //Get the contract address attribute for the component
      const addressAttr = attrs.find(({ key }) => key === "_contract_address");
      if (!addressAttr) return;

      //Avoid duplicates
      if (
        components.some(({ address }) => address === addressAttr.value) ||
        addressAttr.value === appAddress
      )
        return;

      //Get the ADO type for the component
      const adoTypeAttr = attrs.find(({ key }) => key === "type");
      if (!adoTypeAttr) return;

      //Get the minter for the component
      const minterAttr = attrs.find(({ key }) => key === "minter");

      //Get the name for the app component
      const componentNameAttr = attrs.find(({ key }) => key === "andr_component");

      components.push({
        address: addressAttr.value,
        adoType: adoTypeAttr.value,
        owner: appAddress,
        minter: minterAttr ? minterAttr.value : "",
        name: componentNameAttr ? componentNameAttr.value : ""
      });
    });
  }

  return components;
}

/**
 * Gets the instantiation info about an ADO from given logs
 * @param logs
 * @returns
 */
export function getInstantiateInfo(logs: readonly Log[]): {
  address: string;
  adoType: string;
  owner: string;
  minter: string;
  name: string;
} {
  const [wasmAttr] = getAttribute("wasm.method", logs);
  if (!wasmAttr) throw new Error("Not an Instantiation");
  const adoType = getAdoType(logs);
  if (!adoType) throw new Error("Not an ADO Tx");
  const [addressAttr] = getAttribute("wasm._contract_address", logs);
  if (!addressAttr) throw new Error("Instantiation did not include an address");
  const [ownerAttr] = getAttribute("wasm.owner", logs);
  const [senderAttr] = getAttribute("message.sender", logs);
  const [minterAttr] = getAttribute("wasm.minter", logs);
  const [appNameAttr] = getAttribute("wasm.andr_app", logs);
  if (!ownerAttr && !senderAttr) {
    console.log("no Owner or no Sender.");
    throw new Error("Instantiation did not include an owner");
  }

  return {
    address: addressAttr.value,
    owner: ownerAttr ? ownerAttr.value : senderAttr.value, //Owner may be defined as an "owner" event or by the "sender"
    minter: minterAttr? minterAttr.value : "",
    adoType,
    name: appNameAttr ? appNameAttr.value: ""
  };
}

/**
 * A handler function for the ADO instantiation query, sifts through transactions to find ADO instantiations before adding them to the DB
 * @param batch
 */
export async function handleADOInstantiate(batch: readonly CleanedTx[], chainId: string) {
  const indexingType = 'instantiations';
  for (let i = 0; i < batch.length; i++) {
    const tx = batch[i];

    try {
      const { address, adoType, owner, minter, name } = getInstantiateInfo(tx.rawLog);
      const appContract = address;
      const ado = await newADO(owner, address, minter, name, adoType, tx.height, tx.hash);
      if (ado) await saveNewAdo(ado);

      if (adoType === "app") {
        const components = getAppInstantiationComponentInfo(tx.rawLog, address);
        for (let j = 0; j < components.length; j++) {
          const { owner, address, adoType, minter, name } = components[j];
          const component = await newADO(
            owner,
            address,
            minter,
            name,
            adoType,
            tx.height,
            tx.hash,
            appContract
          );
          if (component) await saveNewAdo(component);
        }
      }

      await createOrUpdateIndexingStatus(chainId, indexingType, tx.height);
    } catch (error) {
      const { message } = error as Error;
      if (!message.includes("Not an")) {
        throw new TransactionError(tx.hash, tx.height, message);
      }
    }
  }
}

interface UpdateOwnerInfo {
  contractAddress: string;
  newOwner: string;
}

/**
 * Retrieves any ownership updates within a group of logs
 * @param logs
 * @returns
 */
export function getUpdateOwnerLogs(logs: readonly Log[]): UpdateOwnerInfo[] {
  const updates: UpdateOwnerInfo[] = [];

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const wasm = log.events.find((ev) => ev.type === "wasm");
    if (!wasm) continue;

    // Attributes are split in to sections, each beginning with the contract address
    const attrSlices = splitAttributesByKey("_contract_address", wasm);
    // Each slice may contain info about a contract updating ownership
    attrSlices.forEach((attrs) => {
      const contractAddrAttr = attrs.find(
        (attr) => attr.key === "_contract_address"
      );
      if (!contractAddrAttr) return;

      //Find the update owner action index
      const actionIdx = attrs.findIndex(
        ({ key, value }) => key === "action" && value === "update_owner"
      );

      if (typeof actionIdx !== "undefined" && actionIdx >= 0) {
        // The next attribute is always the value of the new owner
        const valueAttr = attrs[actionIdx + 1];
        if (!valueAttr || valueAttr.key !== "value") {
          return;
        }
        const { value: newOwner } = valueAttr;
        updates.push({ contractAddress: contractAddrAttr.value, newOwner });
      }
    });
  }

  return updates;
}

/**
 * A handler function for any ownership updates, sifts through transactions to find ownership updates before updating them in the DB
 * @param batch
 */
export async function handleADOUpdateOwner(batch: readonly CleanedTx[], chainId: string) {
  const indexingType = 'update_owner';
  for (let i = 0; i < batch.length; i++) {
    const tx = batch[i];

    const updates = getUpdateOwnerLogs(tx.rawLog);
    updates.forEach(async ({ contractAddress, newOwner }) => {
      try {
        await updateAdoOwner({
          address: contractAddress,
          newOwner,
          txHeight: tx.height
        });

        await createOrUpdateIndexingStatus(chainId, indexingType, tx.height);
      } catch (error) {
        const { message } = error as Error;
        if (!message.includes("Error executing mongo db update ADO")) {
          throw new TransactionError(tx.hash, tx.height, message);
        }
      }
    });
  }
}
