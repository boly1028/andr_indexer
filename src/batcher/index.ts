import AndromedaClient, { cleanTx } from "@andromedaprotocol/andromeda.js";
import type { SearchTxQuery } from "@cosmjs/stargate";
import { ProcessorFunc } from "../types";
import { sleep } from "../utils";
import { SingleBar, Presets } from "cli-progress";

const BATCH_SIZE = process.env.BATCH_SIZE
  ? parseInt(process.env.BATCH_SIZE)
  : 2000;

export default class Batcher {
  currHeight = 800000;
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

  async getBlock(height: number) {
    return this.client.queryClient?.searchTx({ height });
  }

  async getTxs(minHeight: number, maxHeight: number) {
    const resp = await this.client.queryClient?.searchTx(this.query, {
      minHeight,
      maxHeight,
    });

    return resp;
  }

  async getNextBatch(batchSize: number = BATCH_SIZE) {
    const txs = await this.getTxs(this.currHeight, this.currHeight + batchSize);

    this.currHeight += batchSize + 1;
    return (txs ?? []).map(cleanTx);
  }

  async start(toHeight: number) {
    if (toHeight <= this.currHeight) return;

    const prog = new SingleBar(
      {
        format: `${this.label} | {bar} | Batch: {value}/{total} | Height: {currHeight}/{toHeight}`,
      },
      Presets.rect
    );
    prog.start(Math.ceil((toHeight - this.currHeight) / BATCH_SIZE), 0, {
      toHeight,
      currHeight: this.currHeight,
    });
    while (this.currHeight < toHeight) {
      const batch = await this.getNextBatch(
        Math.min(BATCH_SIZE, toHeight - this.currHeight)
      );
      await this.processor(batch);
      prog.increment(1, { currHeight: Math.min(this.currHeight, toHeight) });
      await sleep(1000);
    }
    prog.stop();
  }
}
