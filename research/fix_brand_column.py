import re

PATH = '/private/tmp/claude-501/-Users-detrieu-claude-lab/7019b86d-4407-459f-b12a-7a56eedc96db/scratchpad/formulary_template.html'
with open(PATH) as f:
    content = f.read()

start = content.index('var DRUGS = [')
end = content.index('\n  ];', start)
drugs_src = content[start:end]

# (drug_id, country_code) -> (old_line_exact, new_line_exact)
FIXES = {
    ('pseudoephedrine', 'IN'): (
        """IN: c('Many pseudoephedrine products withdrawn or controlled', 'CONTROLLED', 'low'),""",
        """IN: c('Ask by generic name', 'CONTROLLED', 'low', 'Many pseudoephedrine products have been withdrawn or controlled.'),"""
    ),
    ('pseudoephedrine', 'JP'): (
        """JP: c('Technically allowed in small quantities, but treat with caution', 'CONTROLLED', 'medium', 'Correction: previously listed as an outright ban. Pseudoephedrine is a Stimulants Raw Material under Japanese law — products at 10% concentration or less are exempt up to a 2-month personal supply, but higher concentrations or larger quantities require advance Ministry of Health permission. Since most travelers cannot easily verify their product’s exact concentration, Sudafed PE (phenylephrine) remains the simpler, safer choice to bring instead.', 'https://is-this-legal.com/is-pseudoephedrine-legal-in-japan/'),""",
        """JP: c('Ask by generic name', 'CONTROLLED', 'medium', 'Correction: previously listed as an outright ban. Pseudoephedrine is a Stimulants Raw Material under Japanese law — products at 10% concentration or less are exempt up to a 2-month personal supply, but higher concentrations or larger quantities require advance Ministry of Health permission. Since most travelers cannot easily verify their product’s exact concentration, Sudafed PE (phenylephrine) remains the simpler, safer choice to bring instead.', 'https://is-this-legal.com/is-pseudoephedrine-legal-in-japan/'),"""
    ),
    ('pseudoephedrine', 'VN'): (
        """VN: c('Controlled precursor', 'CONTROLLED', 'low'),""",
        """VN: c('Ask by generic name', 'CONTROLLED', 'low', 'Controlled precursor.'),"""
    ),
    ('pseudoephedrine', 'TR'): (
        """TR: c('Controlled precursor', 'CONTROLLED', 'low')""",
        """TR: c('Ask by generic name', 'CONTROLLED', 'low', 'Controlled precursor.')"""
    ),
    ('amphetamine', 'GB'): (
        """GB: c('Not commonly used — UK ADHD stimulant therapy favors lisdexamfetamine (Elvanse) or methylphenidate', 'CONTROLLED', 'medium'),""",
        """GB: c('Not commonly prescribed', 'CONTROLLED', 'medium', 'UK ADHD stimulant therapy favors lisdexamfetamine (Elvanse) or methylphenidate instead.'),"""
    ),
    ('amphetamine', 'DE'): (
        """DE: c('Available but tightly controlled (Betäubungsmittelgesetz — German narcotics law)', 'CONTROLLED', 'medium'),""",
        """DE: c('Attentin', 'CONTROLLED', 'high', 'Attentin (dextroamphetamine, MEDICE) has been sold in Germany since 2011; tightly controlled under the Betäubungsmittelgesetz (German narcotics law).', 'https://medice.com/de-de/produkte/adhs-kinder-und-jugendliche/attentin-r'),"""
    ),
    ('amphetamine', 'FR'): (
        """FR: c('Amphetamine-based ADHD medication is not routinely prescribed in France', 'CONTROLLED', 'medium'),""",
        """FR: c('Not commonly prescribed', 'CONTROLLED', 'medium', 'Amphetamine-based ADHD medication is not routinely prescribed in France.'),"""
    ),
    ('amphetamine', 'MX'): (
        """MX: c('Controlled substance — import without authorization is risky', 'CONTROLLED', 'low'),""",
        """MX: c('Not commonly available', 'CONTROLLED', 'low', 'Controlled substance — import without authorization is risky.'),"""
    ),
    ('amphetamine', 'IN'): (
        """IN: c('Controlled substance under the NDPS Act', 'CONTROLLED', 'low'),""",
        """IN: c('Not commonly available', 'CONTROLLED', 'low', 'Controlled substance under the NDPS Act.'),"""
    ),
    ('amphetamine', 'VN'): (
        """VN: c('Controlled substance — import without authorization is risky', 'CONTROLLED', 'low'),""",
        """VN: c('Not commonly available', 'CONTROLLED', 'low', 'Controlled substance — import without authorization is risky.'),"""
    ),
    ('amphetamine', 'SG'): (
        """SG: c('Controlled substance under the Misuse of Drugs Act — Singapore enforces this very strictly', 'CONTROLLED', 'medium'),""",
        """SG: c('Not commonly available', 'CONTROLLED', 'medium', 'Controlled substance under the Misuse of Drugs Act — Singapore enforces this very strictly.'),"""
    ),
    ('amphetamine', 'MA'): (
        """MA: c('Controlled substance — import without authorization is risky', 'CONTROLLED', 'low'),""",
        """MA: c('Not commonly available', 'CONTROLLED', 'low', 'Controlled substance — import without authorization is risky.'),"""
    ),
    ('amphetamine', 'PT'): (
        """PT: c('Controlled substance', 'CONTROLLED', 'low'),""",
        """PT: c('Not commonly available', 'CONTROLLED', 'low', 'Controlled substance.'),"""
    ),
    ('amphetamine', 'TR'): (
        """TR: c('Controlled substance — import without authorization is risky', 'CONTROLLED', 'low')""",
        """TR: c('Not commonly available', 'CONTROLLED', 'low', 'Controlled substance — import without authorization is risky.')"""
    ),
    ('hydrocodone', 'CA'): (
        """CA: c('Sold, but tightly controlled', 'CONTROLLED', 'medium'),""",
        """CA: c('Sold generic', 'CONTROLLED', 'medium', 'Tightly controlled.'),"""
    ),
    ('hydrocodone', 'MX'): (
        """MX: c('Controlled substance requiring special prescription forms', 'CONTROLLED', 'low'),""",
        """MX: c('Not commonly available', 'CONTROLLED', 'low', 'Controlled substance requiring special prescription forms.'),"""
    ),
    ('hydrocodone', 'IN'): (
        """IN: c('Controlled substance under the NDPS Act', 'CONTROLLED', 'low'),""",
        """IN: c('Not commonly available', 'CONTROLLED', 'low', 'Controlled substance under the NDPS Act.'),"""
    ),
    ('hydrocodone', 'VN'): (
        """VN: c('Controlled substance — import without authorization is risky', 'CONTROLLED', 'low'),""",
        """VN: c('Not commonly available', 'CONTROLLED', 'low', 'Controlled substance — import without authorization is risky.'),"""
    ),
    ('hydrocodone', 'SG'): (
        """SG: c('Singapore is flagged repeatedly as one of the strictest destinations globally for opioid painkillers — confirm import rules before travel without exception', 'CONTROLLED', 'high', null, 'https://www.ncbi.nlm.nih.gov/books/NBK620937/'),""",
        """SG: c('Not commonly available', 'CONTROLLED', 'high', 'Singapore is flagged repeatedly as one of the strictest destinations globally for opioid painkillers — confirm import rules before travel without exception.', 'https://www.ncbi.nlm.nih.gov/books/NBK620937/'),"""
    ),
    ('hydrocodone', 'MA'): (
        """MA: c('Controlled substance — import without authorization is risky', 'CONTROLLED', 'low'),""",
        """MA: c('Not commonly available', 'CONTROLLED', 'low', 'Controlled substance — import without authorization is risky.'),"""
    ),
    ('hydrocodone', 'PT'): (
        """PT: c('Controlled substance', 'CONTROLLED', 'low'),""",
        """PT: c('Not commonly available', 'CONTROLLED', 'low', 'Controlled substance.'),"""
    ),
    ('hydrocodone', 'TR'): (
        """TR: c('Controlled substance — import without authorization is risky', 'CONTROLLED', 'low')""",
        """TR: c('Not commonly available', 'CONTROLLED', 'low', 'Controlled substance — import without authorization is risky.')"""
    ),
    ('tramadol', 'MX'): (
        """MX: c('Tramadol — controlled', 'CONTROLLED', 'low'),""",
        """MX: c('Sold generic', 'CONTROLLED', 'low', 'Controlled substance.'),"""
    ),
    ('alprazolam', 'SG'): (
        """SG: c('Controlled substance under the Misuse of Drugs Act', 'CONTROLLED', 'medium'),""",
        """SG: c('Xanax', 'CONTROLLED', 'high', 'HSA-registered (SIN01985P); controlled substance under the Misuse of Drugs Act.', 'https://www.ndf.gov.sg/about-drugs/product-information/sin01985p/'),"""
    ),
    ('alprazolam', 'TR'): (
        """TR: c('Xanax — controlled', 'CONTROLLED', 'low')""",
        """TR: c('Xanax', 'CONTROLLED', 'medium', 'Controlled substance.')"""
    ),
    ('methylphenidate', 'MX'): (
        """MX: c('Controlled substance requiring special prescription forms', 'CONTROLLED', 'low'),""",
        """MX: c('Concerta / Ritalina', 'CONTROLLED', 'medium', 'Controlled substance requiring special prescription forms; Tradea LP is a real local extended-release alternative too.'),"""
    ),
    ('methylphenidate', 'IN'): (
        """IN: c('Controlled substance under the NDPS Act', 'CONTROLLED', 'low'),""",
        """IN: c('Concerta / Addwize', 'CONTROLLED', 'medium', 'Controlled substance under the NDPS Act; Addwize (Lupin) is a real, confirmed Indian brand.'),"""
    ),
    ('oxycodone', 'MX'): (
        """MX: c('Controlled substance requiring special prescription forms', 'CONTROLLED', 'low'),""",
        """MX: c('OxyContin', 'CONTROLLED', 'medium', 'Brand confirmed sold by Purdue in Mexico; controlled substance requiring special prescription forms.'),"""
    ),
    ('oxycodone', 'IN'): (
        """IN: c('Controlled substance under the NDPS Act', 'CONTROLLED', 'low'),""",
        """IN: c('Not commonly available', 'CONTROLLED', 'low', 'Controlled substance under the NDPS Act; oxycodone specifically is rarely stocked — codeine and tramadol are the opioids more commonly available in India.'),"""
    ),
    ('oxycodone', 'PT'): (
        """PT: c('Controlled substance', 'CONTROLLED', 'low'),""",
        """PT: c('Oxygesic / Olbete', 'CONTROLLED', 'medium', 'Original OxyContin was withdrawn from the Portuguese market around 2019 due to commercial unviability — the same pattern seen in Canada — but oxycodone remains available under other brand names.', 'https://observador.pt/2019/03/28/porque-e-que-os-museus-abriram-guerra-contra-os-sacklers-a-familia-que-e-dona-do-oxycontin/'),"""
    ),
    ('oxycodone', 'SG'): (
        """SG: c('Singapore is flagged repeatedly as one of the strictest destinations globally for opioid painkillers — confirm import rules before travel without exception', 'CONTROLLED', 'high', null, 'https://www.ncbi.nlm.nih.gov/books/NBK620937/'),""",
        """SG: c('OxyContin Neo / OxyNorm', 'CONTROLLED', 'high', 'HSA-registered brands confirmed (National Drug Formulary); Singapore is flagged repeatedly as one of the strictest destinations globally for opioid painkillers — confirm import rules before travel without exception.', 'https://www.ndf.gov.sg/about-drugs/product-information/sin13079p/'),"""
    ),
}

applied = 0
missing = []
for (drug_id, cc), (old, new) in FIXES.items():
    n = drugs_src.count(old)
    if n != 1:
        missing.append((drug_id, cc, n))
        continue
    drugs_src = drugs_src.replace(old, new)
    applied += 1

print(f"Applied {applied} / {len(FIXES)} fixes")
if missing:
    print("MISSING/AMBIGUOUS:")
    for m in missing:
        print(" ", m)

content = content[:start] + drugs_src + content[end:]
with open(PATH, 'w') as f:
    f.write(content)
print("File written.")
