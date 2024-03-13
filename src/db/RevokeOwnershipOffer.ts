import mongoose, { Schema } from "mongoose";

export const revokeOwnershipOffer = new Schema({
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

export const RevokeOwnershipOfferModel = mongoose.model("revokeOwnershipOffer", revokeOwnershipOffer);

export default RevokeOwnershipOfferModel;
