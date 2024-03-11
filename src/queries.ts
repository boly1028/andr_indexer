import { config } from "./client";
import {
  handleADOInstantiate,
  handleADOUpdateOwner,
  handleCodeIDLog,
  handleAcceptOwnership,
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
    query: () => ([
      {
        key: "wasm.action",
        value: "add_update_code_id",
      },
    ]),
    processor: handleCodeIDLog,
    label: "Update Code IDs",
  },
  {
    query: () => ([
      {
        key: "wasm.action",
        value: "accept_ownership",
      },
    ]),
    processor: handleAcceptOwnership,
    label: "Accept Ownership",
  },
];

export default queries;
