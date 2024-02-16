import type { SearchTxQuery } from "@cosmjs/stargate";
import { CleanedTx } from "@andromedaprotocol/andromeda.js";

export type ProcessorFunc = (batch: readonly CleanedTx[]) => Promise<void>;

export interface BatchQuery {
  query: () => Promise<SearchTxQuery> | SearchTxQuery;
  setup?: () => Promise<void> | void;
  processor: ProcessorFunc;
  label: string;
}
