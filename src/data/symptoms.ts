import type { Symptom, SymptomId } from './types';

/**
 * Symptoms a traveler can browse by, in the order the homepage lists them. Each medicine's `symptoms` in
 * drugs.json says which ones it is sold for.
 */
export const SYMPTOMS: readonly Symptom[] = [
  { id: 'pain', title: 'Pain and fever', kit: 'pain', keywords: 'headache aches painkiller temperature' },
  { id: 'sprains', title: 'Sprains and strains', kit: 'pain', keywords: 'sprain strain injury' },
  { id: 'hay-fever', title: 'Hay fever', kit: 'allergy', keywords: 'allergy allergic pollen' },
  { id: 'bites-hives', title: 'Bites, hives and itchy rashes', kit: 'allergy', keywords: 'itch rash sting mosquito' },
  { id: 'cold', title: 'Cold and cough', kit: 'cold', keywords: 'blocked nose congestion stuffy sinus decongestant' },
  { id: 'travelers-diarrhea', title: 'Diarrhea and dehydration', kit: 'stomach', keywords: 'traveler’s diarrhoea traveller stomach bug rehydration ors electrolytes' },
  { id: 'heartburn', title: 'Heartburn, indigestion and gas', kit: 'stomach', keywords: 'acid reflux antacid bloating wind flatulence' },
  { id: 'constipation', title: 'Constipation', kit: 'stomach', keywords: 'laxative' },
  { id: 'motion-sickness', title: 'Nausea and motion sickness', kit: 'motion', keywords: 'vomiting sick travel sickness seasick carsick' },
  { id: 'jet-lag', title: 'Jet lag and sleep', kit: 'motion', keywords: 'insomnia sleeping' },
  { id: 'fungal-skin', title: 'Athlete’s foot and fungal rashes', kit: 'skin', keywords: 'ringworm jock itch fungus antifungal' },
  { id: 'cuts', title: 'Cuts and scrapes', kit: 'skin', keywords: 'wound graze first aid' },
  { id: 'emergency-contraception', title: 'Emergency contraception', kit: 'womens', keywords: 'morning after pill plan b' },
  { id: 'malaria-prevention', title: 'Malaria prevention', kit: 'clinic', keywords: 'antimalarial prophylaxis' },
  { id: 'altitude-sickness', title: 'Altitude sickness', kit: 'clinic', keywords: 'mountain sickness high altitude' },
  { id: 'severe-allergy', title: 'Severe allergic reaction', kit: 'clinic', keywords: 'anaphylaxis epipen' },
];

/** Symptoms that were merged into another, so old links (/symptom/fever, ?s=fever) still land somewhere. */
export const MERGED_SYMPTOMS: Readonly<Record<string, SymptomId>> = {
  fever: 'pain', 'blocked-nose': 'cold', cough: 'cold', dehydration: 'travelers-diarrhea', gas: 'heartburn', nausea: 'motion-sickness',
};
