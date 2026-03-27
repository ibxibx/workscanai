import sys
path = r'C:\Users\damya\Projects\workscanai\frontend\src\app\page.tsx'
with open(path, encoding='utf-8') as f:
    text = f.read()

lines = text.split('\n')
# Show full hex of lines 83 and 110
for idx in [82, 109]:
    l = lines[idx]
    full_hex = l.encode('utf-8').hex()
    sys.stdout.buffer.write(('Line %d full hex:\n%s\n' % (idx+1, full_hex)).encode())
    sys.stdout.buffer.write(('Line %d text: %s\n\n' % (idx+1, l.strip()[:120])).encode('utf-8'))
