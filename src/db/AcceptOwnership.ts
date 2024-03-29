import mongoose, { Schema } from "mongoose";

export const acceptOwnership = new Schema({
  chainId: {
    type: String,
  },
  adoType: {
    type: String,
  },
  address: {
    type: String,
  },
  action: {
    type: String,
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
