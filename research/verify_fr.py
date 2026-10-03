import re

with open('/Users/detrieu/.claude/jobs/963fa398/tmp/CIS_bdpm_utf8.txt', encoding='utf-8') as f:
    cis_lines = [l.rstrip('\n').split('\t') for l in f if l.strip()]

with open('/Users/detrieu/.claude/jobs/963fa398/tmp/CIS_CPD_bdpm_utf8.txt', encoding='utf-8') as f:
    cpd = {}
    for l in f:
        parts = l.rstrip('\n').split('\t')
        if len(parts) >= 2:
            cpd.setdefault(parts[0], []).append(parts[1])

# brand -> list of search terms (first word of brand, to catch "DOLIPRANE 500 mg, comprimé")
brands = {
    'paracetamol': ['Doliprane'],
    'ibuprofen': ['Nurofen', 'Advil'],
    'loratadine': ['Clarityne'],
    'cetirizine': ['Zyrtec', 'Actifed Allergie'],
    'loperamide': ['Imodium'],
    'omeprazole': ['Mopral'],
    'pseudoephedrine': ['Actifed'],
    'amoxicillin': ['Clamoxyl'],
    'metformin': ['Glucophage'],
    'sertraline': ['Zoloft'],
    'albuterol': ['Ventoline'],
    'levothyroxine': ['Levothyrox'],
    'lisinopril': ['Zestril'],
    'amlodipine': ['Amlor'],
    'metoprolol': ['Seloken', 'Lopressor'],
    'losartan': ['Cozaar'],
    'gabapentin': ['Neurontin'],
    'rosuvastatin': ['Crestor'],
    'pantoprazole': ['Eupantol', 'Inipomp'],
    'escitalopram': ['Seroplex'],
    'hydrochlorothiazide': ['Esidrex'],
    'bupropion': ['Zyban'],
    'fluoxetine': ['Prozac'],
    'semaglutide': ['Ozempic'],
    'montelukast': ['Singulair'],
    'simvastatin': ['Zocor'],
    'tamsulosin': ['Omix', 'Josir'],
    'fluticasone': ['Flixonase'],
    'meloxicam': ['Mobic'],
    'apixaban': ['Eliquis'],
    'furosemide': ['Lasilix'],
    'insulin_glargine': ['Lantus'],
    'duloxetine': ['Cymbalta'],
    'empagliflozin': ['Jardiance'],
    'carvedilol': ['Kredex'],
    'tramadol': ['Topalgic'],
    'alprazolam': ['Xanax'],
    'prednisone': ['Cortancyl'],
    'clopidogrel': ['Plavix'],
    'aspirin': ['Aspegic', 'Aspirine UPSA'],
    'oxycodone': ['OxyContin'],
    'methylphenidate': ['Ritaline'],
}

def normalize(s):
    return re.sub(r'[^A-Za-z0-9 ]', '', s).upper()

for drug_id, terms in brands.items():
    print(f'=== {drug_id} ===')
    for term in terms:
        nterm = normalize(term)
        matches = [row for row in cis_lines if len(row) >= 7 and normalize(row[1]).startswith(nterm)]
        if not matches:
            print(f'  "{term}": NO MATCH in CIS_bdpm')
            continue
        marketed = [m for m in matches if m[6] == 'Commercialisée']
        not_marketed = [m for m in matches if m[6] != 'Commercialisée']
        statuses = set()
        for m in (marketed if marketed else matches)[:3]:
            cis = m[0]
            conds = cpd.get(cis, [])
            statuses.update(conds)
        print(f'  "{term}": {len(matches)} total, {len(marketed)} marketed, {len(not_marketed)} not marketed')
        if marketed:
            print(f'    sample marketed: {marketed[0][1][:80]}')
        else:
            print(f'    sample (not marketed): {matches[0][1][:80]}')
        print(f'    prescription conditions seen: {sorted(statuses)[:5]}')
