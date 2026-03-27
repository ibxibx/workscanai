import sys
path = r'C:\Users\damya\Projects\workscanai\frontend\src\app\page.tsx'
with open(path, 'rb') as f:
    raw = f.read()

fixes = [
    # euro + right-double-quote -> em-dash
    (bytes.fromhex('e282ace2809d'), '\u2014'.encode('utf-8')),
    # euro + left-double-quote -> en-dash
    (bytes.fromhex('e282ace2809c'), '\u2013'.encode('utf-8')),
]

fixed = raw
for bad, good in fixes:
    n = fixed.count(bad)
    if n:
        fixed = fixed.replace(bad, good)
        sys.stdout.buffer.write(('Fixed %dx: %s -> %r\n' % (n, bad.hex(), good.decode())).encode())

# Verify UTF-8 validity
try:
    text = fixed.decode('utf-8')
    bad_lines = [l.strip()[:70] for l in text.split('\n') if '\u20ac\u201d' in l or '\u20ac\u201c' in l]
    sys.stdout.buffer.write(('Still garbled: %d\n' % len(bad_lines)).encode())
    # Show key lines
    for i, l in enumerate(text.split('\n'), 1):
        if ('how' in l and 'save' in l) or ('0' in l and '100%' in l and 'linear' not in l) or ('28K' in l):
            sys.stdout.buffer.write(('%d: %s\n' % (i, l.strip()[:100])).encode('utf-8'))
except UnicodeDecodeError as e:
    sys.stdout.buffer.write(('INVALID: %s\n' % e).encode())

with open(path, 'wb') as f:
    f.write(fixed)
sys.stdout.buffer.write(b'Saved.\n')
