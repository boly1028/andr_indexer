import { handleADOInstantiate, handleADOUpdateOwner } from "./processors";
import { BatchQuery } from "./types";

const queries: BatchQuery[] = [
  {
    query: {
      tags: [
        {
          key: "message.action",
          value: "/cosmwasm.wasm.v1.MsgInstantiateContract",
        },
      ],
    },
    processor: handleADOInstantiate,
    label: "Instantiations",
  },
  {
    query: {
      tags: [
        {
          key: "wasm.action",
          value: "update_owner",
        },
      ],
    },
    processor: handleADOUpdateOwner,
    label: "Update Owner",
  },
];

export default queries;
