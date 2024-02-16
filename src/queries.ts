import { config } from "./client";
import {
  handleADOInstantiate,
  handleADOUpdateOwner,
  handleCodeIDLog,
} from "./processors";
import createClient from "@andromedaprotocol/andromeda.js/dist/clients";
import { BatchQuery } from "./types";
import { configDotenv } from "dotenv";
configDotenv();
/**
 * All of the queries to be run across each chain
 */
const queries: BatchQuery[] = [
  {
    query: () => ([
        {
          key: "message.action",
          value: "/cosmwasm.wasm.v1.MsgInstantiateContract",
        },
        {
          key: "wasm.method",
          value: "instantiate",
        },
    ]),
    processor: handleADOInstantiate,
    label: "Instantiations",
  },
  {
    query: () => ([
        {
          key: "wasm.action",
          value: "update_owner",
        },
    ]),
    processor: handleADOUpdateOwner,
    label: "Update Owner",
  },
  {
    query: async () => {
      const client = createClient(config.addressPrefix);
      await client.connect(
        config!.chainUrl,
        // config!.kernelAddress,
        // config!.addressPrefix
      );
      // const factoryAddress = client.os.adoDB!.address;
      // console.log("factoryAddress: ", factoryAddress);

      // if (!factoryAddress || factoryAddress.length === 0)
      //   throw new Error(
      //     `Could not get Factory address for ${process.env.CHAIN_ID ?? "uni-5"}`
      //   );
      return config!.chainId === "elgafar-1"
        ? [
          {
            key: "wasm.action",
            value: "add_update_code_id",
          },
        ]
        : [
          {
            key: "wasm.action",
            value: "add_update_code_id",
          },
          // {
          //   key: "execute._contract_address",
          //   value: factoryAddress,
          // },
        ]
    },
    processor: handleCodeIDLog,
    label: "Update Code IDs",
  },
];

export default queries;
