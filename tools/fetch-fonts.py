"""Downloads the site's fonts (Latin subset, woff2) into public/fonts so they are self-hosted and can be preloaded.
Run once from the repo root: python3 tools/fetch-fonts.py. All fonts are OFL-licensed Google Fonts."""
import os
import re
import urllib.parse
import urllib.request

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'fonts')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

# (file name, css2 family query, optional text subset)
FONTS = [
    ('geist-400', 'Geist:wght@400', None),
    ('geist-500', 'Geist:wght@500', None),
    ('geist-600', 'Geist:wght@600', None),
    ('geist-700', 'Geist:wght@700', None),
    ('geist-mono-400', 'Geist+Mono:wght@400', None),
    ('geist-mono-500', 'Geist+Mono:wght@500', None),
    ('barlow-condensed-400', 'Barlow+Condensed:wght@400', None),
    ('barlow-condensed-600', 'Barlow+Condensed:wght@600', None),
    ('barlow-condensed-700', 'Barlow+Condensed:wght@700', None),
    ('dela-gothic-one-hit-built', 'Dela+Gothic+One', 'hit.built'),
    ('gaegu-700-logo', 'Gaegu:wght@700', "hey, I'm Justin :)"),
    ('bebas-neue-400', 'Bebas+Neue', None),
    ('inter-400', 'Inter:wght@400', None),
    ('inter-600', 'Inter:wght@600', None),
    ('jetbrains-mono-400', 'JetBrains+Mono:wght@400', None),
    ('jetbrains-mono-600', 'JetBrains+Mono:wght@600', None),
]


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req) as r:
        return r.read()


os.makedirs(OUT, exist_ok=True)
for name, family, text in FONTS:
    url = f'https://fonts.googleapis.com/css2?family={family}&display=swap'
    if text:
        url += '&text=' + urllib.parse.quote(text)
    css = get(url).decode()
    if text:
        src = re.search(r'url\((https://[^)]+)\)', css).group(1)
    else:
        block = re.search(r'/\* latin \*/\s*@font-face\s*{[^}]*}', css).group(0)
        src = re.search(r'url\((https://[^)]+)\)', block).group(1)
    data = get(src)
    open(os.path.join(OUT, name + '.woff2'), 'wb').write(data)
    print(f'{name}.woff2  {len(data) // 1024} KB')
