import sys, json
sys.stdout.reconfigure(encoding='utf-8')
import py_compile
py_compile.compile('app/services/n8n_template_client.py', doraise=True)
print('Syntax OK')

from app.services.n8n_template_client import build_canvas, N8nTemplateClient, _BUILDERS, _ALIASES, _resolve_category

print(f'\nTotal builders: {len(_BUILDERS)}')
print(f'Total aliases:  {len(_ALIASES)}')

# Test every builder directly
print('\n--- Builder smoke test ---')
errors = []
for cat, builder in sorted(_BUILDERS.items()):
    try:
        nodes, conns = builder(f'Test task for {cat}', 0)
        workers = [n for n in nodes if 'stickyNote' not in n['type']]
        assert len(workers) >= 3, f'{cat}: only {len(workers)} working nodes'
        assert len(conns) >= 1, f'{cat}: no connections'
        print(f'  OK  {cat:25s} {len(workers)} nodes, {len(conns)} conn sources')
    except Exception as e:
        errors.append(f'{cat}: {e}')
        print(f'  FAIL {cat}: {e}')

# Test 8 different job profiles
JOB_TESTS = [
    ("AI Product Manager (SaaS)", [
        {'name': 'Generate weekly product KPI report',   'category': 'reporting',        'frequency': 'weekly'},
        {'name': 'Review Jira backlog',                  'category': 'management',       'frequency': 'daily'},
        {'name': 'Monitor product funnel drop-offs',     'category': 'product_analytics','frequency': 'daily'},
        {'name': 'Collect and categorize user feedback', 'category': 'product',          'frequency': 'daily'},
    ]),
    ("Marketing Manager", [
        {'name': 'Track SEO rankings and flag drops',    'category': 'seo',              'frequency': 'weekly'},
        {'name': 'Monitor social media engagement',      'category': 'social_media',     'frequency': 'daily'},
        {'name': 'Analyse email campaign open rates',    'category': 'email_marketing',  'frequency': 'weekly'},
        {'name': 'Monitor brand mentions in press',      'category': 'pr_comms',         'frequency': 'daily'},
        {'name': 'Track campaign ROI',                   'category': 'marketing',        'frequency': 'weekly'},
    ]),
    ("Sales Manager", [
        {'name': 'Chase stalled deals in HubSpot',      'category': 'sales',            'frequency': 'daily'},
        {'name': 'Weekly quota and forecast report',     'category': 'sales_ops',        'frequency': 'weekly'},
        {'name': 'Flag at-risk accounts',                'category': 'account_management','frequency': 'weekly'},
        {'name': 'Triage inbound prospect emails',       'category': 'communication',    'frequency': 'daily'},
    ]),
    ("DevOps Engineer", [
        {'name': 'Monitor GitHub PR review queue',       'category': 'devops',           'frequency': 'daily'},
        {'name': 'Alert on CI/CD pipeline failures',     'category': 'testing',          'frequency': 'daily'},
        {'name': 'Monitor cloud infrastructure costs',   'category': 'cloud_infra',      'frequency': 'weekly'},
        {'name': 'Scan security access logs',            'category': 'security',         'frequency': 'daily'},
        {'name': 'Monitor ETL data pipeline health',     'category': 'data_engineering', 'frequency': 'daily'},
    ]),
    ("HR Manager", [
        {'name': 'Process job applications',             'category': 'hr',               'frequency': 'daily'},
        {'name': 'Track recruiting pipeline stages',     'category': 'recruiting',       'frequency': 'weekly'},
        {'name': 'Onboard new hires automatically',      'category': 'onboarding',       'frequency': 'daily'},
        {'name': 'Schedule interviews on calendar',      'category': 'scheduling',       'frequency': 'daily'},
    ]),
    ("Finance Manager", [
        {'name': 'Detect expense anomalies',             'category': 'finance',          'frequency': 'weekly'},
        {'name': 'Track compliance deadlines',           'category': 'compliance',       'frequency': 'weekly'},
        {'name': 'Route purchase order approvals',       'category': 'procurement',      'frequency': 'daily'},
        {'name': 'Weekly financial report',              'category': 'reporting',        'frequency': 'weekly'},
    ]),
    ("E-commerce Manager", [
        {'name': 'Process new orders',                   'category': 'ecommerce',        'frequency': 'daily'},
        {'name': 'Track shipment exceptions',            'category': 'logistics',        'frequency': 'daily'},
        {'name': 'Monitor product analytics funnel',     'category': 'product_analytics','frequency': 'weekly'},
        {'name': 'Respond to customer support tickets',  'category': 'customer_support', 'frequency': 'daily'},
    ]),
    ("CEO / Executive", [
        {'name': 'Daily executive briefing',             'category': 'executive',        'frequency': 'daily'},
        {'name': 'Track investor pipeline',              'category': 'investor_relations','frequency': 'weekly'},
        {'name': 'Monitor compliance deadlines',         'category': 'compliance',       'frequency': 'weekly'},
        {'name': 'Weekly company KPI report',            'category': 'reporting',        'frequency': 'weekly'},
    ]),
]

