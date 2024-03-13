export async function sleep(timeout: number) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

export function getMsgInfo(inputStr: string) {
  const startIndex = inputStr.indexOf('{');
  const endIndex = inputStr.lastIndexOf('}');
  const res = inputStr.substring(startIndex, endIndex + 1);
  return res;
}
