import { adoModel } from "../db";

export const createADOBulkOperation = () =>
  adoModel.collection.initializeOrderedBulkOp();

export const getADOByAddress = (address: string) => {
  return adoModel.findOne({ address });
};

export const saveNewAdo = async (ado: any) => await adoModel.insertMany([ado]);
