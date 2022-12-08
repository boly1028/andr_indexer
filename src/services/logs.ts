/**
 * Splits an array of events in to an array of array of Attributes by a given key
 * @param key
 * @param event
 * @returns
 */
export function splitAttributesByKey(key: string, event: any): any[][] {
  const splitIndices: number[] = [];
  const attributeSlices: any[][] = [];
  event.attributes.forEach(({ key: attrKey }: any, idx: number) => {
    if (attrKey === key) splitIndices.push(idx);
  });

  splitIndices.forEach((idx, i) => {
    const nextIdx =
      i === splitIndices.length ? splitIndices.length - 1 : splitIndices[i + 1];
    const attrs = event.attributes.slice(idx, nextIdx);
    attributeSlices.push(attrs);
  });
  return attributeSlices;
}
