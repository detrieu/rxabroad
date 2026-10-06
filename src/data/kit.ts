import type { KitGroup } from './types';

/** Travel-essentials groups, in the order the homepage lists them. */
export const KIT_GROUPS: readonly { id: KitGroup; title: string; hint: string }[] = [
  { id: 'pain', title: 'Pain and fever', hint: 'Headaches, aches, sprains.' },
  { id: 'allergy', title: 'Allergy', hint: 'Hay fever, hives, itchy eyes.' },
  { id: 'cold', title: 'Cold and cough', hint: 'Blocked nose, chesty or dry cough.' },
  { id: 'stomach', title: 'Stomach and digestion', hint: 'Diarrhea, heartburn, constipation, dehydration.' },
  { id: 'motion', title: 'Motion sickness and sleep', hint: 'Boats, winding roads, jet lag.' },
  { id: 'skin', title: 'Skin and first aid', hint: 'Bites, rashes, cuts, athlete’s foot.' },
  { id: 'womens', title: 'Women’s health', hint: 'Emergency contraception.' },
  { id: 'clinic', title: 'From a travel clinic', hint: 'Prescription medicines to arrange before you leave: malaria, traveler’s diarrhea, altitude, severe allergy.' },
];
