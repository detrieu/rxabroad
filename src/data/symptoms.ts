import type { Symptom } from './types';

/**
 * Symptoms a traveler can browse by, in the order the homepage lists them. Each medicine's `symptoms` in
 * drugs.json says which ones it is sold for.
 */
export const SYMPTOMS: readonly Symptom[] = [
  { id: 'fever', title: 'Fever', kit: 'pain', keywords: 'temperature' },
  { id: 'pain', title: 'Headache and aches', kit: 'pain', keywords: 'pain painkiller' },
  { id: 'sprains', title: 'Sprains and strains', kit: 'pain', keywords: 'sprain strain injury' },
  { id: 'hay-fever', title: 'Hay fever', kit: 'allergy', keywords: 'allergy allergic pollen' },
  { id: 'bites-hives', title: 'Bites, hives and itchy rashes', kit: 'allergy', keywords: 'itch rash sting mosquito' },
  { id: 'blocked-nose', title: 'Blocked nose', kit: 'cold', keywords: 'congestion stuffy sinus decongestant cold' },
  { id: 'cough', title: 'Cough', kit: 'cold', keywords: 'cold' },
  { id: 'travelers-diarrhea', title: 'Traveler’s diarrhea', kit: 'stomach', keywords: 'diarrhea diarrhoea traveller stomach bug' },
  { id: 'heartburn', title: 'Heartburn and indigestion', kit: 'stomach', keywords: 'acid reflux antacid' },
  { id: 'gas', title: 'Gas and bloating', kit: 'stomach', keywords: 'wind flatulence' },
  { id: 'constipation', title: 'Constipation', kit: 'stomach', keywords: 'laxative' },
  { id: 'dehydration', title: 'Dehydration', kit: 'stomach', keywords: 'rehydration ors electrolytes' },
  { id: 'nausea', title: 'Nausea and vomiting', kit: 'stomach', keywords: 'sick vomit' },
  { id: 'motion-sickness', title: 'Motion sickness', kit: 'motion', keywords: 'travel sickness seasick carsick' },
  { id: 'jet-lag', title: 'Jet lag and sleep', kit: 'motion', keywords: 'insomnia sleeping' },
  { id: 'fungal-skin', title: 'Athlete’s foot and fungal rashes', kit: 'skin', keywords: 'ringworm jock itch fungus antifungal' },
  { id: 'cuts', title: 'Cuts and scrapes', kit: 'skin', keywords: 'wound graze first aid' },
  { id: 'emergency-contraception', title: 'Emergency contraception', kit: 'womens', keywords: 'morning after pill plan b' },
  { id: 'malaria-prevention', title: 'Malaria prevention', kit: 'clinic', keywords: 'antimalarial prophylaxis' },
  { id: 'altitude-sickness', title: 'Altitude sickness', kit: 'clinic', keywords: 'mountain sickness high altitude' },
  { id: 'severe-allergy', title: 'Severe allergic reaction', kit: 'clinic', keywords: 'anaphylaxis epipen' },
];
