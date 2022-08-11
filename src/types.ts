import type { SearchTxFilter, SearchTxQuery } from "@cosmjs/stargate";
import { CleanedTx } from "@andromedaprotocol/andromeda.js";

export type ProcessorFunc = (batch: readonly CleanedTx[]) => Promise<void>;

export interface BatchQuery {
  query: SearchTxQuery;
  filter?: SearchTxFilter;
  processor: ProcessorFunc;
  label: string;
}
