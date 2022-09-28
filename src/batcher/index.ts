import AndromedaClient, { cleanTx } from "@andromedaprotocol/andromeda.js";
import type { SearchTxQuery } from "@cosmjs/stargate";
import { ProcessorFunc } from "../types";
import _ from "lodash";

/**
 * A class used to fetch blocks in batches and process them using a given query and processing handler
 */
export default class Batcher {
  currHeight = parseInt(process.env.START_HEIGHT ?? "0");
  client: AndromedaClient;
  query: SearchTxQuery;
  processor: ProcessorFunc;
  label: string;

  constructor(
    client: AndromedaClient,
    query: SearchTxQuery,
    processor: ProcessorFunc,
    label: string
  ) {
    this.client = client;
    this.query = query;
    this.processor = processor;
    this.label = label;
  }

  /**
   * Get all transactions between given heights using the query for the current batcher
   */
  async getTxs() {
    const minHeight = this.currHeight;
    const resp = await this.client.queryClient?.searchTx(this.query, {
      minHeight,
    });
    return resp;
  }

  /**
   * Start fetching blocks up to the given block height and process them using the defined processor
   * @returns
   */
  async start() {
    const currChainHeight = await this.client.queryClient?.getHeight();
    console.log(
      `[${process.env.CHAIN_ID ?? "uni-5"} - ${
        this.label
      }] Fetching transactions from height ${
        this.currHeight
      } to ${currChainHeight}`
    );
    const batch = ((await this.getTxs()) ?? []).map(cleanTx);
    await this.processor(batch);
    this.currHeight = currChainHeight ?? this.currHeight;
  }
}
