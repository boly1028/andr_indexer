import mongoose, { Schema } from "mongoose";

const acceptOwnership = new Schema({
  chainId: {
    type: String,
    required: true,
  },
  adoType: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  sender: {
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

export const AcceptOwnershipModel = mongoose.model("acceptOwnership", acceptOwnership);

export default AcceptOwnershipModel;
