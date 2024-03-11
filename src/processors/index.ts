import { indexingStatusModel } from "../db";

async function modelExisted(chainId: string, indexingType: string): Promise<boolean> {
  const model = await indexingStatusModel.findOne({ chainId: chainId, indexingType: indexingType });
  if (model) {
    return true;
  } else {
    return false;
  }
}

export async function createOrUpdateIndexingStatus(chainId: string, indexingType: string, height: number) {
  const statusModelExisted: boolean = await modelExisted(chainId, indexingType);
  if (statusModelExisted === false) {
    const indexingStatus = new indexingStatusModel({
      chainId: chainId,
      indexingType: indexingType,
      latestHeight: height,
    });
    await indexingStatus.save();
  } else {
    await indexingStatusModel.findOneAndUpdate(
      { chainId: chainId, indexingType: indexingType },
      { $set: {latestHeight: height} }
    )
  }
}

export * from "./ADOs";
export * from "./codeID";
export * from "./ownership";
