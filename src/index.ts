import * as Sentry from "@sentry/node";
import cluster from "node:cluster";
import process from "node:process";
import Batcher from "./batcher";
import { connect } from "./client";
import dbConnect from "./db";
import queries from "./queries";
import { sleep } from "./utils";
import express from "express";
import { createServer } from "http";

require("./sentry");

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
  { chainId: "uni-6", startHeight: 0 },
  { chainId: "elgafar-1", startHeight: 0 },
  { chainId: "galileo-3", startHeight: 0 },
  { chainId: "pisco-1", startHeight: 0 },
  { chainId: "constantine-3", startHeight: 0 },
  { chainId: "injective-888", startHeight: 0 },
];

const port = process.env.PORT || 4000;
const gqlURL = process.env.GQL_URL || "http://0.0.0.0:8085/graphql";

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  const app = express();
  const router = express.Router();
  router.use((req, res, next) => {
    res.header("Access-Control-Allow-Methods", "GET");
    next();
  });
  router.get("/health", (req, res) => {
    res.status(200).send("Ok");
  });
  app.use("/api/v1/", router);

  const server = createServer(app);
  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  CHAIN_INFO.forEach(({ chainId, startHeight }) => {
    cluster.fork({
      CHAIN_ID: chainId,
      START_HEIGHT: startHeight,
      GQL_URL: gqlURL,
    });
  });

  cluster.on("exit", (worker) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  console.log(`Worker ${process.pid}-${process.env.CHAIN_ID} started`);
  start();
}
