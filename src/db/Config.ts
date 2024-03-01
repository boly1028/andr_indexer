import mongoose, { Schema } from "mongoose";

const IconUrl = {
    sm: {
        type: String,
        rquired: true
    },
    lg: {
        type: String,
        rquired: true
    },
}

// THESE SCHEMA ARE NOT TYPED TIGHTLY AND ASSUME THAT DATA IS ALWAYS CORRECT
const SCHEMA = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        chainName: {
            type: String,
            required: true,
        },
        chainId: {
            type: String,
            required: true,
        },
        chainUrl: {
            type: String,
            required: true,
        },
        registryAddress: {
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
        blockExplorerTxPages: {
            type: [String],
            required: true,
        },
        blockExplorerAddressPages: {
            type: [String],
            required: true,
        },
        chainType: {
            type: String,
            required: true,
        },
        iconUrls: {
            type: IconUrl,
            required: true,
        },
        kernelAddress: {
            type: String,
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