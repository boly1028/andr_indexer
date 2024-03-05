import { config } from "./client";
import {
  handleADOInstantiate,
  handleADOUpdateOwner,
  handleCodeIDLog,
} from "./processors";
import createClient from "@andromedaprotocol/andromeda.js/dist/clients";
import { BatchQuery } from "./types";
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
      );
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
        ]
    },
    processor: handleCodeIDLog,
    label: "Update Code IDs",
  },
];

export default queries;
