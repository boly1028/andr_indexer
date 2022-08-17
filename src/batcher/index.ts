import AndromedaClient, { cleanTx } from "@andromedaprotocol/andromeda.js";
import type { SearchTxQuery } from "@cosmjs/stargate";
import { ProcessorFunc } from "../types";
import { sleep } from "../utils";

// How many transactions to fetch at a time
const BATCH_SIZE = process.env.BATCH_SIZE
  ? parseInt(process.env.BATCH_SIZE)
  : 2000;

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
  async getTxs(minHeight: number, maxHeight: number) {
    const resp = await this.client.queryClient?.searchTx(this.query, {
      minHeight,
      maxHeight,
    });

    return resp;
  }

  /**
   * Get all transactions within the next batch, defined by the current block height and the batch size
   * @param batchSize
   * @returns
   */
  async getNextBatch(batchSize: number = BATCH_SIZE) {
    console.info(
      `Fetching blocks ${this.currHeight}-${this.currHeight + batchSize}...`
    );
    const txs = await this.getTxs(this.currHeight, this.currHeight + batchSize);

    this.currHeight += batchSize + 1;
    if (!txs)
      throw new Error(
        `Could not fetch transactions between ${this.currHeight}-${
          this.currHeight + batchSize
        } on ${process.env.CHAIN_ID}`
      );
    return txs.map(cleanTx);
  }

  /**
   * Start fetching blocks up to the given block height and process them using the defined processor
   * @param toHeight
   * @returns
   */
  async start(toHeight: number) {
    if (toHeight <= this.currHeight) return;

    while (this.currHeight < toHeight) {
      const batchSize = Math.min(BATCH_SIZE, toHeight - this.currHeight);
      const batch = await this.getNextBatch(batchSize);
      console.info(
        `Processing blocks ${this.currHeight - batchSize}-${this.currHeight}`
      );
      await this.processor(batch);
      await sleep(1000);
    }
  }
}
