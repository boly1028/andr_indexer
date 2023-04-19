import { adoModel } from "../db";

export const createADOBulkOperation = () =>
  adoModel.collection.initializeOrderedBulkOp();

export const getADOByAddress = (address: string) => {
  return adoModel.findOne({ address });
};

export const saveNewAdo = async (ado: any) => await adoModel.insertMany([ado]);

export const updateAdo = async (address: string, minter: string) => await adoModel.findOneAndUpdate({ address }, { minter });
