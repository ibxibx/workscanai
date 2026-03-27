#!/usr/bin/env python3
"""Fix remaining specific garbled strings in dashboard results page."""
import sys, re

path = r'C:\Users\damya\Projects\workscanai\frontend\src\app\dashboard\results\[id]\page.tsx'
with open(path, 'rb') as f:
    raw = f.read()

text = raw.decode('utf-8')

# Fix 1: en-dash in countdown labels (shows as euro-sign + quote)
# '12€"24' should be '12\u201324'  (en-dash)
# The bytes: \xe2\x82\xac\xe2\x80\x9d (euro + right-double-quote = garbled en-dash)
fixes_str = [
    ('12\u20ac\u201d24', '12\u201324'),   # 12€"24 -> 12–24
    ('24\u20ac\u201d48', '24\u201348'),   # 24€"48 -> 24–48
    ('3\u20ac\u201d6',   '3\u20136'),     # 3€"6 -> 3–6
    ('6\u20ac\u201d12',  '6\u201312'),    # 6€"12 -> 6–12
    # Puzzle piece emoji (🧩 = \U0001f9e9)
    ('\u00f0\u0178\xa7\xa9', '\U0001f9e9'),   # ðŸ§©
    ('\u00f0\u0178\x9f\xa9', '\U0001f9e9'),   # variant
    # Shuffle emoji (🔀 = \U0001f500)
    ('\u00f0\u0178\x94\x80', '\U0001f500'),   # ðŸ"€
    ('\u00f0\u0178\x9f\x92', '\U0001f9e0'),   # 🧠 brain
    # Clock emoji (🕒 = \U0001f552)  
    ('\u00f0\u0178\x95\x92', '\U0001f552'),   # ðŸ•'
    # Rocket (🚀)
    ('\u00f0\u0178\x9a\x80', '\U0001f680'),
    # Check mark green (✅)
    ('\u00e2\x9c\x85', '\u2705'),
    # Warning (⚠️)
    ('\u00e2\x9a\xa0', '\u26a0'),
]

fixed = text
total = 0
for bad, good in fixes_str:
    n = fixed.count(bad)
    if n:
        fixed = fixed.replace(bad, good)
        total += n
        sys.stdout.buffer.write(('  Fixed %dx: %r -> %r\n' % (n, bad[:10], good[:10])).encode('utf-8'))

sys.stdout.buffer.write(('Total fixes: %d\n' % total).encode())

# Verify no remaining issues
remaining = [(i+1, l.strip()[:80]) for i, l in enumerate(fixed.split('\n'))
             if '\u20ac\u201d' in l or '\u00f0\u0178' in l]
sys.stdout.buffer.write(('Still garbled lines: %d\n' % len(remaining)).encode())
for ln, l in remaining[:5]:
    sys.stdout.buffer.write(('%d: %s\n' % (ln, l)).encode('utf-8', errors='replace'))

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(fixed)
sys.stdout.buffer.write(b'Saved.\n')
