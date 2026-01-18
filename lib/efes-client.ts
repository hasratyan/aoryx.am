import {
  EFES_BASE_URL,
  EFES_COMPANY_ID,
  EFES_PASSWORD,
  EFES_POLICY_TEMPLATE_DESCRIPTION,
  EFES_TIMEOUT_MS,
  EFES_USER,
  isEfesConfigured,
} from "@/lib/env";
import type { AoryxBookingPayload, BookingInsuranceSelection, BookingInsuranceTraveler } from "@/types/aoryx";
import type { EfesQuoteRequest, EfesQuoteResult, EfesPolicyRequest } from "@/types/efes";

export class EfesClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EfesClientError";
  }
}

export class EfesServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public payload?: unknown
  ) {
    super(message);
    this.name = "EfesServiceError";
  }
}

type EfesTokenCache = {
  token: string;
  expiresAt: number | null;
};

const EFES_AUTH_PATH = "/webservice/auth";
const EFES_SCRIPT_PATH = "/webservice/script?Content-Type=application/json";
const EFES_POLICY_PATH = "/webservice/policy";
const DEFAULT_RISK_LABEL = "STANDARD";
const DEFAULT_RISK_AMOUNT = 15000;
const DEFAULT_RISK_CURRENCY = "EUR";
const DEFAULT_PREMIUM_CURRENCY = "AMD";
const DEFAULT_SUBRISKS = [
  "AMATEUR_SPORT_EXPENCES",
  "BAGGAGE_EXPENCES",
  "travel_inconveniences",
  "house_insurance",
  "trip_cancellation",
];
const DEFAULT_TERRITORY_LABEL =
  "Ամբողջ աշխարհ (բացառությամբ ԱՄՆ, Կանադա, Ավստրալիա, Ճապոնիա, Շենգենյան երկրներ, Մեծ Բրիտանիա)";

let cachedToken: EfesTokenCache | null = null;

const normalizeBase64 = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
};

const decodeJwtExpiry = (token: string): number | null => {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = Buffer.from(normalizeBase64(parts[1]), "base64").toString("utf8");
    const parsed = JSON.parse(payload) as { exp?: number };
    if (typeof parsed.exp === "number") return parsed.exp * 1000;
  } catch {
    return null;
  }
  return null;
};

const isTokenValid = (cache: EfesTokenCache | null) => {
  if (!cache) return false;
  if (!cache.expiresAt) return true;
  return Date.now() + 60_000 < cache.expiresAt;
};

const formatEfesDate = (value: string) => {
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  const [year, month, day] = parts;
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
};

const parseIsoDate = (value: string) => {
  const [year, month, day] = value.split("-").map((item) => Number(item));
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
};

const calculateDays = (startDate: string, endDate: string) => {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (!start || !end) return null;
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
};

const formatEfesAmount = (value: number) => {
  if (!Number.isFinite(value)) return "";
  const fixed = value.toFixed(2);
  return fixed.endsWith(".00") ? fixed.slice(0, -3) : fixed;
};

const maskSensitive = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? "<masked>" : value;

const sanitizeScriptPayload = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return payload;
  const record = payload as Record<string, unknown>;
  const dynObject = record.dyn_object;
  if (!dynObject || typeof dynObject !== "object") return payload;
  const dynRecord = dynObject as Record<string, unknown>;
  return {
    ...record,
    dyn_object: {
      ...dynRecord,
      insured_passport: maskSensitive(dynRecord.insured_passport),
      insured_social_card: maskSensitive(dynRecord.insured_social_card),
    },
  };
};

const extractToken = (payload: unknown): string | null => {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const candidates = ["token", "access_token", "accessToken", "jwt", "data"];
  for (const key of candidates) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
};

const extractNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const extractEfesField = (payload: unknown, keys: string[]): number | null => {
  if (!payload || typeof payload !== "object") return extractNumber(payload);
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = extractNumber(record[key]);
    if (value !== null) return value;
  }
  const nestedCandidates = ["result", "data", "payload", "response"];
  for (const key of nestedCandidates) {
    const nested = record[key];
    const nestedValue = extractEfesField(nested, keys);
    if (nestedValue !== null) return nestedValue;
  }
  return null;
};

