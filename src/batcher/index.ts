import { cleanTx } from "@andromedaprotocol/andromeda.js";
import { ChainClient } from "@andromedaprotocol/andromeda.js/dist/clients";
import type { SearchTxQuery, Attribute, Event } from "@cosmjs/stargate";
import { ProcessorFunc } from "../types";
import { indexingStatusModel } from "../db";
import { configDotenv } from "dotenv";
import { chain } from "lodash";
import { config } from "./../client";
import axios from "axios";
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
   * @description to use paginate indexing as indexing
   * @description it takes shorter time than getTxs(maxHeight, minHeight)
   */
  async getTxsPaginate(maxHeight: number, minHeight: number) {
    // const minHeight = this.currHeight;
    // const maxHeight = currChainHeight || Number.MAX_SAFE_INTEGER;
    const txs = [];
    let done: boolean = false;
    let txsPage: number = Number(process.env.TXS_PAGE);
    let perPage: number = Number(process.env.PER_PAGE);

    while (!done) {
      let query = '';
      if (typeof this.query === 'string') {
        query = this.query;
      } else {
        query = this.query.map(({ key, value }) => `${key}='${value}'`).join(' AND ')
      }

      let chainUrl: string = config!.chainUrl;
      if (chainUrl[chainUrl.length - 1] !== '/') {
        chainUrl = chainUrl.concat('/');
      }

      const url = `${chainUrl}tx_search?query="${query} AND tx.height>=${minHeight} AND tx.height<=${maxHeight}"&page=${txsPage}&per_page=${perPage}`;

      const dataTxs = await axios.get(url);
      txs.push(...(dataTxs?.data?.result?.txs ?? []));
      if (perPage * txsPage < dataTxs?.data?.result?.total_count) txsPage++;
      else done = true;
    }

    const resp = txs.map((tx: any) => {
      // console.log("TX: ", tx.tx);
      const wasm: {
        type: string;
        attributes: Attribute[];
      } = {
        type: "wasm",
        attributes: [],
      };

      const events = tx.tx_result.events.filter((ev: Event) => {
        if (ev.type === "wasm") {
          wasm.attributes.push(...ev.attributes);
          return false;
        } else {
          return true;
        }
      });

      if (wasm.attributes.length > 0) {
        events.push(wasm);
      };

      const injTx = {
        height: Number(tx.height),
        txIndex: Number(tx.index),
        hash: tx.hash,
        code: tx.tx_result.code,
        events: events,
        rawLog: JSON.stringify([
          {
            msg_index: tx.index,
            log: "",
            events: events,
          },
        ]),
        tx: new Uint8Array([]),
        gasUsed: tx.tx_result.gas_used,
        gasWanted: tx.tx_result.gas_wanted,
      };

      return injTx;
    });

    return resp;
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
    } else if (this.label == 'Update Code IDs') {
      indexingType = 'add_update_code_ID';
    } else if (this.label == 'Accept Ownership') {
      indexingType = 'accept_ownership';
    } else {
      indexingType = 'Revoke Ownership Offer';
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

    // const getTxsResp = await this.getTxsPaginate(maxHeight, minHeight);
    const getTxsResp = await this.getTxs(maxHeight, minHeight);

    const batch = (getTxsResp ?? []).map(cleanTx);
    console.log(
      `[${chainId} - ${this.label}] Total TX found: ${getTxsResp?.length}`
    );
    await this.processor(batch, chainId, maxHeight);
    this.currHeight = maxHeight;
    if(indexingType == "accept_ownership") this.currHeight = 0;
  }
}
