import AndromedaClient, {
  ChainConfig,
  queryChainConfig,
} from "@andromedaprotocol/andromeda.js";
import clc from "cli-color";

const CHAIN_ID = process.env.CHAIN_ID ?? "uni-5";

export const client = new AndromedaClient();
export let config: ChainConfig;

export async function connect() {
  console.info(clc.yellow("Andromeda Client connecting..."));
  config = await queryChainConfig(CHAIN_ID);
  if (!config) throw new Error("No config for provided chain ID");
  await client.connect(config?.chainUrl!, config?.registryAddress!);
  console.info(clc.green("Andromeda Client connected!"));

  return client;
}
