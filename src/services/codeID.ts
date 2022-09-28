import { codeIDModel } from "../db";

export const createCodeIDBulkOp = () =>
  codeIDModel.collection.initializeOrderedBulkOp();

export const getCodeIDByType = async (adoType: string, chainId: string) =>
  await codeIDModel.findOne({ adoType, chainId });

export const newCodeId = async (
  adoType: string,
  codeId: number,
  txHash: string,
  blockHeight: number
) =>
  await codeIDModel.collection.insertOne({
    adoType,
    codeId,
    lastUpdatedHash: txHash,
    lastUpdatedHeight: blockHeight,
    chainId: process.env.CHAIN_ID ?? "uni-5",
  });

export const updateCodeId = async (
  adoType: string,
  newCodeId: number,
  txHash: string,
  blockHeight: number
) =>
  await codeIDModel.updateOne(
    { adoType, chainId: process.env.CHAIN_ID ?? "uni-5" },
    {
      $set: {
        codeId: newCodeId,
        lastUpdatedHash: txHash,
        lastUpdatedHeight: blockHeight,
      },
    }
  );
