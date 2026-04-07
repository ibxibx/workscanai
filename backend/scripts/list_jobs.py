import sys, json
sys.stdout.reconfigure(encoding='utf-8')
from app.services.n8n_template_client import (
    build_canvas, _BUILDERS, _ALIASES, _TOOLS, _resolve_category
)

# ── Common job titles → task sets (what the AI analyzer would produce) ──────
JOB_PROFILES = [
    # ── PRODUCT & TECH ──────────────────────────────────────────────────────
    ("Product Manager", [
        ('Review product backlog', 'management'), ('Weekly product metrics report', 'reporting'),
        ('Triage user feedback', 'product'), ('Coordinate sprint calendar', 'scheduling'),
        ('Research competitor features', 'research'),
    ]),
    ("AI Product Manager", [
        ('Review AI model performance metrics', 'analysis'), ('Prioritize feature requests', 'product'),
        ('Monitor product funnel drop-offs', 'product_analytics'), ('Weekly KPI report', 'reporting'),
        ('Triage stakeholder emails', 'communication'), ('Research AI market trends', 'research'),
    ]),
    ("Software Engineer", [
        ('Monitor GitHub PR review queue', 'devops'), ('Alert on CI/CD build failures', 'testing'),
        ('Update component documentation', 'documentation'), ('Triage bug reports', 'communication'),
        ('Analyse error logs and metrics', 'analysis'),
    ]),
    ("Frontend Developer / React Engineer", [
        ('Track stale pull requests', 'devops'), ('Monitor CI/CD pipeline', 'testing'),
        ('Update design system docs', 'documentation'), ('Log UI bugs from Slack', 'data_entry'),
        ('Sync with design team on Figma specs', 'design'),
    ]),
    ("Backend Engineer", [
        ('Monitor API error rates', 'analysis'), ('Track build failures', 'testing'),
        ('Review open pull requests', 'devops'), ('Monitor data pipeline health', 'data_engineering'),
        ('Scan access logs for anomalies', 'security'),
    ]),
    ("Full Stack Developer", [
        ('Monitor GitHub PRs', 'devops'), ('CI/CD pipeline alerts', 'testing'),
        ('Track cloud infrastructure costs', 'cloud_infra'), ('Update technical docs', 'documentation'),
        ('Triage bug reports from users', 'customer_support'),
    ]),
    ("DevOps Engineer", [
        ('Monitor stale PRs', 'devops'), ('Alert on CI/CD failures', 'testing'),
        ('Monitor cloud costs', 'cloud_infra'), ('Scan security access logs', 'security'),
        ('Monitor ETL pipeline health', 'data_engineering'),
    ]),
    ("Data Scientist / ML Engineer", [
        ('Monitor ML pipeline failures', 'data_engineering'), ('Analyse model performance metrics', 'analysis'),
        ('Research latest AI papers', 'academic'), ('Track experiment results in Sheets', 'reporting'),
        ('Scan security logs', 'security'),
    ]),
    ("Data Analyst", [
        ('Weekly KPI data analysis', 'analysis'), ('Compile weekly metrics report', 'reporting'),
        ('Log data quality issues', 'data_entry'), ('Monitor ETL pipeline health', 'data_engineering'),
        ('Research industry benchmarks', 'research'),
    ]),
    ("Data Engineer", [
        ('Monitor ETL pipeline health', 'data_engineering'), ('Alert on data quality failures', 'testing'),
        ('Track cloud infrastructure costs', 'cloud_infra'), ('Analyse pipeline performance', 'analysis'),
        ('Document data schemas', 'documentation'),
    ]),
    ("Cybersecurity Analyst", [
        ('Scan access logs for anomalies', 'security'), ('Monitor compliance deadlines', 'compliance'),
        ('Track certificate expirations', 'legal'), ('Alert on failed login spikes', 'security'),
        ('Weekly security posture report', 'reporting'),
    ]),
    ("Cloud / Infrastructure Engineer", [
        ('Monitor cloud infrastructure costs', 'cloud_infra'), ('Alert on pipeline failures', 'data_engineering'),
        ('Track security access anomalies', 'security'), ('Review stale PRs', 'devops'),
        ('Monthly cost report', 'reporting'),
    ]),
    ("UX Designer", [
        ('Track Figma design comments', 'design'), ('Collect user research feedback', 'product'),
        ('Update design system documentation', 'documentation'), ('Schedule design review meetings', 'scheduling'),
        ('Analyse user funnel drop-offs', 'product_analytics'),
    ]),
    # ── MARKETING ───────────────────────────────────────────────────────────
    ("Marketing Manager", [
        ('Track SEO rankings and flag drops', 'seo'), ('Monitor social media engagement', 'social_media'),
        ('Analyse email campaign open rates', 'email_marketing'), ('Track brand mentions in press', 'pr_comms'),
        ('Weekly campaign ROI report', 'marketing'),
    ]),
    ("Digital Marketing Manager", [
        ('Monitor SEO keyword rankings', 'seo'), ('Track paid ad campaign ROI', 'marketing'),
        ('Monitor social media performance', 'social_media'), ('Analyse email open rates', 'email_marketing'),
        ('Weekly digital performance report', 'reporting'),
    ]),
    ("SEO Specialist", [
        ('Track keyword rankings and flag drops', 'seo'), ('Monitor backlinks and brand mentions', 'pr_comms'),
        ('Compile weekly SEO performance report', 'reporting'), ('Research competitor keywords', 'research'),
        ('Log on-page changes to tracker', 'data_entry'),
    ]),
    ("Social Media Manager", [
        ('Monitor social engagement metrics', 'social_media'), ('Schedule and publish posts', 'content'),
        ('Track brand mentions and sentiment', 'pr_comms'), ('Weekly social performance report', 'reporting'),
        ('Research trending content', 'research'),
    ]),
    ("Content Manager / Content Strategist", [
        ('Track content performance weekly', 'content'), ('Schedule content publication', 'scheduling'),
        ('Research trending topics', 'research'), ('Monitor brand media mentions', 'pr_comms'),
        ('Compile content metrics report', 'reporting'),
    ]),
    ("Email Marketing Specialist", [
        ('Analyse campaign open and click rates', 'email_marketing'), ('Monitor deliverability issues', 'reporting'),
        ('Segment and log subscriber data', 'data_entry'), ('Schedule email campaigns', 'scheduling'),
        ('A/B test results analysis', 'analysis'),
    ]),
    ("PR Manager / Communications Manager", [
        ('Monitor brand mentions and press coverage', 'pr_comms'), ('Triage press inquiry emails', 'communication'),
        ('Weekly media coverage digest', 'reporting'), ('Research journalist contacts', 'research'),
        ('Schedule press briefings', 'scheduling'),
    ]),
    ("Growth Manager / Growth Hacker", [
        ('Monitor funnel conversion drop-offs', 'product_analytics'), ('Track campaign ROI', 'marketing'),
        ('Analyse retention cohorts', 'analysis'), ('Monitor SEO traffic', 'seo'),
        ('Weekly growth metrics report', 'reporting'),
    ]),
    # ── SALES ───────────────────────────────────────────────────────────────
    ("Sales Manager", [
        ('Chase stalled deals in CRM', 'sales'), ('Weekly quota and forecast report', 'sales_ops'),
        ('Flag at-risk accounts', 'account_management'), ('Triage inbound prospect emails', 'communication'),
        ('Log new deals to pipeline', 'data_entry'),
    ]),
    ("Account Executive", [
        ('Chase stalled deals in HubSpot', 'sales'), ('Schedule client meetings', 'scheduling'),
        ('Log call notes to CRM', 'data_entry'), ('Triage prospect emails', 'communication'),
        ('Weekly deal progress report', 'reporting'),
    ]),
    ("Sales Development Rep (SDR/BDR)", [
        ('Triage and respond to inbound emails', 'communication'), ('Log outreach activity to CRM', 'data_entry'),
        ('Research target accounts', 'research'), ('Schedule discovery calls', 'scheduling'),
        ('Weekly outreach metrics report', 'reporting'),
    ]),
    ("Account Manager / CSM", [
        ('Flag at-risk accounts not contacted', 'account_management'), ('Weekly renewal pipeline report', 'reporting'),
        ('Triage client emails', 'communication'), ('Log meeting notes to Sheets', 'data_entry'),
        ('Schedule quarterly business reviews', 'scheduling'),
    ]),
    ("Revenue Operations Manager", [
        ('Weekly pipeline and quota report', 'sales_ops'), ('Track stalled deals', 'sales'),
        ('Monitor at-risk accounts', 'account_management'), ('Compile revenue analytics', 'analysis'),
        ('Reporting dashboard data refresh', 'reporting'),
    ]),
    # ── CUSTOMER SUCCESS & SUPPORT ───────────────────────────────────────────
    ("Customer Success Manager", [
        ('Triage support tickets', 'customer_support'), ('Monitor account health metrics', 'analysis'),
        ('Log customer feedback to product board', 'product'), ('Weekly client health report', 'reporting'),
        ('Flag at-risk accounts', 'account_management'),
    ]),
    ("Customer Support Manager", [
        ('Route and triage support tickets', 'customer_support'), ('Weekly support metrics report', 'reporting'),
        ('Monitor ticket backlog', 'management'), ('Log escalations to Sheets', 'data_entry'),
        ('Schedule team stand-ups', 'scheduling'),
    ]),
    ("Customer Support Specialist", [
        ('Triage incoming support tickets', 'customer_support'), ('Log resolved tickets', 'data_entry'),
        ('Track response time metrics', 'analysis'), ('Triage priority emails', 'communication'),
        ('Monitor queue in real time', 'reporting'),
    ]),
    # ── HUMAN RESOURCES ─────────────────────────────────────────────────────
    ("HR Manager", [
        ('Process incoming job applications', 'hr'), ('Track recruiting pipeline', 'recruiting'),
        ('Onboard new hires automatically', 'onboarding'), ('Schedule interviews', 'scheduling'),
        ('Monthly HR metrics report', 'reporting'),
    ]),
    ("Recruiter / Talent Acquisition", [
        ('Process job applications', 'hr'), ('Track candidate pipeline stages', 'recruiting'),
        ('Schedule interviews on calendar', 'scheduling'), ('Research candidate profiles', 'research'),
        ('Weekly recruiting pipeline report', 'reporting'),
    ]),
    ("People Operations Manager", [
        ('Onboard new hires', 'onboarding'), ('Track headcount in Sheets', 'data_entry'),
        ('Monthly HR metrics report', 'reporting'), ('Process applications', 'hr'),
        ('Manage compliance training deadlines', 'compliance'),
    ]),
    # ── FINANCE & LEGAL ─────────────────────────────────────────────────────
    ("Finance Manager / CFO", [
        ('Detect expense anomalies', 'finance'), ('Track compliance deadlines', 'compliance'),
        ('Route purchase order approvals', 'procurement'), ('Weekly financial report', 'reporting'),
        ('Manage contract renewal deadlines', 'legal'),
    ]),
    ("Financial Analyst", [
        ('Weekly financial data analysis', 'analysis'), ('Detect expense anomalies', 'finance'),
        ('Compile budget vs actuals report', 'reporting'), ('Track invoice deadlines', 'legal'),
        ('Log financial data to Sheets', 'data_entry'),
    ]),
    ("Accountant / Controller", [
        ('Monitor expense anomalies', 'finance'), ('Log invoice data to Sheets', 'data_entry'),
        ('Monthly accounting report', 'reporting'), ('Track contract and billing deadlines', 'legal'),
        ('Research accounting standards', 'research'),
    ]),
    ("Legal Counsel / Legal Operations", [
        ('Monitor contract expiry deadlines', 'legal'), ('Track compliance deadlines', 'compliance'),
        ('Log new contracts to register', 'data_entry'), ('Weekly legal status report', 'reporting'),
        ('Research regulatory changes', 'research'),
    ]),
    ("Procurement Manager", [
        ('Route purchase order approvals', 'procurement'), ('Track vendor contract expiries', 'legal'),
        ('Monitor budget vs spend', 'finance'), ('Log PO data to Sheets', 'data_entry'),
        ('Weekly procurement summary', 'reporting'),
    ]),
    ("Compliance Officer", [
        ('Track compliance deadlines', 'compliance'), ('Monitor regulatory changes', 'research'),
        ('Weekly compliance status report', 'reporting'), ('Log audit findings', 'data_entry'),
        ('Alert on expiring policies', 'legal'),
    ]),
    # ── OPERATIONS & LOGISTICS ───────────────────────────────────────────────
    ("Operations Manager", [
        ('Monitor ETL and data pipelines', 'data_engineering'), ('Track compliance deadlines', 'compliance'),
        ('Route procurement approvals', 'procurement'), ('Weekly ops metrics report', 'reporting'),
        ('Schedule team coordination meetings', 'scheduling'),
    ]),
    ("Supply Chain Manager / Logistics Manager", [
        ('Track shipment exceptions', 'logistics'), ('Log delivery data to Sheets', 'data_entry'),
        ('Monitor inventory levels', 'ecommerce'), ('Weekly logistics report', 'reporting'),
        ('Route purchase order approvals', 'procurement'),
    ]),
    ("E-commerce Manager", [
        ('Process new orders', 'ecommerce'), ('Track shipment exceptions', 'logistics'),
        ('Monitor product funnel analytics', 'product_analytics'), ('Route customer support tickets', 'customer_support'),
        ('Weekly sales and inventory report', 'reporting'),
    ]),
    # ── EXECUTIVE & STRATEGY ────────────────────────────────────────────────
    ("CEO / Founder", [
        ('Daily executive brief', 'executive'), ('Track investor pipeline', 'investor_relations'),
        ('Monitor compliance deadlines', 'compliance'), ('Weekly company KPI report', 'reporting'),
        ('Monitor brand mentions and press', 'pr_comms'),
    ]),
    ("COO / Operations Director", [
        ('Daily executive brief', 'executive'), ('Route procurement approvals', 'procurement'),
        ('Weekly ops metrics report', 'reporting'), ('Track compliance deadlines', 'compliance'),
        ('Monitor supply chain exceptions', 'logistics'),
    ]),
    ("CTO / VP Engineering", [
        ('Daily engineering brief', 'executive'), ('Monitor cloud infrastructure costs', 'cloud_infra'),
        ('Track security anomalies', 'security'), ('Weekly engineering report', 'reporting'),
        ('Monitor stale PRs and builds', 'devops'),
    ]),
    ("VP / Director of Sales", [
        ('Weekly sales forecast report', 'sales_ops'), ('Track at-risk accounts', 'account_management'),
        ('Monitor stalled deals', 'sales'), ('Daily executive brief', 'executive'),
        ('Triage key prospect emails', 'communication'),
    ]),
    ("Investor Relations Manager", [
        ('Track fundraising pipeline weekly', 'investor_relations'), ('Compile board report digest', 'reporting'),
        ('Monitor compliance deadlines', 'compliance'), ('Triage investor emails', 'communication'),
        ('Research market and competitor news', 'research'),
    ]),
    # ── ACADEMIC & HEALTHCARE ────────────────────────────────────────────────
    ("Research Scientist / Academic", [
        ('Track paper submission deadlines', 'academic'), ('Monitor grant application status', 'academic'),
        ('Research latest papers in field', 'research'), ('Log experiment data to Sheets', 'data_entry'),
        ('Schedule lab meetings and seminars', 'scheduling'),
    ]),
    ("Healthcare Administrator", [
        ('Send appointment reminders and schedule', 'healthcare_admin'), ('Track billing follow-ups', 'finance'),
        ('Monitor compliance and regulatory deadlines', 'compliance'), ('Log patient intake data', 'data_entry'),
        ('Weekly admin metrics report', 'reporting'),
    ]),
]

