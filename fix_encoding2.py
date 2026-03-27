#!/usr/bin/env python3
"""
Fix mojibake in TSX files by reading as latin-1 and re-encoding properly.
The files were written as UTF-8 but PowerShell's Set-Content read them as
latin-1/cp1252 and then re-encoded, creating double-encoding.
"""
import re, sys

def fix_file(path):
    # Read with latin-1 to see raw bytes as chars
    with open(path, 'rb') as f:
        raw = f.read()
    
    # Try to decode: the file contains valid UTF-8 mixed with mojibake
    # The mojibake pattern: UTF-8 bytes were decoded as latin-1 then re-encoded as UTF-8
    # So we have sequences like: \xc3\xa2\xc2\x80\xc2\x94 instead of \xe2\x80\x94 (em dash)
    
    # Step 1: Decode as UTF-8 with replacement
    text = raw.decode('utf-8', errors='replace')
    
    # Step 2: Fix specific known-bad patterns using string replacement
    # These are the UTF-8 bytes read as latin-1 then written back as UTF-8
    # Each bad sequence = the UTF-8 encoding of the latin-1 misread of the original UTF-8
    
    replacements = [
        # Comments/decorative (replace with clean text)
        ('\ufffd\ufffd Recommendation renderer \ufffd splits on Option', '// Recommendation renderer — splits on Option'),
        
        # Regex patterns in code - these use em-dash as delimiter
        ('[\\ufffd\\ufffd\\"\\-:]', '[-–—:"]'),
        
        # Countdown labels
        ("'\ufffd\ufffd\ufffd Automatable NOW'", "'\u26a1 Automatable NOW'"),
        ("'\ufffd\ufffd\ufffd 12\ufffd\ufffd\ufffd24 months'", "'\U0001f7e0 12\u201324 months'"),
        ("'\ufffd\ufffd\ufffd 24\ufffd\ufffd\ufffd48 months'", "'\U0001f7e1 24\u201348 months'"),
        ("'\ufffd\ufffd\ufffd Safe 48+ months'", "'\u2705 Safe 48+ months'"),
        
        # Euro sign
        ('`\ufffd\ufffd\ufffd${', '`\u20ac${'),
        ("'\ufffd\ufffd\ufffd'", "'\u20ac'"),
        
        # Em dash in strings  
        ('WorkScanAI \ufffd\ufffd\ufffd ${', 'WorkScanAI \u2014 ${'),
        ('WorkScanAI \ufffd\ufffd\ufffd Automation', 'WorkScanAI \u2014 Automation'),
        ('\ufffd\ufffd\ufffd does NOT navigate', '\u2014 does NOT navigate'),
        ('share \ufffd\ufffd\ufffd does NOT', 'share \u2014 does NOT'),
        
        # Analysis ID separator
        ('Analysis ID: {id} \ufffd {new', 'Analysis ID: {id} \u00b7 {new'),
        
        # Human edge and decision layer icons
        ('\ufffd\ufffd\ufffd\ufffd {Math.round(result.human_edge_score)}% Human Edge', '\u{1f9e0} {Math.round(result.human_edge_score)}% Human Edge'),
        
        # General em-dash fixes
        ('12\ufffd\ufffd\ufffd24', '12\u201324'),
        ('24\ufffd\ufffd\ufffd48', '24\u201348'),
        ('3\ufffd\ufffd\ufffd6', '3\u20136'),
        ('6\ufffd\ufffd\ufffd12', '6\u201312'),
        ('1\ufffd\ufffd\ufffd2', '1\u20132'),
        ('\ufffd\ufffd\ufffd', '\u2014'),  # catch-all em-dash
    ]
    
    fixed = text
    for bad, good in replacements:
        fixed = fixed.replace(bad, good)
    
    # Fix the regex pattern lines which had em-dashes as literal regex chars
    # These should use proper Unicode escape
    fixed = re.sub(r'\[\\ufffd\\ufffd\\"\\-:\]', r'[-\u2014"]', fixed)
    
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(fixed)
    
    changed = sum(1 for a, b in zip(text.split('\n'), fixed.split('\n')) if a != b)
    print(f"Fixed: {changed} lines changed in {path}")
    return changed

if __name__ == '__main__':
    for p in sys.argv[1:]:
        fix_file(p)