const extractEfesSum = (payload: unknown) =>
  extractEfesField(payload, ["SUM", "sum", "total_sum", "totalSum"]);

const extractEfesDiscountedSum = (payload: unknown) =>
  extractEfesField(payload, ["DISCOUNTED_SUM", "discounted_sum", "discountedSum"]);

const EFES_SUBRISK_KEYS = [
  "AMATEUR_SPORT_EXPENCES",
  "BAGGAGE_EXPENCES",
  "TRAVEL_INCONVENIENCES",
  "TRIP_CANCELLATION",
  "HOUSE_INSURANCE",
];

const parsePriceCoverages = (value: unknown): Record<string, number> | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const entries: Array<[string, number]> = [];
  for (const [key, raw] of Object.entries(record)) {
    const parsed = extractNumber(raw);
    if (parsed === null) continue;
    entries.push([key.toUpperCase(), parsed]);
  }
  if (entries.length === 0) return null;
  return entries.reduce<Record<string, number>>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
};

const parseSubriskCoverages = (
  record: Record<string, unknown>,
  prefix = ""
): Record<string, number> | null => {
  const entries: Array<[string, number]> = [];
  EFES_SUBRISK_KEYS.forEach((key) => {
    const value = extractNumber(record[`${prefix}${key}`]);
    if (value === null) return;
    entries.push([key, value]);
  });
  if (entries.length === 0) return null;
  return entries.reduce<Record<string, number>>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
};

const extractPriceCoverages = (payload: unknown): Record<string, number> | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const direct = parsePriceCoverages(
    record.PRICE_COVERAGES ?? record.price_coverages ?? record.priceCoverages
  );
  if (direct) return direct;
  const nestedCandidates = ["result", "data", "payload", "response"];
  for (const key of nestedCandidates) {
    const nested = record[key];
    const nestedValue = extractPriceCoverages(nested);
    if (nestedValue) return nestedValue;
  }
  return null;
};

const extractSubriskCoverages = (
  payload: unknown,
  prefix = ""
): Record<string, number> | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const direct = parseSubriskCoverages(record, prefix);
  if (direct) return direct;
  const nestedCandidates = ["result", "data", "payload", "response"];
  for (const key of nestedCandidates) {
    const nested = record[key];
    const nestedValue = extractSubriskCoverages(nested, prefix);
    if (nestedValue) return nestedValue;
  }
  return null;
};

const extractPremium = (payload: unknown): number | null => {
  if (!payload || typeof payload !== "object") return extractNumber(payload);
  const record = payload as Record<string, unknown>;
  const candidates = [
    "DISCOUNTED_SUM",
    "SUM",
    "discounted_sum",
    "discountedSum",
    "total_sum",
    "totalSum",
    "sum",
    "total",
    "premium",
    "total_premium",
    "totalPremium",
    "price",
    "amount",
    "premium_amount",
    "insurance_premium",
  ];
  for (const key of candidates) {
    const value = extractNumber(record[key]);
    if (value !== null) return value;
  }
  const nestedCandidates = ["data", "result", "response", "payload"];
  for (const key of nestedCandidates) {
    const nested = record[key];
    const nestedValue = extractPremium(nested);
    if (nestedValue !== null) return nestedValue;
  }
  return null;
};

const extractCurrency = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const candidates = ["currency", "premium_currency", "premiumCurrency", "risk_currency"];
  for (const key of candidates) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
};