print(f'\n{"="*65}')
all_pass = True
for job_title, tasks in JOB_TESTS:
    canvas = build_canvas(job_title, tasks)
    nodes    = canvas['nodes']
    stickies = [n for n in nodes if 'stickyNote' in n['type']]
    workers  = [n for n in nodes if 'stickyNote' not in n['type']]
    types    = sorted(set(n['type'].split('.')[-1] for n in workers))
    j        = json.dumps(canvas)
    ok = (len(stickies) == len(tasks)+1 and len(workers) >= len(tasks)*3 and len(j) > 4000)
    if not ok: all_pass = False
    status = 'OK' if ok else 'FAIL'
    print(f'[{status}] {job_title}')
    print(f'       {len(tasks)} tasks | {len(nodes)} total ({len(stickies)} sticky, {len(workers)} working) | {len(j):,} chars')
    print(f'       Types: {", ".join(types)}')

# Alias tests
print(f'\n--- Alias resolution (40 tests) ---')
alias_tests = [
    ('seo','seo'),('sem','seo'),('social','social_media'),('instagram','social_media'),
    ('newsletters','email_marketing'),('pr','pr_comms'),('brand','pr_comms'),
    ('csm','account_management'),('renewals','account_management'),
    ('revops','sales_ops'),('quota','sales_ops'),
    ('talent_acquisition','recruiting'),('headhunting','recruiting'),
    ('new_hire','onboarding'),('etl','data_engineering'),('mlops','data_engineering'),
    ('cybersecurity','security'),('infosec','security'),
    ('aws','cloud_infra'),('gcp','cloud_infra'),('sre','cloud_infra'),
    ('growth_analytics','product_analytics'),('conversion','product_analytics'),
    ('online_retail','ecommerce'),('inventory','ecommerce'),
    ('warehouse','logistics'),('supply_chain','logistics'),
    ('purchasing','procurement'),('sourcing','procurement'),
    ('gdpr','compliance'),('audit','compliance'),
    ('fundraising','investor_relations'),('vc','investor_relations'),
    ('ceo','executive'),('cfo','executive'),('vp','executive'),
    ('phd','academic'),('scientist','academic'),
    ('clinical','healthcare_admin'),('patient','healthcare_admin'),
]
alias_ok = 0
for alias, expected in alias_tests:
    got = _resolve_category(alias)
    ok = got == expected
    if ok: alias_ok += 1
    if not ok: print(f'  FAIL: {alias} -> {got} (expected {expected})')

print(f'  Alias tests: {alias_ok}/{len(alias_tests)} passed')
print(f'\n{"="*65}')
print('ALL TESTS PASSED' if (all_pass and not errors and alias_ok==len(alias_tests)) else 'SOME FAILURES — check above')
print(f'Total: {len(_BUILDERS)} builders, {len(_ALIASES)} aliases')
