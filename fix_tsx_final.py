"""
Definitive encoding fix for page.tsx
Reads as bytes, fixes all mojibake sequences, writes clean UTF-8.
"""
path = r'C:\Users\damya\Projects\workscanai\frontend\src\app\dashboard\results\[id]\page.tsx'

raw = open(path, 'rb').read()
# Remove BOM
if raw.startswith(b'\xef\xbb\xbf'):
    raw = raw[3:]

# Decode as UTF-8 (errors='replace' to catch any truly broken bytes)
text = raw.decode('utf-8', errors='replace')

# All the unicode chars present and what to replace them with
replacements = {
    '\u2014': '--',    # em dash —
    '\u2013': '-',     # en dash –
    '\u2018': "'",     # left single quote
    '\u2019': "'",     # right single quote
    '\u201c': '"',     # left double quote
    '\u201d': '"',     # right double quote
    '\u00b7': '-',     # middle dot ·
    '\u2192': '->',    # right arrow →
    '\u20ac': 'EUR',   # euro sign (in comments/strings only; JSX € literals use \u20ac)
    '\ufeff': '',      # BOM
    # Emoji that should be text labels
    '\u26a1': 'NOW',       # ⚡
    '\U0001f7e0': '',      # 🟠
    '\U0001f7e1': '',      # 🟡
    '\U0001f7e2': '',      # 🟢
    '\U0001f9e0': '',      # 🧠
    '\U0001f9e9': '',      # 🧩
    '\U0001f500': '',      # 🔀
    '\U0001f4a1': '',      # 💡
    '\U0001f3af': '',      # 🎯
    '\U0001f527': '',      # 🔧
    # Box drawing / other symbols used as decorators
    '\u2550': '=',     # ═
    '\u2022': '-',     # •
    '\ufffd': '',      # replacement char (from errors='replace')
    # Any remaining high codepoints get stripped below
}

for old, new in replacements.items():
    text = text.replace(old, new)

# Strip any remaining non-ASCII (> 127) that aren't intentional
# Keep: nothing — we want pure ASCII source
cleaned_lines = []
for line in text.split('\n'):
    cleaned = ''.join(c if ord(c) < 128 else ' ' for c in line)
    # Collapse multiple spaces from emoji removal
    import re
    cleaned = re.sub(r'  +', ' ', cleaned).rstrip()
    cleaned_lines.append(cleaned)

text = '\n'.join(cleaned_lines)

# Verify
remaining = [(i+1, l) for i, l in enumerate(text.split('\n')) if any(ord(c) > 127 for c in l)]
print(f'Non-ASCII lines remaining: {len(remaining)}')

open(path, 'w', encoding='utf-8', newline='\n').write(text)
print('Written.')
