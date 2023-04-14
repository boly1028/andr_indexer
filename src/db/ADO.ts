import mongoose, { Schema } from "mongoose";

const ADO = new Schema({
  adoType: {
    type: String,
    required: true,
  },
  instantiateHeight: {
    type: Number,
    required: true,
  },
  instantiateHash: {
    type: String,
    required: true,
  },
  lastUpdatedHash: {
    type: String,
    required: true,
  },
  owner: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
    unique: true,
  },
  lastUpdatedHeight: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
  },
  appContract: {
    type: String,
  },
  chainId: {
    type: String,
    required: true,
  },
  minter: {
    type: String,
  }
});

export const adoModel = mongoose.model("ADO", ADO);

export default adoModel;
