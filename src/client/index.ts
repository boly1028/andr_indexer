import AndromedaClient, {
  getConfigByChainID,
} from "@andromedaprotocol/andromeda.js";
import clc from "cli-color";

const CHAIN_ID = process.env.CHAIN_ID ?? "uni-3";

const client = new AndromedaClient();

export async function connect() {
  console.info(clc.yellow("Andromeda Client connecting..."));
  const config = getConfigByChainID(CHAIN_ID);
  if (!config) throw new Error("No config for provided chain ID");

  await client.connect(config?.chainUrl!, config?.registryAddress!);
  console.info(clc.green("Andromeda Client connected!"));

  return client;
}
