#!/usr/bin/env python3
"""Fix mojibake encoding in TSX files."""
import sys

def fix_file(path):
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()

    # Map garbled UTF-8-as-Latin-1 sequences back to correct chars
    # These are the actual byte sequences that appear when UTF-8 is misread
    fixes = {
        '\u00e2\u0082\u00ac': '\u20ac',  # euro sign €
        '\u00e2\u0086\u2019': '\u2192',  # right arrow →
        '\u00e2\u0080\u0094': '\u2014',  # em dash —
        '\u00e2\u0080\u2122': '\u2019',  # right single quote '
        '\u00e2\u0080\u009c': '\u201c',  # left double quote "
        '\u00e2\u0080\u009d': '\u201d',  # right double quote "
        '\u00c2\u00b7': '\u00b7',        # middle dot ·
        '\u00c2\u00a0': '\u00a0',        # non-breaking space
        # Garbled emoji patterns (UTF-8 bytes read as latin-1 then re-encoded)
        '\ufffd\ufffd\ufffd': '',         # replacement chars
    }

    # Simpler approach: replace the visible garbled text patterns
    simple_fixes = [
        # currency
        ('â\x82¬', '€'),
        ('â€"', '\u2014'),  # em dash
        ('â€™', '\u2019'),  # right quote
        ('â€œ', '\u201c'),  # left quote
        ('â€\x9d', '\u201d'),  # right quote
        ('â†\x92', '\u2192'),  # arrow
        ('Â·', '\u00b7'),    # middle dot
        ('Â£', '\u00a3'),    # pound
        ('â€¢', '\u2022'),   # bullet
        ('Ã©', '\u00e9'),    # é
        ('Ã¨', '\u00e8'),    # è
        # Countdown map labels - replace with clean text
        ("'now': '\ufffd\ufffd\ufffd Automate NOW'", "'now': '\u26a1 Automate NOW'"),
        ("'12-24': '\ufffd\ufffd\ufffd 12\ufffd\ufffd\ufffd24 months'", "'12-24': '\U0001f7e0 12\u201324 months'"),
        ("'24-48': '\ufffd\ufffd\ufffd 24\ufffd\ufffd\ufffd48 months'", "'24-48': '\U0001f7e1 24\u201348 months'"),
        ("'48+': '\ufffd\ufffd\ufffd 48+ months'", "'48+': '\U0001f552 48+ months'"),
    ]

    fixed = text
    for bad, good in simple_fixes:
        fixed = fixed.replace(bad, good)

    # Also fix the countdownMap specific patterns by regex
    import re
    # Replace garbled emoji in countdownMap values with text equivalents
    fixed = re.sub(
        r"'now':\s*'[^']*Automate NOW'",
        "'now': '\u26a1 Automate NOW'",
        fixed
    )
    fixed = re.sub(
        r"'12-24':\s*'[^']*12[^']*24 months'",
        "'12-24': '\U0001f7e0 12\u201324 months'",
        fixed
    )
    fixed = re.sub(
        r"'24-48':\s*'[^']*24[^']*48 months'",
        "'24-48': '\U0001f7e1 24\u201348 months'",
        fixed
    )
    fixed = re.sub(
        r"'48\+':\s*'[^']*48\+ months'",
        "'48+': '\U0001f552 48+ months'",
        fixed
    )

    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(fixed)

    changed = sum(1 for a, b in zip(text, fixed) if a != b)
    print(f"Fixed {path}: {changed} chars changed")

if __name__ == '__main__':
    for p in sys.argv[1:]:
        fix_file(p)
