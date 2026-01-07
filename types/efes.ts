import type { BookingInsuranceTraveler } from "@/types/aoryx";

export type EfesQuoteTraveler = {
  id?: string | null;
  age: number;
  passportNumber?: string | null;
  socialCard?: string | null;
};

export type EfesQuoteRequest = {
  startDate: string;
  endDate: string;
  days?: number | null;
  territoryCode: string;
  riskAmount: number;
  riskCurrency: string;
  riskLabel?: string | null;
  promoCode?: string | null;
  travelers: EfesQuoteTraveler[];
  subrisks?: string[] | null;
};

export type EfesQuoteResult = {
  totalPremium: number;
  currency: string;
  premiums: Array<{ travelerId: string | null; premium: number }>;
  raw?: unknown[];
};

export type EfesPolicyRequest = {
  traveler: BookingInsuranceTraveler;
  premium: number;
  premiumCurrency: string;
  riskAmount: number;
  riskCurrency: string;
  riskLabel: string;
  territoryLabel: string;
  travelCountries: string;
  startDate: string;
  endDate: string;
  days: number;
  policyCreationDate: string;
  subrisks?: string[] | null;
};
