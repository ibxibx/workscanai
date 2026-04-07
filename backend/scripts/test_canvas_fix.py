import sys, json
sys.stdout.reconfigure(encoding='utf-8')
from app.services.n8n_template_client import build_canvas

tasks = [
    {'name': 'Review AI model performance metrics', 'category': 'analysis', 'frequency': 'daily'},
    {'name': 'Prioritize feature requests', 'category': 'product', 'frequency': 'weekly'},
    {'name': 'Monitor product funnel drop-offs', 'category': 'product_analytics', 'frequency': 'daily'},
    {'name': 'Weekly KPI report', 'category': 'reporting', 'frequency': 'weekly'},
    {'name': 'Triage stakeholder emails', 'category': 'communication', 'frequency': 'daily'},
    {'name': 'Research AI market trends', 'category': 'research', 'frequency': 'weekly'},
]
canvas = build_canvas('AI Product Manager', tasks)
nodes = canvas['nodes']
conns = canvas['connections']

workers = [n for n in nodes if 'stickyNote' not in n['type']]
stickies = [n for n in nodes if 'stickyNote' in n['type']]

print(f'Total nodes: {len(nodes)}')
print(f'Working nodes: {len(workers)}')
print(f'Stickies: {len(stickies)}')
print(f'Connection sources: {len(conns)}')
print()

names = [n['name'] for n in workers]
dupes = set(n for n in names if names.count(n) > 1)
print(f'Duplicate names: {dupes if dupes else "NONE - all unique"}')
print()

for i in range(6):
    prefix = f'T{i+1}:'
    col_nodes = [n['name'] for n in workers if n['name'].startswith(prefix)]
    print(f'Column {i+1}: {col_nodes}')
print()

print('CONNECTIONS (checking for cross-wiring):')
cross_wires = 0
for src, data in conns.items():
    targets = [e['node'] for e in data['main'][0]]
    src_prefix = src.split(':')[0]
    bad = [t for t in targets if not t.startswith(src_prefix + ':')]
    flag = ' *** CROSS-WIRE!' if bad else ''
    print(f'  {src} -> {targets}{flag}')
    if bad:
        cross_wires += 1

print()
print(f'Cross-wire issues: {cross_wires}')
print('RESULT:', 'FIXED' if cross_wires == 0 else 'STILL BROKEN')
