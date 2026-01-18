export type EfesInsuranceErrorCopy = {
  invalidDays: string;
};

const INVALID_DAYS_CODE = "error_calc_travel_005";
const INVALID_DAYS_MESSAGE_HY = "Ճանապարհորդության օրերի քանակը սխալ է լրացված";

export const mapEfesErrorMessage = (
  message: string,
  copy: EfesInsuranceErrorCopy
): string => {
  if (!message) return message;
  const normalized = message.toLowerCase();
  if (normalized.includes(INVALID_DAYS_CODE)) return copy.invalidDays;
  if (message.includes(INVALID_DAYS_MESSAGE_HY)) return copy.invalidDays;
  return message;
};