const parseEfesError = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const isErrorValue = record.is_error;
  const errorCodeValue = record.error_code ?? record.d_error_code;
  const isErrorFlag =
    (typeof isErrorValue === "number" && isErrorValue !== 0) ||
    (typeof isErrorValue === "string" &&
      isErrorValue.trim().length > 0 &&
      isErrorValue.trim() !== "0");
  const errorCode =
    typeof errorCodeValue === "number"
      ? errorCodeValue
      : typeof errorCodeValue === "string"
        ? Number(errorCodeValue)
        : null;
  if (!isErrorFlag && !(typeof errorCode === "number" && errorCode > 0)) {
    return null;
  }
  const messageCandidates = [record.error_msg, record.d_error_msg];
  for (const value of messageCandidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "EFES returned an error response";
};

const buildSubriskPayload = (
  selectedLabels: string[] | null | undefined,
  allLabels?: string[] | null
) => {
  const normalizedSelected = normalizeSubrisks(selectedLabels);
  const normalizedAll = normalizeSubrisks(allLabels) ?? [];
  const baseLabels =
    normalizedAll.length > 0 ? normalizedAll : normalizedSelected ?? [];
  if (baseLabels.length === 0) return undefined;
  const activeSet = new Set(normalizedSelected ?? baseLabels);
  const merged =
    normalizedSelected && normalizedSelected.length > 0
      ? [
          ...baseLabels,
          ...normalizedSelected.filter((label) => !baseLabels.includes(label)),
        ]
      : baseLabels;
  return [
    {
      subrisk: merged.map((label) => ({
        subrisk_label: label,
        active: activeSet.has(label) ? 1 : 0,
      })),
    },
  ];
};

const normalizeSubrisks = (labels: string[] | null | undefined) => {
  if (!Array.isArray(labels)) return null;
  const normalized = labels.map((label) => label.trim()).filter((label) => label.length > 0);
  return normalized;
};

const subriskFieldMap: Record<string, string> = {
  COVID19: "RISK_UNIVERSAL_COVID19_IS_ACTIVE",
  AMATEUR_SPORT_EXPENCES: "RISK_UNIVERSAL_SPORT_EXPENCES_IS_ACTIVE",
  PA: "RISK_UNIVERSAL_PA_IS_ACTIVE",
  BAGGAGE_EXPENCES: "RISK_UNIVERSAL_BAGGAGE_EXPENCES_IS_ACTIVE",
  TRAVEL_INCONVENIENCES: "RISK_UNIVERSAL_TRAVEL_INCONVENIENCES_IS_ACTIVE",
  HOUSE_INSURANCE: "RISK_UNIVERSAL_PC_IS_ACTIVE",
  GENERAL_LIABILITY: "RISK_UNIVERSAL_GENERAL_LIABILITY_IS_ACTIVE",
  TRIP_CANCELLATION: "RISK_UNIVERSAL_TRIP_CANCELLATION_IS_ACTIVE",
};

const buildSubriskFields = (labels: string[] | null | undefined) => {
  const fields: Record<string, string> = {
    RISK_UNIVERSAL_COVID19_IS_ACTIVE: "",
    RISK_UNIVERSAL_SPORT_EXPENCES_IS_ACTIVE: "",
    RISK_UNIVERSAL_PA_IS_ACTIVE: "",
    RISK_UNIVERSAL_BAGGAGE_EXPENCES_IS_ACTIVE: "",
    RISK_UNIVERSAL_TRAVEL_INCONVENIENCES_IS_ACTIVE: "",
    RISK_UNIVERSAL_PC_IS_ACTIVE: "",
    RISK_UNIVERSAL_GENERAL_LIABILITY_IS_ACTIVE: "",
    RISK_UNIVERSAL_TRIP_CANCELLATION_IS_ACTIVE: "",
  };
  if (!Array.isArray(labels)) return fields;
  labels.forEach((label) => {
    const normalized = label.trim().toUpperCase();
    const target = subriskFieldMap[normalized];
    if (target) {
      fields[target] = "1";
    }
  });
  return fields;
};

