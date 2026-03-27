#!/usr/bin/env python3
import sys, re

def fix(path):
    with open(path, 'rb') as f:
        raw = f.read()
    fixes = [
        (b'\xc3\xa2\xe2\x80\x94',     '\u2014'.encode()),
        (b'\xc3\xa2\xc2\x80\xc2\x94', '\u2014'.encode()),
        (b'\xc3\xa2\xe2\x80\x93',     '\u2013'.encode()),
        (b'\xc3\xa2\xc2\x80\xc2\x93', '\u2013'.encode()),
        (b'\xc3\xa2\xe2\x86\x92',     '\u2192'.encode()),
        (b'\xc3\xa2\xe2\x82\xac',     '\u20ac'.encode()),
        (b'\xc3\xb0\xc5\xb8\xc5\xb8\xc2\xa0', '\U0001f7e0'.encode()),
        (b'\xc3\xb0\xc5\xb8\xc5\xb8\xc2\xa1', '\U0001f7e1'.encode()),
        (b'\xc3\xb0\xc5\xb8\xc5\xb8\xc2\xa2', '\U0001f7e2'.encode()),
        (b'\xc3\xa2\xe2\x94\x80',     b'--'),
        (b'\xc3\xa2\xc2\x94\xc2\x80', b'--'),
    ]
    fixed = raw
    total = 0
    for bad, good in fixes:
        n = fixed.count(bad)
        if n:
            fixed = fixed.replace(bad, good)
            total += n
            sys.stdout.buffer.write(('  %s: %d\n' % (bad.hex()[:16], n)).encode())
    text = fixed.decode('utf-8', errors='replace')
    bad_lines = [l.strip()[:80] for l in text.split('\n') if '\ufffd' in l]
    sys.stdout.buffer.write(('Byte fixes: %d  Remaining bad: %d\n' % (total, len(bad_lines))).encode())
    for b in bad_lines[:6]:
        sys.stdout.buffer.write((b + '\n').encode('utf-8', errors='replace'))
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    sys.stdout.buffer.write(b'Saved.\n')

for p in sys.argv[1:]:
    sys.stdout.buffer.write(('Fixing: ' + p + '\n').encode())
    fix(p)
