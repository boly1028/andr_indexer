import { CleanedTx, getAttribute } from "@andromedaprotocol/andromeda.js";
import { connect } from "../client";
import { Log } from "@cosmjs/stargate/build/logs";
import {
  getAcceptOwnershipByAddress,
  getRevokeOwnershipOfferByAddress,
  newAcceptOwnership,
  updateAcceptOwnership,
  updateRevokeOwnershipOffer,
  newRevokeOwnershipOffer,
  updateAdoAcceptOwnership,
  updateAdoRevokeOwnershipOffer,
  updateAdoOwner,
} from "../services";
import { createOrUpdateIndexingStatus } from ".";
import { configDotenv } from "dotenv";
import { adoModel, UpdateOwnershipModel } from "../db";
configDotenv();

export async function getUpdateOwnershipInfo(logs: readonly Log[]) {
  const [contractAddress] = getAttribute("execute._contract_address", logs);
  if (!contractAddress) return;

  const ado = await adoModel.findOne({ address: contractAddress.value });
  if (!ado) return;

  const adoType = ado?.adoType;
  if (!adoType) return;

  const [sender] = getAttribute("message.sender", logs);
  if (!sender) return;

  const [newOwner] = getAttribute("wasm.value", logs);
  if (!newOwner) return;

  return {
    adoType: adoType,
    address: contractAddress.value,
    sender: sender.value,
    newOwner: newOwner.value,
  };
}

export async function getAcceptOwnershipInfo(logs: readonly Log[]) {
  const [contractAddress] = getAttribute("execute._contract_address", logs);
  if (!contractAddress) return;

  const ado = await adoModel.findOne({ address: contractAddress.value });
  if (!ado) return;

  const adoType = ado?.adoType;
  if (!adoType) return;

  const [sender] = getAttribute("message.sender", logs);
  if (!sender) return;

  const [action] = getAttribute("wasm.action", logs);
  if (!action) return;

  return {
    adoType: adoType,
    address: contractAddress.value,
    action: action.value,
    sender: sender.value,
  };
}

export async function handleAcceptOwnership(batch: readonly CleanedTx[], chainId: string, maxHeight: number) {
  const currentChainHeight = maxHeight;
  for (let i = 0; i < batch.length; i++) {
    console.log("height: ", maxHeight);
    const tx = batch[i];
    const indexingType = 'accept_ownership';
    const acceptOwnershipInfo = await getAcceptOwnershipInfo(tx.rawLog);
    if (!acceptOwnershipInfo) continue;

    const { adoType, address, action, sender } = acceptOwnershipInfo;
    const chainId = process.env.CHAIN_ID ?? "uni-6";

    const savedAcceptOwnership = await getAcceptOwnershipByAddress(chainId, address);

    if (savedAcceptOwnership) {
      if (savedAcceptOwnership.toJSON().lastUpdatedHeight < tx.height) {
        await updateAcceptOwnership(address, sender, tx.hash, tx.height);
        await updateAdoAcceptOwnership(address, sender, tx.hash, tx.height);
      }
    } else {
      await newAcceptOwnership(adoType, address, action, sender, tx.height, tx.hash);
      await updateAdoAcceptOwnership(address, sender, tx.hash, tx.height);
    }
    
    const savedUpdateOwnership = await UpdateOwnershipModel.findOne({ address, newOwner: sender });

    if (savedUpdateOwnership && savedUpdateOwnership.newOwner == sender) {
      if (tx.height > savedUpdateOwnership.lastUpdatedHeight) {
        const expiration: any = savedUpdateOwnership.expiration;
        const newOwner = savedUpdateOwnership?.newOwner;

        const keys = Object.keys(expiration);
        let expirationKey;
        let expirationValue: any = undefined;

        keys.find(key => {
          expirationValue = expiration[key];
          if (expirationValue !== undefined) {
            expirationKey = key;
            return true; // exits the loop
          }
          return false; // continue the loop
        });

        // console.log("expirationKey: ", expirationKey);
        // console.log("expirationValue: ", expirationValue);

        if (!expirationKey) {
          await updateAdoOwner({
            address: address,
            newOwner,
            txHeight: tx.height,
            txHash: tx.hash,
          }); 
          // console.log("*****");
        } else if (expirationKey == "at_height") {
          if(currentChainHeight > expirationValue) 
            await updateAdoOwner({
              address: address,
              newOwner,
              txHeight: tx.height,
              txHash: tx.hash,
            }); 
        } else if (expirationKey == "at_time") {
          
        }
      }
    }
    // await createOrUpdateIndexingStatus(chainId, indexingType, tx.height);
  }
}

export async function getRevokeOwnershipOfferInfo(logs: readonly Log[]) {
  const [contractAddress] = getAttribute("execute._contract_address", logs);
  if (!contractAddress) return;

  const ado = await adoModel.findOne({ address: contractAddress.value });
  if (!ado) return;

  const adoType = ado?.adoType;
  if (!adoType) return;

  const [sender] = getAttribute("message.sender", logs);
  if (!sender) return;

  const [action] = getAttribute("wasm.action", logs);
  if (!action) return;

  return {
    adoType: adoType,
    address: contractAddress.value,
    action: action.value,
    sender: sender.value,
  };
}

export async function handleRevokeOwnershipOffer(batch: readonly CleanedTx[]) {
  for (let i = 0; i < batch.length; i++) {
    const tx = batch[i];
    const indexingType = 'revoke_ownership_offer';
    const revokeOwnershipOfferInfo = await getRevokeOwnershipOfferInfo(tx.rawLog);
    if (!revokeOwnershipOfferInfo) continue;

    const { adoType, address, action, sender } = revokeOwnershipOfferInfo;
    const chainId = process.env.CHAIN_ID ?? "uni-6";
    const savedRevokeOwnershipOffer = await getRevokeOwnershipOfferByAddress(chainId, address);
    if (savedRevokeOwnershipOffer) {
      if (savedRevokeOwnershipOffer.toJSON().lastUpdatedHeight < tx.height) {
        await updateRevokeOwnershipOffer(address, sender, tx.hash, tx.height);
        await updateAdoRevokeOwnershipOffer(address, sender, tx.hash, tx.height);
      }
    } else {
      await newRevokeOwnershipOffer(adoType, address, action, sender, tx.height, tx.hash);
      await updateAdoRevokeOwnershipOffer(address, sender, tx.hash, tx.height);
    }

    const savedUpdateOwnership = await UpdateOwnershipModel.findOne({ address, sender });

    if (savedUpdateOwnership && savedUpdateOwnership.sender == sender) {
      if (tx.height > savedUpdateOwnership.lastUpdatedHeight) {
        const elementToDelete = await UpdateOwnershipModel.findOneAndDelete({ address, sender });
        // console.log("address: ", address);
        // console.log("elementToDelete: ", elementToDelete);
      }
    }
    
    await createOrUpdateIndexingStatus(chainId, indexingType, tx.height);
  }
}
