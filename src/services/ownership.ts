import { AcceptOwnershipModel, RevokeOwnershipOfferModel } from "../db";
import { configDotenv } from "dotenv";
configDotenv();

export const getAcceptOwnershipByAddress = async (
  chainId: string,
  address: string
) => await AcceptOwnershipModel.findOne({ chainId, address });

export const newAcceptOwnership = async (
  adoType: string,
  address: string,
  action: string,
  sender: string,
  txHeight: number,
  txHash: string
) => await AcceptOwnershipModel.collection.insertOne({
  chainId: process.env.CHAIN_ID ?? "uni-6",
  adoType,
  address,
  action,
  sender,
  lastUpdatedHeight: txHeight,
  lastUpdatedHash: txHash
});

export const updateAcceptOwnership = async(
  address: string,
  newSender: string,
  txHash: string,
  txHeight: number
) => await AcceptOwnershipModel.updateOne(
  { address, chainId: process.env.CHAIN_ID ?? "uni-6" },
  {
    $set: {
      sender: newSender,
      lastUpdatedHash: txHash,
      lastUpdatedHeight: txHeight,
    },
  }
);

export const getRevokeOwnershipOfferByAddress = async (
  chainId: string,
  address: string
) => await RevokeOwnershipOfferModel.findOne({ chainId, address });

export const newRevokeOwnershipOffer = async (
  adoType: string,
  address: string,
  action: string,
  sender: string,
  txHeight: number,
  txHash: string
) => await RevokeOwnershipOfferModel.collection.insertOne({
  chainId: process.env.CHAIN_ID ?? "uni-6",
  adoType,
  address,
  action,
  sender,
  lastUpdatedHeight: txHeight,
  lastUpdatedHash: txHash
});

export const updateRevokeOwnershipOffer = async(
  address: string,
  newSender: string,
  txHash: string,
  txHeight: number
) => await RevokeOwnershipOfferModel.updateOne(
  { address, chainId: process.env.CHAIN_ID ?? "uni-6" },
  {
    $set: {
      sender: newSender,
      lastUpdatedHash: txHash,
      lastUpdatedHeight: txHeight,
    },
  }
);