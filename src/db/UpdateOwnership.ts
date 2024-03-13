import mongoose, { Schema } from "mongoose";

export const updateOwnership = new Schema({
  chainId: {
    type: String,
  },
  adoType: {
    type: String,
  },
  address: {
    type: String,
  },
  sender: {
    type: String,
    required: true,
  },
  newOwner: {
    type: String,
  },
  expiration: {
    at_height: {
      type: Number,
    },
    at_time: {
      type: Number,
    },
    never: {
      type: Object,
    }
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

export const UpdateOwnershipModel = mongoose.model("updateOwnership", updateOwnership);

export default UpdateOwnershipModel;
