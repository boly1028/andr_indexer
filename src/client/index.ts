import AndromedaClient, {
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

// export const client = new AndromedaClient();

export const graphQLClient = new GraphQLClient(GQL_URL);

export let config: ChainConfig;

export async function connect() {
  console.info(clc.yellow("Andromeda Client connecting..."));
  config = await queryChainConfig(CHAIN_ID);
  // console.log("chainConfig: ", config);
  const client = createClient(config.addressPrefix);
  if (!config) throw new Error("No config for provided chain ID");
  if (CHAIN_ID === "galileo-3") {
    config.chainUrl = "https://andromeda.rpc.t.anode.team/";
  }
  if (CHAIN_ID === "injective-888") {
    config.chainUrl = "https://injective-rpc.publicnode.com:443";
  }
  // if (CHAIN_ID === "elgafar-1") {
  //   config.chainUrl = "https://stargaze-testnet-rpc.polkachu.com//";
  // }
  await client.connect(
    config.chainUrl!,
    // config.kernelAddress!,
    // config.addressPrefix
  );
  console.info(clc.green("Andromeda Client connected!"));

  return client;
}
