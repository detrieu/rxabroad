export type CountryCode =
  | 'US' | 'GB' | 'CA' | 'DE' | 'FR' | 'MX' | 'IN'
  | 'ET' | 'JP' | 'VN' | 'SG' | 'MA' | 'PT' | 'TR';

export type Status =
  | 'OTC' | 'RX' | 'MIXED' | 'PHARMACY'
  | 'CONTROLLED' | 'BANNED' | 'UNCONFIRMED' | 'ASK_GENERIC' | 'UNAVAILABLE';

export type Confidence = 'high' | 'medium' | 'low';

export interface Country {
  code: CountryCode;
  name: string;
  slug: string;
}

/** Travel-essentials group; unset for everything else (shown under "Other"). */
export type KitGroup = 'pain' | 'allergy' | 'cold' | 'stomach' | 'motion' | 'skin' | 'womens' | 'clinic';

export interface StatusMeta {
  label: string;
  cls: string;
}

export type VerificationCheck = 'brand' | 'ingredient' | 'status';

/** Written by scripts/verify/run.mjs when an official registry confirms the entry. */
export interface Verification {
  /** Display name of the registry, e.g. "Health Canada DPD". */
  registry: string;
  /** The registry's own id for the matched record (RxCUI, DPD drug code, licence no., CIS). */
  id: string;
  url: string;
  /** ISO date (YYYY-MM-DD) of the check. */
  checked: string;
  checks: VerificationCheck[];
}

export interface CountryEntry {
  brand: string;
  status: Status;
  confidence: Confidence;
  note: string | null;
  source: string | null;
  verified?: Verification;
}

export interface Drug {
  id: string;
  generic: string;
  usAlt: string | null;
  cls: string;
  atc: string;
  /** RxNorm ingredient id; lets the live US-name lookup map RxNorm ingredients to this drug. */
  rxcui?: string;
  kit?: KitGroup;
  countries: Partial<Record<CountryCode, CountryEntry>>;
}
