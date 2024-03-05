import mongoose, { Schema } from "mongoose";

const indexingStatus = new Schema({
  chainId: {
    type: String,
    required: true,
  },
  indexingType: {
    type: String,
    required: true,
  },
  latestHeight: {
    type: Number,
    required: true,
  },
});

export const indexingStatusModel = mongoose.model("indexingStatus", indexingStatus);

export default indexingStatusModel;
