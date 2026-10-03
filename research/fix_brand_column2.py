import re

PATH = '/private/tmp/claude-501/-Users-detrieu-claude-lab/7019b86d-4407-459f-b12a-7a56eedc96db/scratchpad/formulary_template.html'
with open(PATH) as f:
    content = f.read()

start = content.index('var DRUGS = [')
end = content.index('\n  ];', start)
drugs_src = content[start:end]

FIXES = {
    ('amphetamine', 'IN'): (
        """IN: c('Controlled substance under the NDPS Act', 'CONTROLLED', 'low'),""",
        """IN: c('Not commonly available', 'CONTROLLED', 'low', 'Controlled substance under the NDPS Act.'),"""
    ),
    ('amphetamine', 'VN'): (
        """VN: c('Controlled substance — import without authorization is risky', 'CONTROLLED', 'low'),""",
        """VN: c('Not commonly available', 'CONTROLLED', 'low', 'Controlled substance — import without authorization is risky.'),"""
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
    ('alprazolam', 'SG'): (
        """SG: c('Controlled substance under the Misuse of Drugs Act', 'CONTROLLED', 'medium'),""",
        """SG: c('Xanax', 'CONTROLLED', 'high', 'HSA-registered (SIN01985P); controlled substance under the Misuse of Drugs Act.', 'https://www.ndf.gov.sg/about-drugs/product-information/sin01985p/'),"""
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

# Block-scoped: split by drug id
blocks = re.split(r"(\n    \{\n      id: )", drugs_src)
rebuilt = [blocks[0]]
i = 1
applied = 0
missing = []
by_drug = {}
for (drug_id, cc), pair in FIXES.items():
    by_drug.setdefault(drug_id, {})[cc] = pair

while i < len(blocks):
    marker = blocks[i]
    block = blocks[i+1]
    idm = re.match(r"'([a-zA-Z0-9_]+)'", block)
    drug_id = idm.group(1) if idm else None
    if drug_id in by_drug:
        for cc, (old, new) in by_drug[drug_id].items():
            n = block.count(old)
            if n == 1:
                block = block.replace(old, new)
                applied += 1
            elif n == 0:
                pass  # already applied in a prior run
            else:
                missing.append((drug_id, cc, n))
    rebuilt.append(marker)
    rebuilt.append(block)
    i += 2

drugs_src = ''.join(rebuilt)
print(f"Applied {applied} fixes this run")
if missing:
    print("AMBIGUOUS (n != 1):")
    for m in missing:
        print(" ", m)

remaining_generic = drugs_src.count("'Controlled substance under the NDPS Act', 'CONTROLLED'")
remaining_generic2 = drugs_src.count("import without authorization is risky', 'CONTROLLED'")
print("Remaining un-fixed NDPS-style brand text:", remaining_generic)
print("Remaining un-fixed import-risk brand text:", remaining_generic2)

content = content[:start] + drugs_src + content[end:]
with open(PATH, 'w') as f:
    f.write(content)
print("File written.")
