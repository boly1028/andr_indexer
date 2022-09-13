import mongoose, { Schema } from "mongoose";

const codeID = new Schema({
  adoType: {
    type: String,
    required: true,
  },
  codeId: {
    type: Number,
    required: true,
  },
  chainId: {
    type: String,
    required: true,
  },
  lastUpdatedHeight: {
    type: Number,
    required: true,
  },
  lastUpdatedHash: {
    type: String,
    required: true,
  },
});

codeID.index({ adoType: 1, chainId: 1 }, { unique: true });

export const codeIDModel = mongoose.model("codeID", codeID);

export default codeIDModel;
