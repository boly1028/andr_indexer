import { CleanedTx, getAttribute } from "@andromedaprotocol/andromeda.js";
import { Log } from "@cosmjs/stargate/build/logs";
import { getCodeIDByType, newCodeId, updateCodeId } from "../services";
import { createOrUpdateIndexingStatus } from "../processors";
import { configDotenv } from "dotenv";
configDotenv();

export function getCodeIDInfo(logs: readonly Log[]):
  | {
      adoType: string;
      codeId: number;
    }
  | undefined {
  const [adoType] = getAttribute("wasm.code_id_key", logs);
  if (!adoType) return;
  const [codeIdAttr] = getAttribute("wasm.code_id", logs);
  if (!codeIdAttr) return;

  const codeId = parseInt(codeIdAttr.value);
  if (isNaN(codeId)) return;

  return {
    adoType: adoType.value,
    codeId,
  };
}

export async function handleCodeIDLog(batch: readonly CleanedTx[], chainId: string) {
  for (let i = 0; i < batch.length; i++) {
    const tx = batch[i];
    const indexingType = 'add_update_code_ID';
    const codeIdInfo = getCodeIDInfo(tx.rawLog);
    if (!codeIdInfo) continue;
    const { codeId, adoType } = codeIdInfo;
    const savedCodeId = await getCodeIDByType(adoType, chainId);
    if (savedCodeId) {
      if (savedCodeId.toJSON().lastUpdatedHeight < tx.height) {
        await updateCodeId(adoType, codeId, tx.hash, tx.height);
      }
    } else {
      await newCodeId(adoType, codeId, tx.hash, tx.height);
    }
    await createOrUpdateIndexingStatus(chainId, indexingType, tx.height);
  }
}
