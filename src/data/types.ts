export type CountryCode =
  | 'US' | 'GB' | 'CA' | 'DE' | 'FR' | 'MX' | 'IN'
  | 'ET' | 'JP' | 'VN' | 'SG' | 'MA' | 'PT' | 'TR' | 'IT' | 'ES';

export type Status =
  | 'OTC' | 'RX' | 'MIXED' | 'PHARMACY'
  | 'CONTROLLED' | 'BANNED' | 'UNCONFIRMED' | 'UNAVAILABLE';

export type Confidence = 'high' | 'medium' | 'low';

export interface Country {
  code: CountryCode;
  name: string;
  slug: string;
}

/** Travel-essentials group; unset for everything else (shown under "Other"). */
export type KitGroup = 'pain' | 'allergy' | 'cold' | 'stomach' | 'motion' | 'skin' | 'womens' | 'clinic';

/** What a traveler is trying to treat. A medicine can be sold for several. */
export type SymptomId =
  | 'fever' | 'pain' | 'sprains' | 'hay-fever' | 'bites-hives' | 'blocked-nose' | 'cough'
  | 'travelers-diarrhea' | 'heartburn' | 'gas' | 'constipation' | 'dehydration' | 'nausea'
  | 'motion-sickness' | 'jet-lag' | 'fungal-skin' | 'cuts' | 'emergency-contraception'
  | 'malaria-prevention' | 'altitude-sickness' | 'severe-allergy';

export interface Symptom {
  /** Also the URL slug: /symptom/<id>. */
  id: SymptomId;
  title: string;
  kit: KitGroup;
  /** Other words a traveler might type for it. */
  keywords?: string;
}

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
  /** The generic name in the country's own language, where it differs from the English one. */
  localName?: string;
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
  symptoms?: SymptomId[];
  countries: Partial<Record<CountryCode, CountryEntry>>;
}
