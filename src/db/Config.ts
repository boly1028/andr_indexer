import mongoose, { Schema } from "mongoose";

// THESE SCHEMA ARE NOT TYPED TIGHTLY AND ASSUME THAT DATA IS ALWAYS CORRECT
const SCHEMA = new Schema(
    {
        chainId: {
            type: String,
            required: true,
        },
        chainUrl: {
            type: String,
            required: true,
        },
        kernelAddress: {
            type: String,
            required: true,
        },
        addressPrefix: {
            type: String,
            required: true,
        },
        defaultFee: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        startHeight: {
            type: Number,
            required: true,
        },
        relay: {
            type: Boolean,
            required: true,
        },
    },
    { strict: false }
);

export const ConfigModel = mongoose.model("chainConfig", SCHEMA);

export const getAllChains = async () => {
    const chains = await ConfigModel.find({});
    return chains;
}