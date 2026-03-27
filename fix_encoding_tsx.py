"""
Fix encoding issues in the dashboard results page.tsx:
- Remove BOM
- Replace smart punctuation with ASCII
- Replace emoji label prefixes with clean text
- Fix mojibake sequences from the corrupted gear/settings emoji
"""
import re

path = r'C:\Users\damya\Projects\workscanai\frontend\src\app\dashboard\results\[id]\page.tsx'

raw = open(path, 'rb').read()
if raw.startswith(b'\xef\xbb\xbf'):
    raw = raw[3:]
text = raw.decode('utf-8', errors='replace')

# --- Specific targeted replacements (order matters) ---

# 1. Mojibake gear emoji sequences that produce âš™ in the browser
#    These are the corrupted bytes that appear as â\x81\x9aâ„¢ etc.
#    Replace the whole section header strings that use them:
text = text.replace('\xe2\u0161\u2122', '')   # corrupted ⚙ -> remove
text = text.replace('\xe2\u2022\x90', '')      # corrupted box drawing -> remove

# 2. Smart quotes -> straight quotes
text = text.replace('\u2018', "'")
text = text.replace('\u2019', "'")
text = text.replace('\u201c', '"')
text = text.replace('\u201d', '"')

# 3. Dashes
text = text.replace('\u2014', '--')   # em dash
text = text.replace('\u2013', '-')    # en dash

# 4. Middle dot
text = text.replace('\u00b7', '-')

# 5. BOM
text = text.replace('\ufeff', '')

# 6. Euro sign in JSX string literals — keep as unicode escape so it renders correctly
#    but replace raw € character to avoid encoding issues
text = text.replace('\u20ac', '\\u20ac')

# 7. Emojis in visible UI label strings — replace with clean text
#    Countdown labels
text = text.replace("'\u26a1 Automatable NOW'",   "'Automate NOW'")
text = text.replace("'\U0001f7e0 12-24 months'",  "'12-24 months'")
text = text.replace("'\U0001f7e1 24-48 months'",  "'24-48 months'")
text = text.replace("'\U0001f7e2 Safe 48+ months'", "'48+ months'")
# Also handle the en-dash variants
text = text.replace('\u26a1 Automatable NOW', 'Automate NOW')
text = text.replace('\U0001f7e0 12\u201324 months', '12-24 months')
text = text.replace('\U0001f7e1 24\u201348 months', '24-48 months')
text = text.replace('\U0001f7e2 Safe 48+ months', '48+ months')

# 8. Emoji decorators in JSX elements — strip the emoji, keep the label text
replacements = [
    ('\U0001f9e0 ', ''),    # 🧠
    ('\U0001f9e9 ', ''),    # 🧩
    ('\U0001f500 ', ''),    # 🔀
    ('\U0001f4a1 ', ''),    # 💡 (before "Recommendation")
    ('\U0001f3af ', ''),    # 🎯 (before milestone text)
    ('\U0001f527 ', ''),    # 🔧
    ('\u26a1 ', ''),        # ⚡
    # Standalone emojis with no trailing space
    ('\U0001f9e0', ''),
    ('\U0001f9e9', ''),
    ('\U0001f500', ''),
    ('\U0001f4a1', ''),
    ('\U0001f3af', ''),
    ('\U0001f527', ''),
    ('\u26a1', ''),
    ('\U0001f7e0', ''),
    ('\U0001f7e1', ''),
    ('\U0001f7e2', ''),
]
for old, new in replacements:
    text = text.replace(old, new)

# 9. Fix the Orchestration Blueprint section title that shows as âš™
#    The line is: <div ...>??? Orchestration Blueprint</div>
#    After above replacements the ??? should be gone, ensure label is clean
text = text.replace('Orchestration Blueprint', 'Orchestration Blueprint')  # no-op, just confirm

# Check remaining
remaining = [(i+1, line) for i, line in enumerate(text.split('\n'))
             if any(ord(c) > 127 and c != '\u20ac' for c in line)]
print(f'Non-ASCII lines remaining (excluding intentional \\u20ac): {len(remaining)}')
for lineno, line in remaining[:30]:
    chars = [(hex(ord(c)), c) for c in line if ord(c) > 127]
    print(f'  L{lineno}: {repr(line[:100])} | chars: {chars[:4]}')

# Write back as pure UTF-8 without BOM
open(path, 'w', encoding='utf-8', newline='\n').write(text)
print('\nDone. File written.')
