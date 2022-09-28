import {
  CleanedTx,
  getAdoType,
  getAttribute,
} from "@andromedaprotocol/andromeda.js";
import { Log } from "@cosmjs/stargate/build/logs";
import {
  createADOBulkOperation,
  getADOByAddress,
  saveNewAdo,
  splitAttributesByKey,
} from "../services";
import { TransactionError } from "../errors";

/**
 * Creates a new ADO object after checking that the ADO does not already exist in the DB
 * @param owner
 * @param address
 * @param adoType
 * @param height
 * @param hash
 * @param appContract
 * @returns A new ADO object
 */
async function newADO(
  owner: string,
  address: string,
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

      components.push({
        address: addressAttr.value,
        adoType: adoTypeAttr.value,
        owner: appAddress,
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
} {
  const adoType = getAdoType(logs);
  if (!adoType) throw new Error("Not an ADO Tx");
  const [addressAttr] = getAttribute("instantiate._contract_address", logs);
  if (!addressAttr) throw new Error("Instantiation did not include an address");
  const [ownerAttr] = getAttribute("wasm.owner", logs);
  const [senderAttr] = getAttribute("message.sender", logs);
  if (!ownerAttr && !senderAttr)
    throw new Error("Instantiation did not include an owner");

  return {
    address: addressAttr.value,
    owner: ownerAttr ? ownerAttr.value : senderAttr.value, //Owner may be defined as an "owner" event or by the "sender"
    adoType,
  };
}

/**
 * A handler function for the ADO instantiation query, sifts through transactions to find ADO instantiations before adding them to the DB
 * @param batch
 */
export async function handleADOInstantiate(batch: readonly CleanedTx[]) {
  const bulk = createADOBulkOperation();
  for (let i = 0; i < batch.length; i++) {
    const tx = batch[i];

    try {
      const { address, adoType, owner } = getInstantiateInfo(tx.rawLog);
      const ado = await newADO(owner, address, adoType, tx.height, tx.hash);
      if (ado) await saveNewAdo(ado);

      if (adoType === "app") {
        const components = getAppInstantiationComponentInfo(tx.rawLog, address);
        for (let j = 0; j < components.length; j++) {
          const { owner, address, adoType } = components[j];
          const component = await newADO(
            owner,
            address,
            adoType,
            tx.height,
            tx.hash,
            address
          );

          if (component) await saveNewAdo(component);
        }
      }
    } catch (error) {
      const { message } = error as Error;
      if (!message.includes("Not an")) {
        throw new TransactionError(tx.hash, tx.height, message);
      }
    }
  }

  if (bulk.batches.length > 0) {
    bulk.execute();
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
export async function handleADOUpdateOwner(batch: readonly CleanedTx[]) {
  const bulk = createADOBulkOperation();
  for (let i = 0; i < batch.length; i++) {
    const tx = batch[i];

    const updates = getUpdateOwnerLogs(tx.rawLog);
    updates.forEach(({ contractAddress, newOwner }) => {
      bulk
        .find({
          $and: [
            { address: contractAddress },
            { lastUpdatedHeight: { $lt: tx.height } },
          ],
        })
        .update({ $set: { owner: newOwner, lastUpdatedHeight: tx.height } });
    });
  }

  if (bulk.batches.length > 0) {
    bulk.execute();
  }
}
