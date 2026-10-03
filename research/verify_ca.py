import json, urllib.request, urllib.parse, time, sys

API = "https://health-products.canada.ca/api/drug/{}/?lang=en&type=json&{}"

def get(endpoint, **params):
    qs = urllib.parse.urlencode(params)
    url = API.format(endpoint, qs)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                data = r.read().decode("utf-8")
                return json.loads(data) if data.strip() else []
        except Exception as e:
            if attempt == 2:
                return {"error": str(e)}
            time.sleep(1)

# id -> (our generic label, DPD ingredient search term(s) to try in order)
DRUGS = [
    ("paracetamol", "Paracetamol", ["acetaminophen"]),
    ("ibuprofen", "Ibuprofen", ["ibuprofen"]),
    ("loratadine", "Loratadine", ["loratadine"]),
    ("cetirizine", "Cetirizine", ["cetirizine"]),
    ("diphenhydramine", "Diphenhydramine", ["diphenhydramine"]),
    ("loperamide", "Loperamide", ["loperamide"]),
    ("omeprazole", "Omeprazole", ["omeprazole"]),
    ("pseudoephedrine", "Pseudoephedrine", ["pseudoephedrine"]),
    ("melatonin", "Melatonin", ["melatonin"]),
    ("dimenhydrinate", "Dimenhydrinate", ["dimenhydrinate"]),
    ("amoxicillin", "Amoxicillin", ["amoxicillin"]),
    ("metformin", "Metformin", ["metformin"]),
    ("sertraline", "Sertraline", ["sertraline"]),
    ("albuterol", "Salbutamol", ["salbutamol"]),
    ("atorvastatin", "Atorvastatin", ["atorvastatin"]),
    ("levothyroxine", "Levothyroxine", ["levothyroxine"]),
    ("lisinopril", "Lisinopril", ["lisinopril"]),
    ("amlodipine", "Amlodipine", ["amlodipine"]),
    ("metoprolol", "Metoprolol", ["metoprolol"]),
    ("losartan", "Losartan", ["losartan"]),
    ("gabapentin", "Gabapentin", ["gabapentin"]),
    ("rosuvastatin", "Rosuvastatin", ["rosuvastatin"]),
    ("pantoprazole", "Pantoprazole", ["pantoprazole"]),
    ("escitalopram", "Escitalopram", ["escitalopram"]),
    ("amphetamine", "Amphetamine / Dextroamphetamine", ["dextroamphetamine", "amphetamine"]),
    ("hydrochlorothiazide", "Hydrochlorothiazide", ["hydrochlorothiazide"]),
    ("bupropion", "Bupropion", ["bupropion"]),
    ("fluoxetine", "Fluoxetine", ["fluoxetine"]),
    ("semaglutide", "Semaglutide", ["semaglutide"]),
    ("montelukast", "Montelukast", ["montelukast"]),
    ("trazodone", "Trazodone", ["trazodone"]),
    ("simvastatin", "Simvastatin", ["simvastatin"]),
    ("tamsulosin", "Tamsulosin", ["tamsulosin"]),
    ("hydrocodone", "Hydrocodone / Paracetamol combination", ["hydrocodone"]),
    ("fluticasone", "Fluticasone", ["fluticasone"]),
    ("meloxicam", "Meloxicam", ["meloxicam"]),
    ("apixaban", "Apixaban", ["apixaban"]),
    ("furosemide", "Furosemide", ["furosemide"]),
    ("insulin_glargine", "Insulin Glargine", ["insulin glargine"]),
    ("duloxetine", "Duloxetine", ["duloxetine"]),
    ("famotidine", "Famotidine", ["famotidine"]),
    ("empagliflozin", "Empagliflozin", ["empagliflozin"]),
    ("carvedilol", "Carvedilol", ["carvedilol"]),
    ("tramadol", "Tramadol", ["tramadol"]),
    ("alprazolam", "Alprazolam", ["alprazolam"]),
    ("prednisone", "Prednisone", ["prednisone"]),
    ("clopidogrel", "Clopidogrel", ["clopidogrel"]),
    ("aspirin", "Acetylsalicylic acid (Aspirin)", ["acetylsalicylic acid", "aspirin"]),
    ("oxycodone", "Oxycodone", ["oxycodone"]),
    ("methylphenidate", "Methylphenidate", ["methylphenidate"]),
]

report = []

for id_, generic, terms in DRUGS:
    ai_results = []
    used_term = None
    for term in terms:
        res = get("activeingredient", ingredientname=term)
        if isinstance(res, list) and res:
            ai_results = res
            used_term = term
            break
    if not ai_results:
        report.append({"id": id_, "generic": generic, "error": "NO_INGREDIENT_MATCH", "terms_tried": terms})
        continue

    drug_codes = list({r["drug_code"] for r in ai_results})
    # cap to avoid huge fan-out; sample up to 40 codes
    drug_codes = drug_codes[:40]

    products = []
    for dc in drug_codes:
        prod = get("drugproduct", id=dc)
        status = get("status", id=dc)
        sched = get("schedule", id=dc)
        if isinstance(prod, dict) and "brand_name" in prod:
            st = status.get("status") if isinstance(status, dict) else None
            schednames = [s.get("schedule_name") for s in sched] if isinstance(sched, list) else []
            products.append({
                "drug_code": dc,
                "brand_name": prod.get("brand_name"),
                "company": prod.get("company_name"),
                "status": st,
                "schedules": schednames,
            })
        time.sleep(0.05)

    marketed = [p for p in products if p["status"] == "Marketed"]
    pool = marketed if marketed else products

    brands = {}
    for p in pool:
        b = p["brand_name"]
        brands.setdefault(b, []).append(p)

    top_brands = sorted(brands.items(), key=lambda kv: -len(kv[1]))[:6]

    all_schedules = set()
    for p in pool:
        all_schedules.update(p["schedules"])

    report.append({
        "id": id_,
        "generic": generic,
        "search_term_used": used_term,
        "num_products_marketed": len(marketed),
        "num_products_total": len(products),
        "top_brands": [{"brand": b, "count": len(ps), "companies": list({x['company'] for x in ps})[:3]} for b, ps in top_brands],
        "schedules_seen": sorted(all_schedules),
    })
    print(f"done: {id_}", file=sys.stderr)

with open("/Users/detrieu/.claude/jobs/963fa398/tmp/ca_verification_report.json", "w") as f:
    json.dump(report, f, indent=2)

print("WROTE REPORT", len(report), "entries")
