import re, base64, urllib.request

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def latin_url(css_text, style, weight):
    # find the block matching style+weight whose unicode-range is the Latin subset (U+0000-00FF ... FFFD)
    blocks = css_text.split('@font-face')[1:]
    for b in blocks:
        if f"font-style: {style};" in b and f"font-weight: {weight};" in b and "U+0000-00FF" in b:
            m = re.search(r"src: url\((https://[^)]+\.woff2)\)", b)
            if m:
                return m.group(1)
    return None

def fetch_b64(url, outpath):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    data = urllib.request.urlopen(req, timeout=20).read()
    b64 = base64.b64encode(data).decode('ascii')
    with open(outpath, 'w') as f:
        f.write(b64)
    print(f"wrote {outpath} ({len(data)} bytes -> {len(b64)} b64 chars)")

with open('/tmp/spectral.css') as f:
    spectral = f.read()
with open('/tmp/pubsans.css') as f:
    pubsans = f.read()
with open('/tmp/plexmono.css') as f:
    plexmono = f.read()

jobs = [
    (latin_url(spectral, 'normal', '400'), 'fonts/spectral_400.b64'),
    (latin_url(spectral, 'normal', '600'), 'fonts/spectral_600.b64'),
    (latin_url(spectral, 'italic', '400'), 'fonts/spectral_i400.b64'),
    (latin_url(spectral, 'italic', '500'), 'fonts/spectral_i500.b64'),
    (latin_url(pubsans, 'normal', '400'), 'fonts/pubsans_400.b64'),
    (latin_url(plexmono, 'normal', '400'), 'fonts/plexmono_400.b64'),
    (latin_url(plexmono, 'normal', '500'), 'fonts/plexmono_500.b64'),
]

for url, out in jobs:
    if not url:
        print(f"MISSING URL for {out}")
        continue
    fetch_b64(url, out)
