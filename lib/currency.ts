export type AmdRates = {
  USD: number;
  EUR: number;
};

export type NormalizedAmount = {
  amount: number;
  currency: string;
  isConverted: boolean;
};

const AMD_SYMBOL = "\u058F";
const EUR_SYMBOL = "\u20AC";

const GROUPING_SEPARATOR = ",";

const formatWholeNumber = (amount: number) => {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const absValue = Math.abs(rounded);
  const grouped = absValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, GROUPING_SEPARATOR);
  return `${sign}${grouped}`;
};

export const normalizeCurrencyCode = (currency: string | null | undefined) =>
  (currency ?? "USD").trim().toUpperCase();

export const convertToAmd = (
  amount: number,
  currency: string | null | undefined,
  rates: AmdRates
): number | null => {
  if (!Number.isFinite(amount)) return null;
  const normalized = normalizeCurrencyCode(currency);
  if (normalized === "AMD") return amount;
  if (normalized === "USD") return amount * rates.USD;
  if (normalized === "EUR") return amount * rates.EUR;
  return null;
};

export const normalizeAmount = (
  amount: number | null | undefined,
  currency: string | null | undefined,
  rates: AmdRates | null | undefined
): NormalizedAmount | null => {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  const baseCurrency = normalizeCurrencyCode(currency);
  if (!rates) {
    return { amount, currency: baseCurrency, isConverted: baseCurrency === "AMD" };
  }
  const converted = convertToAmd(amount, baseCurrency, rates);
  if (converted === null) {
    return { amount, currency: baseCurrency, isConverted: baseCurrency === "AMD" };
  }
  return { amount: converted, currency: "AMD", isConverted: true };
};

export const formatCurrencyAmount = (
  amount: number | null | undefined,
  currency: string | null | undefined,
  locale: string
): string | null => {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  const safeCurrency = normalizeCurrencyCode(currency);
  try {
    const formattedNumber = formatWholeNumber(amount);
    if (safeCurrency === "AMD") return `${formattedNumber} ${AMD_SYMBOL}`;
    if (safeCurrency === "USD") return `$${formattedNumber}`;
    if (safeCurrency === "EUR") return `${EUR_SYMBOL}${formattedNumber}`;
    return `${formattedNumber} ${safeCurrency}`;
  } catch {
    return `${safeCurrency} ${amount}`;
  }
};

export const formatNormalizedAmount = (
  amount: number | null | undefined,
  currency: string | null | undefined,
  locale: string,
  rates: AmdRates | null | undefined
): string | null => {
  const normalized = normalizeAmount(amount, currency, rates);
  if (!normalized) return null;
  return formatCurrencyAmount(normalized.amount, normalized.currency, locale);
};
