import cluster from "node:cluster";
import process from "node:process";
import Batcher from "./batcher";
import { connect } from "./client";
import dbConnect from "./db";
import queries from "./queries";
import { sleep } from "./utils";
import http from "http";
import https from "https";

require("./sentry");
import * as Sentry from "@sentry/node";

async function start() {
  await dbConnect();
  const client = await connect();

  // Create batching classes
  const batchers = [];
  for (let i = 0; i < queries.length; i++) {
    const { query, processor, label } = queries[i];
    const queryObj = await query();
    batchers.push(new Batcher(client, queryObj, processor, label));
  }

  while (true) {
    // Make sure current height is up to date
    for (let i = 0; i < batchers.length; i++) {
      const batcher = batchers[i];
      try {
        await batcher.start();
        await sleep(10000);
      } catch (error) {
        console.error(error);
        Sentry.captureException(error);
      }
    }
  }
}

interface ChainInfo {
  chainId: string;
  startHeight: number;
}

const CHAIN_INFO: ChainInfo[] = [
  { chainId: "uni-5", startHeight: 0 },
  { chainId: "elgafar-1", startHeight: 500000 },
  { chainId: "galileo-2", startHeight: 0 },
  { chainId: "pisco-1", startHeight: 0 },
];

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  CHAIN_INFO.forEach(({ chainId, startHeight }) =>
    cluster.fork({ CHAIN_ID: chainId, START_HEIGHT: startHeight })
  );

  cluster.on("exit", (worker) => {
    console.log(`worker ${worker.process.pid} died`);
  });

  (process.env.SECURE ? https : http)
    .createServer((req, res) => {
      res.writeHead(200);
      res.end("Hello from the indexer!");
    })
    .listen(process.env.PORT ?? 8000, () => {
      console.log(`Primary worker listening on ${process.env.PORT ?? 8000}`);
    });
} else {
  console.log(`Worker ${process.pid}-${process.env.CHAIN_ID} started`);
  start();
}