const getEfesToken = async () => {
  if (!isEfesConfigured()) {
    throw new EfesClientError("EFES is not configured");
  }
  if (isTokenValid(cachedToken)) {
    return cachedToken?.token ?? "";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EFES_TIMEOUT_MS);
  try {
    const response = await fetch(`${EFES_BASE_URL}${EFES_AUTH_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: EFES_USER, password: EFES_PASSWORD }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        typeof (payload as { error?: unknown }).error === "string"
          ? String((payload as { error?: unknown }).error)
          : `EFES auth error: ${response.status} ${response.statusText}`;
      throw new EfesServiceError(message, response.status, payload);
    }

    const token = extractToken(payload);
    if (!token) {
      throw new EfesServiceError("EFES auth response missing token", response.status, payload);
    }

    cachedToken = {
      token,
      expiresAt: decodeJwtExpiry(token),
    };
    return token;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof EfesServiceError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new EfesClientError(`EFES auth request timed out after ${EFES_TIMEOUT_MS}ms`);
    }
    throw new EfesClientError(error instanceof Error ? error.message : "EFES auth failed");
  }
};

const efesRequest = async <T>(
  path: string,
  body: unknown,
  options: { auth?: boolean } = {}
): Promise<T> => {
  if (!isEfesConfigured()) {
    throw new EfesClientError("EFES is not configured");
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EFES_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.auth !== false) {
      const token = await getEfesToken();
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${EFES_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        typeof (payload as { error?: unknown }).error === "string"
          ? String((payload as { error?: unknown }).error)
          : `EFES API error: ${response.status} ${response.statusText}`;
      throw new EfesServiceError(message, response.status, payload);
    }
    return payload as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof EfesServiceError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new EfesClientError(`EFES request timed out after ${EFES_TIMEOUT_MS}ms`);
    }
    throw new EfesClientError(error instanceof Error ? error.message : "EFES request failed");
  }
};

export async function quoteEfesTravelCost(request: EfesQuoteRequest): Promise<EfesQuoteResult> {
  if (!isEfesConfigured()) {
    throw new EfesClientError("EFES is not configured");
  }
  const days = request.days ?? calculateDays(request.startDate, request.endDate);
  if (!days || days <= 0) {
    throw new EfesClientError("Invalid travel dates for EFES quote");
  }
  const subriskPayload = buildSubriskPayload(request.subrisks, DEFAULT_SUBRISKS);

  const results = await Promise.all(
    request.travelers.map(async (traveler) => {
      const payload = {
        script_name: "calc_travel_cost",
        dyn_object: {
          insurance_type: "travel",
          risk_label: request.riskLabel ?? DEFAULT_RISK_LABEL,
          age: String(traveler.age),
          number_of_days: String(days),
          start_date: formatEfesDate(request.startDate),
          end_date: formatEfesDate(request.endDate),
          country_territory: request.territoryCode,
          risk_amount: String(request.riskAmount),
          risk_currency: request.riskCurrency,
          promo_code: request.promoCode ?? "",
          insured_passport: traveler.passportNumber ?? "",
          insured_social_card: traveler.socialCard ?? "",
          subrisks: subriskPayload,
        },
      };
      console.info("[EFES][script] request", sanitizeScriptPayload(payload));
      try {
        const response = await efesRequest<unknown>(EFES_SCRIPT_PATH, payload);
        console.info("[EFES][script] response", response);
        const efesError = parseEfesError(response);
        if (efesError) {
          throw new EfesServiceError(efesError, 200, response);
        }
        const premium = extractPremium(response);
        if (premium === null) {
          throw new EfesServiceError("Unable to extract EFES premium from response", 200, response);
        }
        const currency = extractCurrency(response) ?? DEFAULT_PREMIUM_CURRENCY;
        return { travelerId: traveler.id ?? null, premium, currency, raw: response };
      } catch (error) {
        console.error("[EFES][script] error", error);
        throw error;
      }
    })
  );

  const currency = results[0]?.currency ?? DEFAULT_PREMIUM_CURRENCY;
  if (results.some((result) => result.currency !== currency)) {
    throw new EfesServiceError("EFES returned mixed premium currencies", 200, results);
  }

  const totalPremium = results.reduce((sum, result) => sum + result.premium, 0);
  const totals = results.reduce(
    (acc, result) => {
      const sumValue = extractEfesSum(result.raw);
      if (sumValue !== null) {
        acc.sum += sumValue;
        acc.hasSum = true;
      }
      const discountedValue = extractEfesDiscountedSum(result.raw);
      if (discountedValue !== null) {
        acc.discountedSum += discountedValue;
        acc.hasDiscountedSum = true;
      }
      return acc;
    },
    { sum: 0, discountedSum: 0, hasSum: false, hasDiscountedSum: false }
  );
  const coverageTotals = results.reduce(
    (acc, result) => {
      const baseCoverages =
        extractPriceCoverages(result.raw) ?? extractSubriskCoverages(result.raw);
      const discountedCoverages = extractSubriskCoverages(result.raw, "DISCOUNTED_");
      if (baseCoverages) {
        acc.hasBase = true;
        Object.entries(baseCoverages).forEach(([key, value]) => {
          acc.base[key] = (acc.base[key] ?? 0) + value;
        });
      }
      if (discountedCoverages) {
        acc.hasDiscounted = true;
        Object.entries(discountedCoverages).forEach(([key, value]) => {
          acc.discounted[key] = (acc.discounted[key] ?? 0) + value;
        });
      }
      return acc;
    },
    {
      base: {} as Record<string, number>,
      discounted: {} as Record<string, number>,
      hasBase: false,
      hasDiscounted: false,
    }
  );
  return {
    totalPremium,
    currency,
    premiums: results.map(({ travelerId, premium }) => ({ travelerId, premium })),
    sum: totals.hasSum ? totals.sum : null,
    discountedSum: totals.hasDiscountedSum ? totals.discountedSum : null,
    priceCoverages: coverageTotals.hasBase ? coverageTotals.base : null,
    discountedPriceCoverages: coverageTotals.hasDiscounted
      ? coverageTotals.discounted
      : null,
    raw: results.map((result) => result.raw),
  };
}

const buildPolicyPayload = (request: EfesPolicyRequest) => {
  const traveler = request.traveler;
  const address = traveler.address ?? {};
  const fullAddress = address.full ?? "";
  const fullAddressEn = address.fullEn ?? fullAddress;
  const country = address.country ?? "ARM";
  const region = address.region ?? "YR";
  const city = address.city ?? "YR01";
  const citizenship = traveler.citizenship ?? "ARM";
  const residency = traveler.residency === false ? "0" : "1";
  const policyCreationDate = formatEfesDate(request.policyCreationDate);
  const policyStartDate = formatEfesDate(request.startDate);
  const policyEndDate = formatEfesDate(request.endDate);
  const paymentSchedule = `${formatEfesAmount(request.premium)},${policyCreationDate},1`;
  const subriskFields = buildSubriskFields(request.subrisks);

  return {
    COMPANYID: EFES_COMPANY_ID,
    POLICY_TEMPLATE_DESCRIPTION: EFES_POLICY_TEMPLATE_DESCRIPTION,
    POLICY_ACTION: "n",
    INSURANCE_TYPE: "r",
    AUTO_GENERATE_POLICY_NUMBER: "1",
    POLICY_NUMBER: "",
    IS_INSURED_PHYSICAL: "1",
    INSURED_NAME: traveler.firstName,
    INSURED_NAME_EN: traveler.firstNameEn ?? traveler.firstName,
    INSURED_LAST_NAME: traveler.lastName,
    INSURED_LAST_NAME_EN: traveler.lastNameEn ?? traveler.lastName,
    INSURED_RESIDENCY: residency,
    INSURED_SOCIAL_CARD: traveler.socialCard ?? "",
    INSURED_PASSPORT_NUMBER: traveler.passportNumber ?? "",
    INSURED_PASSPORT_AUTHORITY: traveler.passportAuthority ?? "",
    INSURED_PASSPORT_ISSUE_DATE: traveler.passportIssueDate
      ? formatEfesDate(traveler.passportIssueDate)
      : "",
    INSURED_PASSPORT_EXPIRY_DATE: traveler.passportExpiryDate
      ? formatEfesDate(traveler.passportExpiryDate)
      : "",
    INSURED_GENDER: traveler.gender ?? "",
    INSURED_BIRTHDAY: traveler.birthDate ? formatEfesDate(traveler.birthDate) : "",
    INSURED_PHONE: traveler.phone ?? "",
    INSURED_CITIZENSHIP: citizenship,
    INSURED_MOBILE_PHONE: traveler.mobilePhone ?? traveler.phone ?? "",
    INSURED_MAIL: traveler.email ?? "",
    IS_INSURED_SAME_REG_LIVE_ADDRESS: "1",
    INSURED_REG_FULL_ADDRESS: fullAddress,
    INSURED_REG_FULL_ADDRESS_EN: fullAddressEn,
    INSURED_REG_COUNTRY: country,
    INSURED_REG_REGION: region,
    INSURED_REG_CITY: city,
    INSURED_LIVE_FULL_ADDRESS: "",
    INSURED_LIVE_COUNTRY: "",
    INSURED_LIVE_REGION: "",
    INSURED_LIVE_CITY: "",
    IS_BENEFICIAR_IN_INSURED_OBJECT: "1",
    POLICY_CREATION_DATE: policyCreationDate,
    POLICY_FROM_DATE: policyStartDate,
    POLICY_TO_DATE: policyEndDate,
    POLICY_AMOUNT_CURRENCY: request.riskCurrency,
    POLICY_PREMIUM_CURRENCY: request.premiumCurrency,
    POLICY_STATE: "a",
    TRAVEL_FIRST_NAME: traveler.firstName,
    TRAVEL_LAST_NAME: traveler.lastName,
    TRAVEL_FIRST_NAME_EN: traveler.firstNameEn ?? traveler.firstName,
    TRAVEL_LAST_NAME_EN: traveler.lastNameEn ?? traveler.lastName,
    TRAVEL_CITIZENSHIP: citizenship,
    TRAVEL_BIRTHDAY: traveler.birthDate ? formatEfesDate(traveler.birthDate) : "",
    TRAVEL_GENDER: traveler.gender ?? "",
    TRAVEL_RESIDENCY: residency,
    TRAVEL_SOCIAL_CARD: traveler.socialCard ?? "",
    TRAVEL_PASSPORT_NUMBER: traveler.passportNumber ?? "",
    TRAVEL_PASSPORT_AUTHORITY: traveler.passportAuthority ?? "",
    TRAVEL_PASSPORT_ISSUE_DATE: traveler.passportIssueDate
      ? formatEfesDate(traveler.passportIssueDate)
      : "",
    TRAVEL_PASSPORT_EXPIRY_DATE: traveler.passportExpiryDate
      ? formatEfesDate(traveler.passportExpiryDate)
      : "",
    TRAVEL_PHONE: traveler.phone ?? "",
    TRAVEL_MOBILE_PHONE: traveler.mobilePhone ?? traveler.phone ?? "",
    TRAVEL_MAIL: traveler.email ?? "",
    TRAVEL_LOCATION_TYPE: "REGISTRATION",
    TRAVEL_REG_FULL_ADDRESS: fullAddress,
    TRAVEL_REG_FULL_ADDRESS_EN: fullAddressEn,
    TRAVEL_REG_COUNTRY: country,
    TRAVEL_REG_REGION: region,
    TRAVEL_REG_CITY: city,
    TRAVEL_DAYS_COUNT: String(request.days),
    COUNTRY_TERRITORY: request.territoryLabel,
    TRAVEL_COUNTRIES: request.travelCountries,
    RISK_UNIVERSAL_IS_ACTIVE: "1",
    RISK_UNIVERSAL_AMOUNT: formatEfesAmount(request.riskAmount),
    RISK_UNIVERSAL_PREMIUM: formatEfesAmount(request.premium),
    ...subriskFields,
    POLICY_PAYMENT_SCHEDULE: paymentSchedule,
    IS_FULLY_PAID_ONSITE: "1",
    POLICY_PAYMENT_TYPE: "1",
    IS_POLICY_PAYMENT_SINGLE: "1",
    AGENT_1_LABEL: "",
    AGENT_1_ACTION_LABEL: "",
  };
};

const normalizeTravelerPremium = (
  traveler: BookingInsuranceTraveler,
  insurance: BookingInsuranceSelection,
  totalTravelers: number
) => {
  const premium = traveler.premium;
  if (typeof premium === "number" && Number.isFinite(premium)) {
    return premium;
  }
  const totalPremium =
    typeof insurance.price === "number" && Number.isFinite(insurance.price)
      ? insurance.price
      : null;
  if (totalPremium !== null && totalTravelers > 0) {
    return totalPremium / totalTravelers;
  }
  return null;
};

const normalizePremiumCurrency = (traveler: BookingInsuranceTraveler, insurance: BookingInsuranceSelection) => {
  const travelerCurrency = traveler.premiumCurrency;
  if (travelerCurrency && travelerCurrency.trim().length > 0) return travelerCurrency;
  return insurance.currency ?? DEFAULT_PREMIUM_CURRENCY;
};

export async function createEfesPoliciesFromBooking(payload: AoryxBookingPayload) {
  const insurance = payload.insurance ?? null;
  if (!insurance || insurance.provider !== "efes") return [];
  const travelers = insurance.travelers ?? [];
  if (travelers.length === 0) return [];

  const startDate = insurance.startDate ?? payload.checkInDate ?? "";
  const endDate = insurance.endDate ?? payload.checkOutDate ?? "";
  if (!startDate || !endDate) {
    throw new EfesClientError("Missing travel dates for EFES policy");
  }

  const days =
    typeof insurance.days === "number" && Number.isFinite(insurance.days) && insurance.days > 0
      ? insurance.days
      : calculateDays(startDate, endDate);
  if (!days) {
    throw new EfesClientError("Unable to calculate travel days for EFES policy");
  }

  const riskAmount =
    typeof insurance.riskAmount === "number" && Number.isFinite(insurance.riskAmount)
      ? insurance.riskAmount
      : DEFAULT_RISK_AMOUNT;
  const riskCurrency = insurance.riskCurrency ?? DEFAULT_RISK_CURRENCY;
  const riskLabel = insurance.riskLabel ?? DEFAULT_RISK_LABEL;
  const subrisks = normalizeSubrisks(insurance.subrisks) ?? DEFAULT_SUBRISKS;
  const territoryLabel =
    insurance.territoryPolicyLabel ??
    (insurance.territoryCode ? DEFAULT_TERRITORY_LABEL : insurance.territoryLabel ?? DEFAULT_TERRITORY_LABEL);
  const travelCountries = insurance.travelCountries ?? "";
  if (!travelCountries) {
    throw new EfesClientError("Missing travel countries for EFES policy");
  }

  const policyCreationDate = new Date().toISOString().slice(0, 10);

  const results = await Promise.all(
    travelers.map(async (traveler) => {
      const premium = normalizeTravelerPremium(traveler, insurance, travelers.length);
      if (!premium || !Number.isFinite(premium)) {
        throw new EfesClientError("Missing premium for EFES policy traveler");
      }
      const premiumCurrency = normalizePremiumCurrency(traveler, insurance);
      const policyRequest: EfesPolicyRequest = {
        traveler,
        premium,
        premiumCurrency,
        riskAmount,
        riskCurrency,
        riskLabel,
        territoryLabel,
        travelCountries,
        startDate,
        endDate,
        days,
        policyCreationDate,
        subrisks,
      };
      const payload = buildPolicyPayload(policyRequest);
      const response = await efesRequest<unknown>(EFES_POLICY_PATH, payload);
      return { travelerId: traveler.id ?? null, response };
    })
  );

  return results;
}
