import {
  handleADOInstantiate,
  handleADOUpdateOwner,
  handleCodeIDLog,
} from "./processors";
import { BatchQuery } from "./types";
import AndromedaClient, {
  getConfigByChainID,
} from "@andromedaprotocol/andromeda.js";

const client = new AndromedaClient();
const config = getConfigByChainID(process.env.CHAIN_ID ?? "uni-3");

/**
 * All of the queries to be run across each chain
 */
const queries: BatchQuery[] = [
  {
    query: () => ({
      tags: [
        {
          key: "message.action",
          value: "/cosmwasm.wasm.v1.MsgInstantiateContract",
        },
        {
          key: "wasm.method",
          value: "instantiate",
        },
      ],
    }),
    processor: handleADOInstantiate,
    label: "Instantiations",
  },
  {
    query: () => ({
      tags: [
        {
          key: "wasm.action",
          value: "update_owner",
        },
      ],
    }),
    processor: handleADOUpdateOwner,
    label: "Update Owner",
  },
  {
    query: async () => {
      await client.connect(config!.chainUrl, config!.registryAddress);
      const factoryAddress = client.ado.factory.address;

      if (!factoryAddress || factoryAddress.length === 0)
        throw new Error(
          `Could not get Factory address for ${process.env.CHAIN_ID ?? "uni-3"}`
        );
      return config!.chainId === "elgafar-1"
        ? {
            tags: [
              {
                key: "wasm.action",
                value: "add_update_code_id",
              },
            ],
          }
        : {
            tags: [
              {
                key: "wasm.action",
                value: "add_update_code_id",
              },
              {
                key: "execute._contract_address",
                value: factoryAddress,
              },
            ],
          };
    },
    processor: handleCodeIDLog,
    label: "Update Code IDs",
  },
];

export default queries;