# ── Run the analysis ────────────────────────────────────────────────────────
print(f"{'JOB TITLE':<45} {'TASKS':>5}  {'NODES':>6}  {'STICKIES':>8}  {'CATEGORIES USED'}")
print("─" * 120)

total_jobs = 0
total_nodes_all = 0
category_usage = {}

for job_title, task_list in JOB_PROFILES:
    tasks = [{'name': n, 'category': c, 'frequency': 'daily'} for n, c in task_list]
    canvas = build_canvas(job_title, tasks)
    nodes    = canvas['nodes']
    stickies = [n for n in nodes if 'stickyNote' in n['type']]
    workers  = [n for n in nodes if 'stickyNote' not in n['type']]
    cats     = [_resolve_category(t['category']) for t in tasks]
    types    = sorted(set(n['type'].split('.')[-1] for n in workers))

    for c in cats:
        category_usage[c] = category_usage.get(c, 0) + 1

    print(f"{job_title:<45} {len(tasks):>5}  {len(nodes):>6}  {len(stickies):>8}  {', '.join(cats)}")
    total_jobs += 1
    total_nodes_all += len(workers)

print()
print(f"TOTAL JOBS: {total_jobs}")
print(f"TOTAL WORKING NODES ACROSS ALL CANVASES: {total_nodes_all}")
print(f"TOTAL BUILDERS: {len(_BUILDERS)}")
print(f"TOTAL ALIASES:  {len(_ALIASES)}")
print()
print("CATEGORY USAGE (how many job profiles use each):")
for cat, count in sorted(category_usage.items(), key=lambda x: -x[1]):
    print(f"  {cat:<25} {count:>3} job profiles")
