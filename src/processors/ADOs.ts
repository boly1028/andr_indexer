import { CleanedTx, getAdoType } from "@andromedaprotocol/andromeda.js";
import { getAttribute } from "@andromedaprotocol/andromeda.js";
import { Attribute, Log, Event } from "@cosmjs/stargate/build/logs";
import mongoose, { Model } from "mongoose";

async function findADOByContractAddress(
  address: string,
  model: Model<any, any>
) {
  return model.findOne({ address });
}

function splitAttributesByKey(key: string, event: Event): Attribute[][] {
  const splitIndices: number[] = [];
  const attributeSlices: Attribute[][] = [];
  event.attributes.forEach(({ key: attrKey }, idx) => {
    if (attrKey === key) splitIndices.push(idx);
  });

  splitIndices.forEach((idx, i) => {
    const nextIdx =
      i === splitIndices.length ? splitIndices.length - 1 : splitIndices[i + 1];
    const attrs = event.attributes.slice(idx, nextIdx);
    attributeSlices.push(attrs);
  });
  return attributeSlices;
}

function getADOAppInstantiations(logs: readonly Log[], appAddress: string) {
  const ADOs: { address: string; adoType: string; owner: string }[] = [];
  console.log(logs);
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const wasm = log.events.find((ev) => ev.type === "wasm");
    if (!wasm) continue;

    const attrSlices = splitAttributesByKey("_contract_address", wasm);
    attrSlices.forEach((attrs) => {
      const addressAttr = attrs.find(
        (attr) => attr.key === "_contract_address"
      );
      if (!addressAttr) return;
      const adoTypeAttr = attrs.find((attr) => attr.key === "type");
      if (!adoTypeAttr) return;
      if (
        ADOs.some((ado) => ado.address === addressAttr.value) ||
        addressAttr.value === appAddress
      )
        return;
      ADOs.push({
        address: addressAttr.value,
        adoType: adoTypeAttr.value,
        owner: appAddress,
      });
    });
  }

  return ADOs;
}

async function newADO(
  owner: string,
  address: string,
  adoType: string,
  height: number,
  hash: string,
  model: Model<any, any>,
  appContract?: string
) {
  // Check ADO hasn't been added already
  const savedADO = await findADOByContractAddress(address, model);
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
    chainId: process.env.CHAIN_ID ?? "uni-3",
  };
}

function getInstantiateInfo(logs: readonly Log[]): {
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
    owner: ownerAttr ? ownerAttr.value : senderAttr.value,
    adoType,
  };
}

export async function handleADOInstantiate(batch: readonly CleanedTx[]) {
  if (batch.length === 0) return;

  const ADOModel = mongoose.model("ADO");

  const bulk = ADOModel.collection.initializeOrderedBulkOp();
  for (let i = 0; i < batch.length; i++) {
    const tx = batch[i];

    try {
      const { address, adoType, owner } = getInstantiateInfo(tx.rawLog);
      const adoToAdd = await newADO(
        owner,
        address,
        adoType,
        tx.height,
        tx.hash,
        ADOModel
      );
      console.log(adoToAdd);
      if (adoToAdd) bulk.insert(adoToAdd);

      if (adoType === "app") {
        const ADOs = getADOAppInstantiations(tx.rawLog, address);
        for (let j = 0; j < ADOs.length; j++) {
          const ado = ADOs[j];
          const adoToAdd = await newADO(
            ado.owner,
            ado.address,
            ado.adoType,
            tx.height,
            tx.hash,
            ADOModel,
            address
          );
          if (adoToAdd) bulk.insert(adoToAdd);
        }
      }
    } catch (error) {}
  }

  if (bulk.batches.length > 0) {
    bulk.execute();
  }
}

function getUpdateOwnerLogs(logs: readonly Log[]) {
  const updates: { contractAddress: string; newOwner: string }[] = [];
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const wasm = log.events.find((ev) => ev.type === "wasm");
    if (!wasm) continue;
    const attrSlices = splitAttributesByKey("_contract_address", wasm);
    attrSlices.forEach((attrs) => {
      const contractAddrAttr = attrs.find(
        (attr) => attr.key === "_contract_address"
      );
      if (!contractAddrAttr) return;

      const actionIdx = attrs.findIndex(
        ({ key, value }) => key === "action" && value === "update_owner"
      );

      if (typeof actionIdx !== "undefined" && actionIdx >= 0) {
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

export async function handleADOUpdateOwner(batch: readonly CleanedTx[]) {
  if (batch.length === 0) return;

  const ADOModel = mongoose.model("ADO");

  const bulk = ADOModel.collection.initializeOrderedBulkOp();
  for (let i = 0; i < batch.length; i++) {
    const tx = batch[i];
    // const { contract } = tx.tx.body.messages;
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
