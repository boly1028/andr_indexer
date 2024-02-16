import AndromedaClient, { cleanTx } from "@andromedaprotocol/andromeda.js";
import { ChainClient } from "@andromedaprotocol/andromeda.js/dist/clients";
import type {
  Attribute,
  Event,
  IndexedTx,
  SearchTxQuery,
} from "@cosmjs/stargate";
import { ProcessorFunc } from "../types";
import _ from "lodash";
import axios from "axios";
import { config } from "./../client";
import { configDotenv } from "dotenv";
configDotenv();

/**
 * A class used to fetch blocks in batches and process them using a given query and processing handler
 */
export default class Batcher {
  // client: AndromedaClient;
  client: ChainClient;
  query: SearchTxQuery;
  processor: ProcessorFunc;
  label: string;

  chainId = process.env.CHAIN_ID ?? "uni-6";
  currHeight = parseInt(process.env.START_HEIGHT ?? "0");

  constructor(
    // client: AndromedaClient,
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

  // /**
  //  * Get all Injective/Terra transactions between given heights using the query for the current batcher
  //  */
  async getChainTxs(currChainHeight: number | undefined) {
    const minHeight = this.currHeight;
    const maxHeight = currChainHeight || Number.MAX_SAFE_INTEGER;
    const txs = [];
    let done: boolean = false;
    let txsPage: number = 1;
    while (!done) {
      let query = ''
      if (typeof this.query === 'string') {
        query = this.query;
      } else {
        query = this.query.map(({ key, value }) => `${key}='${value}'`).join(' AND ')
      }
      if (this.label === "Instantiations") {
        query = "message.action='/cosmwasm.wasm.v1.MsgInstantiateContract'";
      }

      if (this.label === "Update Owner") {
        query = "message.action='/cosmwasm.wasm.v1.MsgUpdateContractOwner'";
      }

      const url = `${
        config!.chainUrl
      }tx_search?query="${query} AND tx.height>=${minHeight} AND tx.height<=${maxHeight}"&page=${txsPage}&per_page=100`;

      const dataTxs = await axios.get(url);
      txs.push(...(dataTxs?.data?.result?.txs ?? []));
      if (100 * txsPage < dataTxs?.data?.result?.total_count) txsPage++;
      else done = true;
    }
    const resp = txs.map((tx: any) => {
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
      if (wasm.attributes.length > 0) events.push(wasm);
      const injTx = {
        code: tx.tx_result.code,
        gasUsed: tx.tx_result.gas_used,
        gasWanted: tx.tx_result.gas_wanted,
        hash: tx.hash,
        height: Number(tx.height),
        events: events,
        rawLog: JSON.stringify([
          {
            msg_index: tx.index,
            log: "",
            events: events,
          },
        ]),
        tx: new Uint8Array([]),
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

    // const resp = await this.client.chainClient!.queryClient?.searchTx(
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
    const minHeight = this.currHeight;
    // const maxHeight = await this.client.chainClient?.queryClient?.getHeight() ?? 0;
    const maxHeight = await this.client.queryClient?.getHeight() ?? 0;


    const chainId = process.env.CHAIN_ID ?? "uni-6";
    console.log(
      `[${chainId} - ${this.label}] Fetching transactions from height ${minHeight} to ${maxHeight}`
    );

    const CHAINS_USING_FETCH = ['pisco-1','injective-888'];
    const getTxsResp =
      CHAINS_USING_FETCH.includes(chainId)
         ? await this.getChainTxs(maxHeight)
         : await this.getTxs(maxHeight, minHeight);

    // const getTxsResp = await this.getTxs(maxHeight, minHeight);
    // const getTxsResp = await this.getTxs();

    const batch = (getTxsResp ?? []).map(cleanTx);
    console.log(
      `[${chainId} - ${this.label}] Total TX found: ${getTxsResp?.length}`
    );
    await this.processor(batch);
    this.currHeight = maxHeight;
  }
}
