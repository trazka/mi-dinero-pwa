import type { Data } from "./data";

export const normalizeConcept = (value: string) =>
  value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

export function categoryForConcept(
  data: Data,
  concept: string,
): string | undefined {
  const key = normalizeConcept(concept);
  return (
    [...data.movements]
      .reverse()
      .find(
        (item) =>
          item.type !== "transfer" && normalizeConcept(item.merchant) === key,
      )?.category ??
    [...(data.recurrents ?? [])]
      .reverse()
      .find((item) => normalizeConcept(item.merchant) === key)?.category
  );
}
