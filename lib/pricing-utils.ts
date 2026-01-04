const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const applyMarkup = (
  amount: number | null | undefined,
  markup: number | null | undefined
): number | null => {
  if (!isFiniteNumber(amount)) return null;
  const safeMarkup = isFiniteNumber(markup) ? markup : 0;
  if (safeMarkup === 0) return amount;
  return amount * (1 + safeMarkup);
};

export { isFiniteNumber };
