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
import { TransactionError } from "./errors";

async function start() {
  await dbConnect();
  const client = await connect();
  let maxHeight = 0;

  // Create batching classes
  const batchers = queries.map(
    ({ query, processor, label }) =>
      new Batcher(client, query, processor, label)
  );
  while (true) {
    // Make sure current height is up to date
    const currMaxHeight = await client.queryClient?.getHeight();
    if (currMaxHeight === maxHeight || !currMaxHeight) {
      await sleep(30000);
    } else {
      console.log(`Processing new blocks...`);
      maxHeight = currMaxHeight;
      for (let i = 0; i < batchers.length; i++) {
        const batcher = batchers[i];
        try {
          await batcher.start(maxHeight ?? 0);
        } catch (error) {
          Sentry.captureException(error);
        }
      }
    }
  }
}

interface ChainInfo {
  chainId: string;
  startHeight: number;
}

const CHAIN_INFO: ChainInfo[] = [
  { chainId: "uni-3", startHeight: 800000 },
  { chainId: "elgafar-1", startHeight: 500000 },
  { chainId: "galileo-2", startHeight: 0 },
];

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  CHAIN_INFO.forEach(({ chainId, startHeight }) =>
    cluster.fork({ CHAIN_ID: chainId, START_HEIGHT: startHeight })
  );

  cluster.on("exit", (worker, code, signal) => {
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
