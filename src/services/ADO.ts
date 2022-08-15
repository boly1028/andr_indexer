import { adoModel } from "../db";

export const createADOBulkOperation = () =>
  adoModel.collection.initializeOrderedBulkOp();

export const getADOByAddress = (address: string) => {
  return adoModel.findOne({ address });
};
