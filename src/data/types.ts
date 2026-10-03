export type CountryCode =
  | 'US' | 'GB' | 'CA' | 'DE' | 'FR' | 'MX' | 'IN'
  | 'ET' | 'JP' | 'VN' | 'SG' | 'MA' | 'PT' | 'TR';

export type Status =
  | 'OTC' | 'RX' | 'MIXED' | 'PHARMACY'
  | 'CONTROLLED' | 'BANNED' | 'UNCONFIRMED' | 'ASK_GENERIC';

export type Confidence = 'high' | 'medium' | 'low';

export interface Country {
  code: CountryCode;
  name: string;
  slug: string;
}

export interface StatusMeta {
  label: string;
  cls: string;
}

export interface CountryEntry {
  brand: string;
  status: Status;
  confidence: Confidence;
  note: string | null;
  source: string | null;
}

export interface Drug {
  id: string;
  generic: string;
  usAlt: string | null;
  cls: string;
  atc: string;
  countries: Partial<Record<CountryCode, CountryEntry>>;
}
