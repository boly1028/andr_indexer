import {
  ChainConfig,
  queryChainConfig,
} from "@andromedaprotocol/andromeda.js";
import createClient from "@andromedaprotocol/andromeda.js/dist/clients";
import clc from "cli-color";
import { GraphQLClient } from "graphql-request";
import { configDotenv } from "dotenv";
configDotenv();

const CHAIN_ID = process.env.CHAIN_ID ?? "uni-6";
const GQL_URL = process.env.GQL_URL ?? "http://0.0.0.0:8085/graphql";

export const graphQLClient = new GraphQLClient(GQL_URL);

export let config: ChainConfig;

/**
 * A function to connect Andromeda Client.
 */
export async function connect() {
  console.info(clc.yellow("Andromeda Client connecting..."));
  config = await queryChainConfig(CHAIN_ID);

  const client = createClient(config.addressPrefix);
  if (!config) throw new Error("No config for provided chain ID");

  await client.connect(
    config.chainUrl!,
  );
  console.info(clc.green("Andromeda Client connected!"));

  return client;
}
