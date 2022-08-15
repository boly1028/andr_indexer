import { Attribute, Event } from "@cosmjs/stargate/build/logs";

/**
 * Splits an array of events in to an array of array of Attributes by a given key
 * @param key
 * @param event
 * @returns
 */
export function splitAttributesByKey(key: string, event: Event): Attribute[][] {
  const splitIndices: number[] = [];
  const attributeSlices: Attribute[][] = [];
  event.attributes.forEach(({ key: attrKey }, idx) => {
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
