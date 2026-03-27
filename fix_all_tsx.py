import sys, os, glob

root = r'C:\Users\damya\Projects\workscanai\frontend\src'
bad_patterns = [
    bytes.fromhex('e282ace2809d'),  # euro + right-quote = garbled em-dash
    bytes.fromhex('e282ace2809c'),  # euro + left-quote = garbled en-dash
    bytes.fromhex('c3a2e2809d'),    # another em-dash variant
    bytes.fromhex('c3a2e2809c'),    # another en-dash variant
]
replacements = [
    '\u2014'.encode(), '\u2013'.encode(),
    '\u2014'.encode(), '\u2013'.encode(),
]

total_files = 0
total_fixes = 0
for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in ['node_modules', '.next', '.git']]
    for fname in filenames:
        if not fname.endswith(('.tsx', '.ts', '.jsx', '.js')):
            continue
        fpath = os.path.join(dirpath, fname)
        with open(fpath, 'rb') as f:
            raw = f.read()
        fixed = raw
        file_fixes = 0
        for bad, good in zip(bad_patterns, replacements):
            n = fixed.count(bad)
            if n:
                fixed = fixed.replace(bad, good)
                file_fixes += n
        if file_fixes:
            total_fixes += file_fixes
            total_files += 1
            short = fpath.replace(root, '').replace('\\', '/')
            sys.stdout.buffer.write(('  Fixed %dx in %s\n' % (file_fixes, short)).encode())
            # Verify valid UTF-8
            try:
                fixed.decode('utf-8')
                with open(fpath, 'wb') as f:
                    f.write(fixed)
            except UnicodeDecodeError as e:
                sys.stdout.buffer.write(('  ERROR: invalid UTF-8 after fix: %s\n' % e).encode())

sys.stdout.buffer.write(('Total: %d fixes across %d files\n' % (total_fixes, total_files)).encode())
