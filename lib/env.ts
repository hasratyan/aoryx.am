// Aoryx API Environment Configuration
// Values are read directly from process.env (.env/.env.local at runtime)

const {
  AORYX_BASE_URL: RAW_AORYX_BASE_URL = "",
  AORYX_API_KEY = "",
  AORYX_DEFAULT_CURRENCY = "USD",
  AORYX_TIMEOUT_MS_RAW = "15000",
  AORYX_CUSTOMER_CODE,
  FLYDUBAI_SEARCH_URL: RAW_FLYDUBAI_SEARCH_URL = "",
  FLYDUBAI_API_KEY = "",
  FLYDUBAI_ACCESS_TOKEN = "",
  FLYDUBAI_TIMEOUT_MS_RAW = "15000",
} = process.env;

// Normalize base URL to use HTTPS (API requires HTTPS)
function normalizeBaseUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim().replace(/\/+$/, "");
  // Aoryx API requires HTTPS
  if (trimmed.startsWith("http://apiv2.giinfotech.ae")) {
    return trimmed.replace(/^http:/, "https:");
  }
  return trimmed;
}

export const AORYX_BASE_URL = normalizeBaseUrl(RAW_AORYX_BASE_URL);
export { AORYX_API_KEY, AORYX_DEFAULT_CURRENCY, AORYX_CUSTOMER_CODE };
export const AORYX_TIMEOUT_MS_NUMBER = Number.parseInt(AORYX_TIMEOUT_MS_RAW, 10);
export const AORYX_TIMEOUT_MS = AORYX_TIMEOUT_MS_NUMBER;

export const FLYDUBAI_SEARCH_URL = RAW_FLYDUBAI_SEARCH_URL.trim();
export { FLYDUBAI_API_KEY, FLYDUBAI_ACCESS_TOKEN };
export const FLYDUBAI_TIMEOUT_MS_NUMBER = Number.parseInt(FLYDUBAI_TIMEOUT_MS_RAW, 10);
export const FLYDUBAI_TIMEOUT_MS = FLYDUBAI_TIMEOUT_MS_NUMBER;

// TassPro constants (for UAE region)
export const AORYX_TASSPRO_CUSTOMER_CODE = "5993";
export const AORYX_TASSPRO_REGION_ID = "93";

// Validation helper
export function isAoryxConfigured(): boolean {
  return Boolean(AORYX_API_KEY && AORYX_BASE_URL);
}

export function isFlydubaiConfigured(): boolean {
  return Boolean(FLYDUBAI_SEARCH_URL);
}
