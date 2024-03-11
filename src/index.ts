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
import { indexingStatusModel } from "./db";
import { configDotenv } from "dotenv";
configDotenv();

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
}

const CHAIN_INFO: ChainInfo[] = [
  // { chainId: "uni-6" },
  { chainId: "elgafar-1" },
  // { chainId: "galileo-3" },
  // { chainId: "pisco-1" },
  // { chainId: "constantine-3" },
  // { chainId: "injective-888" },
];

const port = process.env.PORT || 4000;
const gqlURL = process.env.GQL_URL || "http://0.0.0.0:8085/graphql";

const main = async () => {
  await dbConnect();

  await indexingStatusModel.collection.drop();
  console.log("all collections are dropped.");

  if (cluster.isPrimary) {
    console.log("gqlURL: ", gqlURL);
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

    // Map from worker id to chainId
    const CLUSTERS: Record<string, string> = {};
    cluster.on("exit", (worker) => {
      console.log(`WORKER ${CLUSTERS[worker.id]} ${worker.process.pid} died`);
      delete CLUSTERS[worker.id];
    });

    // Keep on spinning new clusters for new chain or died clusters
    while (true) {
      console.log("Refreshing Chains");
      const EXISTING_CLUSTERS = new Set(Object.values(CLUSTERS));
      console.log("Existing Chains - ", EXISTING_CLUSTERS);
      const CHAINS = CHAIN_INFO;

      CHAINS.forEach(({ chainId }) => {
        // Do not create cluster for existing chain
        if (EXISTING_CLUSTERS.has(chainId)) return;
        const worker = cluster.fork({
          CHAIN_ID: chainId,
          START_HEIGHT: 0,
          GQL_URL: gqlURL,
        });
        CLUSTERS[worker.id] = chainId;
      });
      const sleepTime = Number(process.env.SLEEP_TIME) || 10000;
      await sleep(sleepTime);
    }
  } else {
    try {
      console.log(`Worker ${process.pid}-${process.env.CHAIN_ID} started`);
      await start();
    } catch (err) {
      console.log(`Error from ${cluster.worker?.id}`, err);
      process.exit(1);
    }
  }
}

main();
