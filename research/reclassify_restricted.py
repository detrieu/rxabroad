import re

with open('/private/tmp/claude-501/-Users-detrieu-claude-lab/7019b86d-4407-459f-b12a-7a56eedc96db/scratchpad/formulary_template.html') as f:
    content = f.read()

start = content.index('var DRUGS = [')
end = content.index('\n  ];', start)
drugs_src = content[start:end]

# Exact line replacements (old -> new). Only for entries needing content changes (Japan corrections).
# All other RESTRICTED lines get a simple status-token swap based on classification rules below.
EXACT_REPLACEMENTS = {
    """JP: c('Banned outright under Japan’s Stimulants Control Law — not just restricted', 'RESTRICTED', 'high', 'A foreign prescription does not make it legal. Seizure, fines, or detention are all real possibilities. Sudafed PE (phenylephrine) is a different drug and is generally fine to bring instead.', 'https://www.accessible-japan.com/list-of-banned-and-restricted-medications-in-japan-late-2025-early-2026-guide/'),""":
    """JP: c('Technically allowed in small quantities, but treat with caution', 'CONTROLLED', 'medium', 'Correction: previously listed as an outright ban. Pseudoephedrine is a Stimulants Raw Material under Japanese law — products at 10% concentration or less are exempt up to a 2-month personal supply, but higher concentrations or larger quantities require advance Ministry of Health permission. Since most travelers cannot easily verify their product’s exact concentration, Sudafed PE (phenylephrine) remains the simpler, safer choice to bring instead.', 'https://is-this-legal.com/is-pseudoephedrine-legal-in-japan/'),""",

    """JP: c('Banned entirely in Japan', 'RESTRICTED', 'high', 'Do not bring tramadol into Japan under any circumstances — this is one of the more commonly cited "surprise" bans for travelers with chronic pain.', 'https://theconversation.com/what-is-tramadol-how-dangerous-is-it-and-where-is-it-illegal-86982'),""":
    """JP: c('Sold generic', 'CONTROLLED', 'medium', 'Correction: previously listed as banned outright, based on a general article about tramadol bans across many countries. More specific research found tramadol is actually classified as a general (non-scheduled) medicine in Japan — up to a one-month personal supply needs no certificate at all; above that, a standard Yunyu Kakunin-sho (import certificate) applies, the same process used for many ordinary prescription medicines.', 'https://medx.it.com/is-tramadol-banned-in-japan-navigating-medication-import-rules'),""",

    """JP: c('Solanax / Constan — regulated as a psychotropic; import limits and paperwork apply similarly to other controlled psychiatric medications', 'RESTRICTED', 'medium'),""":
    """JP: c('Solanax / Constan', 'CONTROLLED', 'high', 'Regulated as a psychotropic; the personal-supply exemption threshold is drug-specific and unusually low — 72mg total (not the general 30-day rule) — above which a Yunyu Kakunin-sho import certificate is required in advance.', 'https://www.us.emb-japan.go.jp/itpr_en/bringing-medications-to-japan.html'),""",
}

count_exact = 0
for old, new in EXACT_REPLACEMENTS.items():
    n = drugs_src.count(old)
    assert n == 1, f"expected exactly 1 match, got {n} for: {old[:80]}..."
    drugs_src = drugs_src.replace(old, new)
    count_exact += 1
print(f"Applied {count_exact} exact JP text corrections")

# Oxycodone/hydrocodone JP share identical old text -- handle via block-scoped replacement.
drug_blocks = re.split(r"(\n    \{\n      id: )", drugs_src)
# drug_blocks alternates: [prefix, 'id: ', block, 'id: ', block, ...] due to capturing group split
rebuilt = [drug_blocks[0]]
i = 1
narcotic_old = """JP: c('Opioid painkillers face very strict import controls in Japan — confirm with the Japanese embassy before travel regardless of quantity', 'RESTRICTED', 'medium'),"""
narcotic_new_tpl = """JP: c('Opioid painkillers face strict import controls in Japan', 'CONTROLLED', 'medium', 'As a narcotic, {drug} requires advance permission (a Yunyu Kakunin-sho import certificate) from a Regional Bureau of Health and Welfare for any quantity — apply at least 2 weeks ahead with a prescription copy and doctor’s letter. There is no small-quantity exemption like there is for psychotropics such as methylphenidate.', 'https://www.us.emb-japan.go.jp/itpr_en/bringing-medications-to-japan.html'),"""

narcotic_fixed = 0
while i < len(drug_blocks):
    marker = drug_blocks[i]
    block = drug_blocks[i+1]
    idm = re.match(r"'([a-zA-Z0-9_]+)'", block)
    drug_id = idm.group(1) if idm else None
    if drug_id == 'oxycodone' and narcotic_old in block:
        block = block.replace(narcotic_old, narcotic_new_tpl.format(drug='oxycodone'))
        narcotic_fixed += 1
    elif drug_id == 'hydrocodone' and narcotic_old in block:
        block = block.replace(narcotic_old, narcotic_new_tpl.format(drug='hydrocodone'))
        narcotic_fixed += 1
    rebuilt.append(marker)
    rebuilt.append(block)
    i += 2
drugs_src = ''.join(rebuilt)
print(f"Applied {narcotic_fixed} narcotic (oxycodone/hydrocodone) JP corrections")

# Now classify all remaining 'RESTRICTED' tokens.
BANNED_MARKERS = [
    "JP: c('Effectively banned",
    "MX: c('Banned since 2008",
]
PHARMACY_MARKERS = [
    "US: c('Sudafed', 'RESTRICTED'",
    "GB: c('Sudafed', 'RESTRICTED'",
    "CA: c('Sudafed', 'RESTRICTED'",
    "SG: c('Pharmacy-only with purchase limits', 'RESTRICTED'",
]

lines = drugs_src.split('\n')
n_banned = n_pharmacy = n_controlled = 0
for idx, line in enumerate(lines):
    if "'RESTRICTED'" not in line:
        continue
    if any(m in line for m in BANNED_MARKERS):
        lines[idx] = line.replace("'RESTRICTED'", "'BANNED'")
        n_banned += 1
    elif any(m in line for m in PHARMACY_MARKERS):
        lines[idx] = line.replace("'RESTRICTED'", "'PHARMACY'")
        n_pharmacy += 1
    else:
        lines[idx] = line.replace("'RESTRICTED'", "'CONTROLLED'")
        n_controlled += 1
drugs_src = '\n'.join(lines)
print(f"Reclassified: {n_banned} -> BANNED, {n_pharmacy} -> PHARMACY, {n_controlled} -> CONTROLLED")

remaining = drugs_src.count("'RESTRICTED'")
print(f"Remaining RESTRICTED tokens: {remaining}")
assert remaining == 0

content = content[:start] + drugs_src + content[end:] + '' if False else content[:start] + drugs_src + content[end:]
with open('/private/tmp/claude-501/-Users-detrieu-claude-lab/7019b86d-4407-459f-b12a-7a56eedc96db/scratchpad/formulary_template.html', 'w') as f:
    f.write(content)
print("File written.")
