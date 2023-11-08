import AndromedaClient, { cleanTx } from "@andromedaprotocol/andromeda.js";
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
   * Get all Injective/Terra transactions between given heights using the query for the current batcher
   */
  async getChainTxs(currChainHeight: number | undefined) {
    const minHeight = this.currHeight;
    const maxHeight = currChainHeight || Number.MAX_SAFE_INTEGER;
    const txs = [];
    let done: boolean = false;
    let txsPage: number = 1;
    while (!done) {
      let query = ("tags" in this.query ? this.query.tags : [])
        .map((o) => o.key + "='" + o.value + "'")
        .join(" AND ");
      if (this.label === "Instantiations")
        query = "message.action='/cosmwasm.wasm.v1.MsgInstantiateContract'";

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
      const injTx: IndexedTx = {
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
  async getTxs() {
    const minHeight = this.currHeight;
    const resp = await this.client.chainClient!.queryClient?.searchTx(
      this.query,
      {
        minHeight,
      }
    );
    return resp;
  }

  /**
   * Start fetching blocks up to the given block height and process them using the defined processor
   * @returns
   */
  async start() {
    const currChainHeight =
      await this.client.chainClient!.queryClient?.getHeight();

    const chainId = process.env.CHAIN_ID ?? "uni-6";
    console.log(
      `[${chainId} - ${this.label}] Fetching transactions from height ${this.currHeight} to ${currChainHeight}`
    );
    const CHAINS_USING_FETCH = ['pisco-1','injective-888'];
    const getTxsResp =
      CHAINS_USING_FETCH.includes(chainId)
        ? await this.getChainTxs(currChainHeight)
        : await this.getTxs();
    const batch = (getTxsResp ?? []).map(cleanTx);
    await this.processor(batch);
    this.currHeight = currChainHeight ?? this.currHeight;
  }
}
