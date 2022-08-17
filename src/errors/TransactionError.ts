export default class TransactionError extends Error {
  constructor(hash: string, block: number, description: string) {
    super(`[Hash: ${hash} - Block: ${block}]: ${description}`);
  }
}
