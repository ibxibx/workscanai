import sys
sys.stdout.reconfigure(encoding='utf-8')
import py_compile
py_compile.compile('app/services/n8n_template_client.py', doraise=True)
print('SYNTAX OK')

import os
from dotenv import load_dotenv
load_dotenv('.env')
from app.services.n8n_template_client import N8nTemplateClient
import json

client = N8nTemplateClient()

TASKS = [
    {'name': 'Prioritize product backlog',             'category': 'management',    'frequency': 'daily'},
    {'name': 'Generate weekly product metrics report', 'category': 'reporting',     'frequency': 'weekly'},
    {'name': 'Sync with engineering team via Slack',   'category': 'communication', 'frequency': 'daily'},
    {'name': 'Research competitor product launches',   'category': 'research',      'frequency': 'weekly'},
    {'name': 'Update roadmap in tracking tool',        'category': 'data_entry',    'frequency': 'weekly'},
    {'name': 'Analyse user feedback and NPS scores',   'category': 'analysis',      'frequency': 'weekly'},
]

suggested = client.get_curated_templates('AI Digital Product Manager', TASKS)
print(f'Templates: {len(suggested)}')
for t in suggested:
    tname = t['task_name']
    nc    = t['node_count']
    prev  = t['nodes_preview']
    print(f'  [{nc} nodes] {tname}')
    print(f'    Nodes: {prev}')

canvas = client.build_merged_canvas('AI Digital Product Manager', suggested)
print('')
print('Canvas name:', canvas['name'])
total    = len(canvas['nodes'])
stickies = sum(1 for n in canvas['nodes'] if 'stickyNote' in n['type'])
real     = total - stickies
conns    = len(canvas['connections'])
jsz      = len(json.dumps(canvas))
print(f'Total nodes: {total}  ({stickies} sticky notes + {real} workflow nodes)')
print(f'Connections: {conns} source nodes wired')
print(f'JSON size:   {jsz} chars')
print()
print('Column layout:')
for n in canvas['nodes']:
    ntype = 'STICKY' if 'stickyNote' in n['type'] else 'NODE  '
    pos   = n['position']
    print(f'  {ntype} x={pos[0]:5d} y={pos[1]:5d}  {n["name"]}')
