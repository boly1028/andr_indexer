import { cleanTx } from "@andromedaprotocol/andromeda.js";
import { ChainClient } from "@andromedaprotocol/andromeda.js/dist/clients";
import type {
  SearchTxQuery,
} from "@cosmjs/stargate";
import { ProcessorFunc } from "../types";
import { indexingStatusModel } from "../db";
import { configDotenv } from "dotenv";
import { chain } from "lodash";
configDotenv();

/**
 * A class used to fetch blocks in batches and process them using a given query and processing handler
 */
export default class Batcher {
  client: ChainClient;
  query: SearchTxQuery;
  processor: ProcessorFunc;
  label: string;

  chainId = process.env.CHAIN_ID ?? "uni-6";
  currHeight = parseInt(process.env.START_HEIGHT ?? "0");

  constructor(
    client: ChainClient,
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
  async getTxs(maxHeight: number, minHeight = 0) {
    let query = ''
    if (typeof this.query === 'string') {
      query = this.query;
    } else {
      query = this.query.map(({ key, value }) => `${key}='${value}'`).join(' AND ')
    }
    if (!query.match(/tx.height[>]?=/g))
      query = query.concat(' AND ', `tx.height>=${minHeight}`);
    if (!query.match(/tx.height[<]?=/g))
      query = query.concat(' AND ', `tx.height<=${maxHeight}`);

    const resp = await this.client.queryClient?.searchTx(
      query
    );
    return resp;
  }

  /**
   * Start fetching blocks up to the given block height and process them using the defined processor
   * @returns
   */
  async start() {
    const chainId = this.chainId;
    let indexingType: string;
    if (this.label == 'Instantiations') {
      indexingType = 'instantiations';
    } else if (this.label == 'Update Owner') {
      indexingType = 'update_owner';
    } else {
      indexingType = 'add_update_code_ID';
    }

    let minHeight: number;
    let maxHeight = await this.client.queryClient?.getHeight() ?? 0;

    const indexingStatus = await indexingStatusModel.findOne({ chainId: chainId, indexingType: indexingType });
    
    if (indexingStatus) {
      minHeight = indexingStatus?.latestHeight + 1;
    } else {
      minHeight = this.currHeight;
    }

    console.log(
      `[${chainId} - ${this.label}] Fetching transactions from height ${minHeight} to ${maxHeight}`
    );

    const getTxsResp = await this.getTxs(maxHeight, minHeight);

    const batch = (getTxsResp ?? []).map(cleanTx);
    console.log(
      `[${chainId} - ${this.label}] Total TX found: ${getTxsResp?.length}`
    );
    await this.processor(batch, chainId);
    this.currHeight = maxHeight;
  }
}
