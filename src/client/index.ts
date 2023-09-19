import AndromedaClient, {
  ChainConfig,
  queryChainConfig,
} from "@andromedaprotocol/andromeda.js";
import clc from "cli-color";
import { GraphQLClient } from "graphql-request";

const CHAIN_ID = process.env.CHAIN_ID ?? "uni-6";
const GQL_URL = process.env.GQL_URL ?? "http://0.0.0.0:8085/graphql";

export const client = new AndromedaClient();
export const graphQLClient = new GraphQLClient(GQL_URL);

export let config: ChainConfig;

export async function connect() {
  console.info(clc.yellow("Andromeda Client connecting..."));
  config = await queryChainConfig(CHAIN_ID);
  if (!config) throw new Error("No config for provided chain ID");
  if (CHAIN_ID === "galileo-3")
    config.chainUrl = "https://andromeda.rpc.t.anode.team/";
  await client.connect(
    config.chainUrl!,
    config.kernelAddress!,
    config.addressPrefix
  );
  console.info(clc.green("Andromeda Client connected!"));

  return client;
}
