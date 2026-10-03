import re, sys, json

src = open('/Users/detrieu/.claude/jobs/963fa398/tmp/drugs_data.js').read()
# strip the module.exports line we appended
src = src.split("module.exports")[0]

pos = 0
n = len(src)

def skip_ws(p):
    while p < n:
        c = src[p]
        if c in ' \t\n\r':
            p += 1
        elif c == '/' and p+1 < n and src[p+1] == '/':
            while p < n and src[p] != '\n':
                p += 1
        else:
            break
    return p

def parse_value(p):
    p = skip_ws(p)
    c = src[p]
    if c == "'" or c == '"':
        return parse_string(p)
    if c == '{':
        return parse_object(p)
    if c == '[':
        return parse_array(p)
    if c.isdigit() or c == '-':
        return parse_number(p)
    # identifier / keyword / function call
    return parse_ident_or_call(p)

def parse_string(p):
    quote = src[p]
    p += 1
    out = []
    while src[p] != quote:
        if src[p] == '\\':
            nxt = src[p+1]
            mapping = {'n':'\n','t':'\t','\\':'\\', "'":"'", '"':'"'}
            out.append(mapping.get(nxt, nxt))
            p += 2
        else:
            out.append(src[p])
            p += 1
    p += 1
    return ''.join(out), p

def parse_number(p):
    start = p
    while p < n and (src[p].isdigit() or src[p] in '.-'):
        p += 1
    return float(src[start:p]), p

def parse_ident(p):
    start = p
    while p < n and (src[p].isalnum() or src[p] == '_'):
        p += 1
    return src[start:p], p

def parse_ident_or_call(p):
    ident, p = parse_ident(p)
    p = skip_ws(p)
    if p < n and src[p] == '(':
        # function call
        p += 1
        args = []
        p = skip_ws(p)
        if src[p] != ')':
            while True:
                v, p = parse_value(p)
                args.append(v)
                p = skip_ws(p)
                if src[p] == ',':
                    p += 1
                    p = skip_ws(p)
                    continue
                break
        assert src[p] == ')'
        p += 1
        return {'__call__': ident, 'args': args}, p
    if ident == 'null':
        return None, p
    if ident == 'true':
        return True, p
    if ident == 'false':
        return False, p
    return ident, p

def parse_array(p):
    assert src[p] == '['
    p += 1
    out = []
    p = skip_ws(p)
    if src[p] == ']':
        return out, p+1
    while True:
        v, p = parse_value(p)
        out.append(v)
        p = skip_ws(p)
        if src[p] == ',':
            p += 1
            p = skip_ws(p)
            if src[p] == ']':
                break
            continue
        break
    assert src[p] == ']'
    return out, p+1

def parse_object(p):
    assert src[p] == '{'
    p += 1
    out = {}
    p = skip_ws(p)
    if src[p] == '}':
        return out, p+1
    while True:
        p = skip_ws(p)
        if src[p] in "'\"":
            key, p = parse_string(p)
        else:
            key, p = parse_ident(p)
        p = skip_ws(p)
        assert src[p] == ':', f"expected : at {p}, got {src[p:p+20]!r}"
        p += 1
        val, p = parse_value(p)
        out[key] = val
        p = skip_ws(p)
        if src[p] == ',':
            p += 1
            p = skip_ws(p)
            if src[p] == '}':
                break
            continue
        break
    assert src[p] == '}', f"expected }} at {p}, got {src[p:p+20]!r}"
    return out, p+1

def find_assignment(varname):
    m = re.search(r'var\s+' + varname + r'\s*=\s*', src)
    return m.end()

start = find_assignment('COUNTRIES')
COUNTRIES, p = parse_value(start)

start = find_assignment('DRUGS')
DRUGS, p = parse_value(start)

def resolve(v):
    if isinstance(v, dict) and '__call__' in v:
        args = v['args']
        args = args + [None]*(5-len(args))
        brand, status, confidence, note, source = args[:5]
        return {'brand': brand, 'status': status, 'confidence': confidence or 'high', 'note': note, 'source': source}
    if isinstance(v, dict):
        return {k: resolve(x) for k, x in v.items()}
    if isinstance(v, list):
        return [resolve(x) for x in v]
    return v

DRUGS = resolve(DRUGS)
COUNTRIES = resolve(COUNTRIES)

json.dump({'COUNTRIES': COUNTRIES, 'DRUGS': DRUGS}, open('/Users/detrieu/.claude/jobs/963fa398/tmp/drugs_parsed.json','w'), indent=2)
print("Parsed", len(DRUGS), "drugs,", len(COUNTRIES), "countries")
