from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, HRFlowable, PageBreak, KeepTogether)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import Flowable

W, H = A4
BLUE   = colors.HexColor('#0071e3')
BLACK  = colors.HexColor('#0a0a0a')
DGRAY  = colors.HexColor('#1d1d1f')
MGRAY  = colors.HexColor('#6e6e73')
LGRAY  = colors.HexColor('#f5f5f7')
BORDER = colors.HexColor('#d2d2d7')
GREEN  = colors.HexColor('#16a34a')
RED    = colors.HexColor('#dc2626')
AMBER  = colors.HexColor('#d97706')
PURPLE = colors.HexColor('#7c3aed')
INDIGO = colors.HexColor('#3730a3')
NAVY   = colors.HexColor('#0f172a')

def S(name, **kw):
    base = dict(fontName='Helvetica', fontSize=10, leading=14,
                textColor=BLACK, spaceAfter=0, spaceBefore=0)
    base.update(kw)
    return ParagraphStyle(name, **base)

# ── Style library ─────────────────────────────────────────────────────────────
sTitle    = S('title',  fontName='Helvetica-Bold', fontSize=36, leading=42, textColor=BLACK)
sH1       = S('h1',     fontName='Helvetica-Bold', fontSize=22, leading=28, textColor=BLACK, spaceBefore=18, spaceAfter=10)
sH2       = S('h2',     fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=BLACK, spaceBefore=14, spaceAfter=6)
sH3       = S('h3',     fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=BLACK, spaceBefore=10, spaceAfter=4)
sBody     = S('body',   fontSize=10, leading=15, textColor=DGRAY, spaceAfter=6)
sSmall    = S('small',  fontSize=8,  leading=11, textColor=MGRAY)
sLabel    = S('label',  fontName='Helvetica-Bold', fontSize=7, leading=9,
              textColor=BLUE, spaceBefore=2, spaceAfter=2)
sWhite    = S('white',  fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=colors.white)
sWhiteS   = S('whites', fontSize=8, leading=11, textColor=colors.HexColor('#94a3b8'))
sMono     = S('mono',   fontName='Courier', fontSize=8, leading=12,
              textColor=colors.HexColor('#e2e8f0'), backColor=NAVY)
sCenter   = S('center', alignment=TA_CENTER, fontSize=10, leading=14, textColor=DGRAY)
sRight    = S('right',  alignment=TA_RIGHT,  fontSize=9,  leading=12, textColor=MGRAY)

# ── Helper: coloured pill ─────────────────────────────────────────────────────
def pill(text, bg, fg=colors.white, fs=7):
    st = S(f'pill_{text}', fontName='Helvetica-Bold', fontSize=fs, leading=fs+3,
           textColor=fg, backColor=bg, borderPadding=(2,5,2,5))
    return Paragraph(f'<b>{text}</b>', st)

def score_color(v):
    if v >= 70: return GREEN
    if v >= 50: return AMBER
    return RED

def risk_color(r):
    return {'safe': GREEN, 'caution': AMBER, 'warning': RED}.get(r, MGRAY)

def phase_color(p):
    return {1: colors.HexColor('#475569'), 2: INDIGO, 3: PURPLE}.get(p, MGRAY)

# ── Helper: metric box ────────────────────────────────────────────────────────
def metric_box(label, value, val_color, sub=''):
    rows = [[Paragraph(f'<b>{value}</b>',
                       S('mv', fontName='Helvetica-Bold', fontSize=26, leading=30,
                         textColor=val_color, alignment=TA_CENTER))],
            [Paragraph(f'<b>{label}</b>',
                       S('ml', fontName='Helvetica-Bold', fontSize=7, leading=9,
                         textColor=MGRAY, alignment=TA_CENTER))]]
    if sub:
        rows.append([Paragraph(sub, S('ms', fontSize=7, leading=9,
                                       textColor=MGRAY, alignment=TA_CENTER))])
    t = Table(rows, colWidths=[38*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0),(-1,-1), LGRAY),
        ('BOX',        (0,0),(-1,-1), 0.5, BORDER),
        ('ROUNDEDCORNERS', [6]),
        ('TOPPADDING',    (0,0),(-1,-1), 6),
        ('BOTTOMPADDING', (0,0),(-1,-1), 6),
        ('LEFTPADDING',   (0,0),(-1,-1), 4),
        ('RIGHTPADDING',  (0,0),(-1,-1), 4),
        ('VALIGN',        (0,0),(-1,-1), 'MIDDLE'),
    ]))
    return t

def sub_score_row(scores):
    """4-column sub-score grid: (label, value) tuples"""
    cells = []
    for label, val in scores:
        col = score_color(val) if val else MGRAY
        cells.append([
            Paragraph(f'<b>{val if val else "—"}</b>',
                      S(f'ssv_{label}', fontName='Helvetica-Bold', fontSize=18,
                        leading=22, textColor=col, alignment=TA_CENTER)),
            Paragraph(label, S(f'ssl_{label}', fontSize=7, leading=9,
                               textColor=MGRAY, alignment=TA_CENTER)),
        ])
    rows = [[c[0] for c in cells], [c[1] for c in cells]]
    t = Table(rows, colWidths=[38*mm]*4, hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0),(-1,-1), LGRAY),
        ('BOX',        (0,0),(-1,-1), 0.5, BORDER),
        ('INNERGRID',  (0,0),(-1,-1), 0.3, BORDER),
        ('TOPPADDING',    (0,0),(-1,-1), 5),
        ('BOTTOMPADDING', (0,0),(-1,-1), 5),
        ('ALIGN',      (0,0),(-1,-1), 'CENTER'),
        ('VALIGN',     (0,0),(-1,-1), 'MIDDLE'),
    ]))
    return t

# ── Data from live API ────────────────────────────────────────────────────────
WF_NAME  = 'Investment Banking Operations'
WF_DESC  = ('Core operational workflow covering deal pipeline management, '
            'client reporting, regulatory compliance, and internal communications.')
DATE     = 'March 16, 2026'
RATE     = '€85/hr'
SCORE    = 61
SAVINGS  = '€64,978'
HOURS    = 764
READINESS= 59

READ_DIMS = [
    ('Data Quality',          68, 'CRM & trade data structured & accessible'),
    ('Process Documentation', 74, 'Rule-based & highly repeatable workflows'),
    ('Tool Maturity',         65, 'Good integration surface; compliance gaps'),
    ('Error Tolerance',       31, 'Risk-averse culture — supervised phase critical'),
]

TASKS = [
  dict(num='01', name='Prepare Weekly Deal Pipeline Report',
       score=62, rep=78, data=65, err=40, integ=55,
       tsaved=70, hrs=109, diff='Medium', risk='warning',
       risk_flag='🔴 Client names, deal values & pipeline data — privacy-compliant tools only; never pipe raw CRM to external AI.',
       rec1=('Microsoft Power BI Pro ($10/user/mo)',
             'Connects to CRM APIs, imports Excel, schedules automated PDF reports.',
             '6 hrs', '4 weeks'),
       rec2=('Zapier Pro ($49/mo) + Looker Studio (free)',
             'Pulls CRM/email data into Sheets, auto-generates weekly PDF digest.',
             '8 hrs', '5 weeks'),
       phase=2, phase_label='Supervised Automation',
       milestone='Report prep time: 3 hrs → 45 min by month 5.',
       orch='CRM API trigger → Power Automate pulls data → Power BI refresh → auto-email PDF to partners Mon 08:00',
       freq='Weekly', time_pp='3 hrs'),
  dict(num='02', name='Draft Client Pitch Deck Updates',
       score=38, rep=35, data=50, err=20, integ=45,
       tsaved=30, hrs=75, diff='Hard', risk='warning',
       risk_flag='🔴 Confidential M&A valuations & client financials — on-premise or ring-fenced models only; never external AI.',
       rec1=('Microsoft Copilot for M365 ($30/user/mo, enterprise)',
             'On-premise model populates template slides from structured data only.',
             '12 hrs', '10 weeks'),
       rec2=('Tome AI (from $20/mo)',
             'Assists with narrative structuring & boilerplate slides — never financial data.',
             '2 hrs', '6 weeks'),
       phase=1, phase_label='Human-in-Loop AI Draft',
       milestone='AI populates template sections; analyst writes all narrative, valuations & strategy.',
       orch='Human oversight required — AI drafts boilerplate slides; analyst reviews every slide before use.',
       freq='Daily', time_pp='2 hrs'),
  dict(num='03', name='Monitor Regulatory Filing Deadlines',
       score=66, rep=82, data=75, err=40, integ=72,
       tsaved=85, hrs=159, diff='Easy', risk='caution',
       risk_flag='⚠️ Regulatory deadline errors carry legal liability — validate AI reminders against official SEC/FINRA calendars.',
       rec1=('Zapier Professional ($49/mo)',
             'Monitors SEC EDGAR RSS, syncs to Airtable, triggers Slack reminders T-7/T-3/T-1.',
             '4 hrs', '2 weeks'),
       rec2=('Make.com Core ($9/mo) + Airtable',
             'Auto-creates calendar events & reminder chains from structured deadline DB.',
             '3 hrs', '1 week'),
       phase=2, phase_label='Supervised Automation',
       milestone='0 missed deadline alerts by end of month 2.',
       orch='SEC EDGAR RSS → Zapier → Airtable deadline DB → Slack DM to deal lead at T-7, T-3, T-1 → compliance digest',
       freq='Daily', time_pp='45 min'),
  dict(num='04', name='Reconcile Trade Confirmations',
       score=69, rep=85, data=70, err=30, integ=65,
       tsaved=75, hrs=281, diff='Medium', risk='warning',
       risk_flag='🔴 Financial transaction & employee data — Alteryx/UiPath on-premise only; data processing agreements required.',
       rec1=('Alteryx Designer ($5,195/yr)',
             'On-premise matching engine with compliance audit trail & auto-escalation.',
             '16 hrs', '8 weeks'),
       rec2=('UiPath Studio Pro ($420/mo)',
             'RPA bot reads multi-source confirmations, matches, flags discrepancies in compliance dashboard.',
             '24 hrs', '12 weeks'),
       phase=2, phase_label='Supervised Automation',
       milestone='Reconciliation time: 90 min → 15 min. Exception rate < 5% by month 6.',
       orch='Trading system export 07:00 → Alteryx match workflow → exception email to ops → unresolved escalated to senior trader by 10:00',
       freq='Daily', time_pp='90 min'),
  dict(num='05', name='Draft Investor Update Emails',
       score=58, rep=65, data=70, err=35, integ=62,
       tsaved=60, hrs=29, diff='Medium', risk='caution',
       risk_flag='⚠️ Investor communications require legal review — AI drafts must be partner-approved before sending.',
       rec1=('Claude for Work + Notion ($16/mo)',
             'Pulls deal data from Notion, drafts structured update per investor segment.',
             '3 hrs', '2 weeks'),
       rec2=('HubSpot Starter ($20/mo) + Claude API',
             'Template-driven personalised drafts by investor tier; human review mandatory.',
             '5 hrs', '3 weeks'),
       phase=3, phase_label='Full Agent Delegation',
       milestone='Draft-to-send in under 20 min by month 12. Partner approves in one 10-min session.',
       orch='Notion deal data → Claude API draft segmented by investor tier → partner approval in review UI → HubSpot send',
       freq='Monthly', time_pp='4 hrs'),
  dict(num='06', name='Maintain CRM Contact Database',
       score=78, rep=95, data=90, err=70, integ=85,
       tsaved=90, hrs=112, diff='Easy', risk='safe',
       risk_flag='✅ Internal operational data only — safe to automate fully. No sensitive deal or financial data involved.',
       rec1=('Salesforce Einstein Activity Capture (included in SF Enterprise)',
             'Auto-logs emails, meetings & outcomes to contact records in real-time. Zero incremental cost.',
             '0 hrs', 'Immediate'),
       rec2=('Zapier Professional ($49/mo)',
             'Calendar + email → Salesforce auto-update with custom field mapping.',
             '2 hrs', '1 week'),
       phase=3, phase_label='Full Agent Delegation',
       milestone='Zero manual CRM entries from month 1. Fully autonomous from day one.',
       orch='Gmail/Calendar trigger → Zapier → Salesforce API: update contact, advance deal stage, add structured meeting note',
       freq='Daily', time_pp='30 min'),
]

# ── Build story ───────────────────────────────────────────────────────────────
OUT = 'C:/Users/damya/Projects/workscanai/WorkScanAI_InvestmentBanking_Report.pdf'
doc = SimpleDocTemplate(OUT, pagesize=A4,
    leftMargin=18*mm, rightMargin=18*mm,
    topMargin=16*mm,  bottomMargin=16*mm)
story = []

# ════════════════════════════════════════════════════════ COVER ═══
cover_header = Table([[
    Paragraph('<font color="#0071e3"><b>■ WorkScanAI</b></font>',
              S('logo', fontName='Helvetica-Bold', fontSize=13, leading=16, textColor=BLUE)),
    Paragraph('AI Automation Intelligence Report',
              S('rt', fontSize=9, leading=12, textColor=MGRAY, alignment=TA_RIGHT)),
]], colWidths=[90*mm, 84*mm])
cover_header.setStyle(TableStyle([
    ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ('TOPPADDING',(0,0),(-1,-1),0), ('BOTTOMPADDING',(0,0),(-1,-1),0),
]))
story += [cover_header, Spacer(1, 16*mm)]

# Blue accent bar left of title
story.append(Paragraph(
    '<font color="#0071e3">▌</font> <b>INVESTMENT BANKING<br/>OPERATIONS</b>',
    S('cvt', fontName='Helvetica-Bold', fontSize=30, leading=38, textColor=BLACK)))
story.append(Spacer(1, 4*mm))
story.append(Paragraph(WF_DESC,
    S('cvd', fontSize=11, leading=16, textColor=MGRAY)))
story.append(Spacer(1, 8*mm))

# Headline metrics strip
m_data = [[metric_box('AUTOMATION\nSCORE', f'{SCORE}%', BLUE),
           metric_box('ANNUAL\nSAVINGS',   SAVINGS, GREEN),
           metric_box('HOURS\nRECLAIMED',  f'{HOURS}/yr', PURPLE),
           metric_box('AI\nREADINESS',     f'{READINESS}%', AMBER)]]
m_table = Table(m_data, colWidths=[42*mm]*4, hAlign='LEFT')
m_table.setStyle(TableStyle([
    ('LEFTPADDING',(0,0),(-1,-1),2), ('RIGHTPADDING',(0,0),(-1,-1),2),
    ('TOPPADDING',(0,0),(-1,-1),0),  ('BOTTOMPADDING',(0,0),(-1,-1),0),
]))
story += [m_table, Spacer(1, 6*mm)]
story.append(Paragraph(f'6 Tasks Analysed  ·  {RATE} blended rate  ·  {DATE}  ·  Confidential',
    S('meta', fontSize=8, leading=10, textColor=MGRAY)))
story.append(PageBreak())

# ════════════════════════════════════════════════════ EXEC SUMMARY ═
story.append(Paragraph('<font color="#0071e3">01 —</font> Executive Summary', sH1))
story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=8))

# Pull-quote box
pq_data = [[Paragraph(
    '<b>61% of this workflow\'s task volume is addressable by current AI tools.</b> '
    'The highest-value targets — trade reconciliation and pipeline reporting — account for '
    '<b>390+ hours of reclaimed capacity annually</b>. Compliance constraints require careful '
    'implementation sequencing. The recommended approach is a Phase&nbsp;2 supervised automation '
    'model across four of six tasks within 6 months, delivering <b>€65K in annual savings</b>.',
    S('pq', fontSize=10, leading=15, textColor=DGRAY))]]
pq = Table(pq_data, colWidths=[166*mm])
pq.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,-1), colors.HexColor('#eff6ff')),
    ('LINEAFTER',(0,0),(0,-1),  4, BLUE),
    ('BOX',      (0,0),(-1,-1), 0.5, colors.HexColor('#bfdbfe')),
    ('TOPPADDING',(0,0),(-1,-1),10), ('BOTTOMPADDING',(0,0),(-1,-1),10),
    ('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),10),
]))
story += [pq, Spacer(1, 6*mm)]

# Key findings 2x2 grid
finds = [
    ('✓ QUICK WINS (0–3 MO)',  GREEN,  'CRM maintenance + regulatory tracking: ~170 hrs/yr, €14,500 with no-code tools. Zero infrastructure cost.'),
    ('⚠ COMPLIANCE RISK',      AMBER,  '4 of 6 tasks involve financial PII or regulatory obligations. External AI tools need FINRA/SEC data handling assessment.'),
    ('↑ HIGHEST ROI TASK',     PURPLE, 'Trade reconciliation: 281 hrs/yr at 75% automation using Alteryx/UiPath on-premise. Payback in 8–12 weeks.'),
    ('⟲ AI READINESS GAP',     RED,    'Error tolerance averaging 31/100 signals risk-averse culture — phased human-in-loop automation is essential.'),
]
story.append(Paragraph('Key Findings', sH2))
fd = [[
    Table([[Paragraph(f'<b>{f[0]}</b>', S(f'ft{i}', fontName='Helvetica-Bold', fontSize=7, leading=9, textColor=f[1]))],
           [Paragraph(f[2], S(f'fb{i}', fontSize=9, leading=13, textColor=DGRAY))]],
          colWidths=[79*mm], style=TableStyle([
              ('BACKGROUND',(0,0),(-1,-1),LGRAY),
              ('BOX',(0,0),(-1,-1),0.5,BORDER),
              ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
              ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
          ]))
    for i, f in enumerate(finds[:2])],
    [Table([[Paragraph(f'<b>{f[0]}</b>', S(f'ft{i+2}', fontName='Helvetica-Bold', fontSize=7, leading=9, textColor=f[1]))],
            [Paragraph(f[2], S(f'fb{i+2}', fontSize=9, leading=13, textColor=DGRAY))]],
           colWidths=[79*mm], style=TableStyle([
               ('BACKGROUND',(0,0),(-1,-1),LGRAY),
               ('BOX',(0,0),(-1,-1),0.5,BORDER),
               ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
               ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
           ]))
     for i, f in enumerate(finds[2:])],
]
ft = Table(fd, colWidths=[82*mm, 82*mm], hAlign='LEFT')
ft.setStyle(TableStyle([
    ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),3),
    ('TOPPADDING',(0,0),(-1,-1),0), ('BOTTOMPADDING',(0,0),(-1,-1),3),
]))
story += [ft, Spacer(1, 6*mm)]

# AI Readiness table
story.append(Paragraph(f'Company AI Readiness — {READINESS}/100', sH2))
rd_header = [Paragraph('<b>Dimension</b>', S('rdh', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white)),
             Paragraph('<b>Score</b>',     S('rdh2', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white, alignment=TA_CENTER)),
             Paragraph('<b>Interpretation</b>', S('rdh3', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white))]
rd_rows = [rd_header]
for label, val, desc in READ_DIMS:
    col = score_color(val)
    rd_rows.append([
        Paragraph(f'<b>{label}</b>', sH3),
        Paragraph(f'<b>{val}</b>', S(f'rv{val}', fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=col, alignment=TA_CENTER)),
        Paragraph(desc, sBody),
    ])
rd_t = Table(rd_rows, colWidths=[52*mm, 22*mm, 92*mm])
rd_t.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0), NAVY),
    ('BACKGROUND',(0,1),(-1,-1), colors.white),
    ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, LGRAY]),
    ('BOX',(0,0),(-1,-1),0.5,BORDER),
    ('INNERGRID',(0,0),(-1,-1),0.3,BORDER),
    ('TOPPADDING',(0,0),(-1,-1),6), ('BOTTOMPADDING',(0,0),(-1,-1),6),
    ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
    ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
]))
story += [rd_t, PageBreak()]

# ════════════════════════════════════════════════ TASK CARDS ══════
story.append(Paragraph('<font color="#0071e3">02 —</font> Task-Level Analysis', sH1))
story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=8))

for t in TASKS:
    rc = risk_color(t['risk'])
    pc = phase_color(t['phase'])
    sc = score_color(t['score'])
    risk_labels = {'safe': '✅ SAFE', 'caution': '⚠ CAUTION', 'warning': '🔴 WARNING'}

    # ── Task header bar ───────────────────────────────────────────
    hdr_data = [[
        Paragraph(f"<b>{t['num']} · {t['name']}</b>",
                  S('th', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=colors.white)),
        Table([[
            Paragraph(f"<b>{risk_labels[t['risk']]}</b>",
                      S('rl', fontName='Helvetica-Bold', fontSize=7, leading=9, textColor=rc)),
            Paragraph(f"<b>{t['score']}%</b>",
                      S('sc', fontName='Helvetica-Bold', fontSize=14, leading=17, textColor=sc)),
        ]], colWidths=[24*mm, 16*mm], style=TableStyle([
            ('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
            ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0),
        ])),
    ]]
    hdr_t = Table(hdr_data, colWidths=[122*mm, 44*mm])
    hdr_t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1), NAVY),
        ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),6),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))

    # ── Risk badge ────────────────────────────────────────────────
    risk_bg = {'safe': colors.HexColor('#f0fdf4'),
               'caution': colors.HexColor('#fffbeb'),
               'warning': colors.HexColor('#fff1f2')}[t['risk']]
    risk_border = {'safe': colors.HexColor('#bbf7d0'),
                   'caution': colors.HexColor('#fde68a'),
                   'warning': colors.HexColor('#fecdd3')}[t['risk']]
    rflag_t = Table([[Paragraph(t['risk_flag'], S('rf', fontSize=9, leading=13, textColor=DGRAY))]],
                    colWidths=[166*mm])
    rflag_t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1), risk_bg),
        ('BOX',(0,0),(-1,-1),0.5, risk_border),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
    ]))

    # ── Sub-scores ────────────────────────────────────────────────
    ss = sub_score_row([
        ('Repeatability', t['rep']), ('Data Access', t['data']),
        ('Error Tolerance', t['err']), ('Integration', t['integ'])])

    # ── Meta row ──────────────────────────────────────────────────
    meta = Paragraph(
        f"📅 <b>{t['freq']}</b>  ·  ⏱ <b>{t['time_pp']}/occurrence</b>  ·  "
        f"📉 <b>{t['tsaved']}% time saved</b>  ·  🕐 <b>{t['hrs']} hrs/yr reclaimed</b>  ·  "
        f"⚙ <b>{t['diff']} implementation</b>",
        S('meta', fontSize=8, leading=11, textColor=MGRAY))

    # ── Recommendation ────────────────────────────────────────────
    rec_content = (
        f"<b>Option 1 — {t['rec1'][0]}:</b><br/>{t['rec1'][1]}"
        f"  Setup: {t['rec1'][2]}. Payback: {t['rec1'][3]}.<br/><br/>"
        f"<b>Option 2 — {t['rec2'][0]}:</b><br/>{t['rec2'][1]}"
        f"  Setup: {t['rec2'][2]}. Payback: {t['rec2'][3]}.")
    rec_t = Table([
        [Paragraph('💡  RECOMMENDATION', S('rh', fontName='Helvetica-Bold', fontSize=7, leading=9, textColor=BLUE))],
        [Paragraph(rec_content, S('rb', fontSize=8.5, leading=13, textColor=DGRAY))],
    ], colWidths=[166*mm])
    rec_t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1), colors.HexColor('#eff6ff')),
        ('BOX',(0,0),(-1,-1),0.5, colors.HexColor('#bfdbfe')),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
    ]))

    # ── Phase + Orchestration ─────────────────────────────────────
    phase_bgs = {1: colors.HexColor('#f1f5f9'), 2: colors.HexColor('#eef2ff'), 3: colors.HexColor('#faf5ff')}
    phase_borders = {1: colors.HexColor('#cbd5e1'), 2: colors.HexColor('#c7d2fe'), 3: colors.HexColor('#ddd6fe')}
    ph_t = Table([
        [Paragraph(f'<b>PHASE {t["phase"]} — {t["phase_label"].upper()}</b>',
                   S(f'ph{t["phase"]}', fontName='Helvetica-Bold', fontSize=7, leading=9, textColor=pc))],
        [Paragraph(f'🎯 {t["milestone"]}', S('pm', fontSize=9, leading=13, textColor=DGRAY))],
    ], colWidths=[166*mm])
    ph_t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1), phase_bgs[t['phase']]),
        ('BOX',(0,0),(-1,-1),0.5, phase_borders[t['phase']]),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
    ]))
    orch_t = Table([
        [Paragraph('⚙  ORCHESTRATION BLUEPRINT', S('oh', fontName='Helvetica-Bold', fontSize=7, leading=9, textColor=colors.HexColor('#9ca3af')))],
        [Paragraph(t['orch'], S('ob', fontName='Courier', fontSize=8, leading=12, textColor=colors.HexColor('#e2e8f0')))],
    ], colWidths=[166*mm])
    orch_t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1), NAVY),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),8),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
    ]))

    # ── Assemble card ─────────────────────────────────────────────
    card_rows = [[hdr_t], [Spacer(1,3)], [rflag_t], [Spacer(1,3)], [ss],
                 [Spacer(1,3)], [rec_t], [Spacer(1,3)], [ph_t], [Spacer(1,2)], [orch_t],
                 [Spacer(1,3)], [meta]]
    card = Table(card_rows, colWidths=[166*mm])
    card.setStyle(TableStyle([
        ('BOX',(0,0),(-1,-1),0.5,BORDER),
        ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0),
        ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
        ('BACKGROUND',(0,12),(0,12),LGRAY),
        ('TOPPADDING',(0,12),(0,12),6),('BOTTOMPADDING',(0,12),(0,12),6),
        ('LEFTPADDING',(0,12),(0,12),10),('RIGHTPADDING',(0,12),(0,12),10),
    ]))
    story += [KeepTogether([card]), Spacer(1, 5*mm)]

story.append(PageBreak())

# ════════════════════════════════════════════ AGENTIFICATION ROADMAP ══
story.append(Paragraph('<font color="#0071e3">03 —</font> Agentification Roadmap', sH1))
story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=4))
story.append(Paragraph(
    'A phased 18-month plan to move from manual workflows to full AI agent delegation — '
    'sequenced by risk, value, and implementation complexity.',
    S('sub', fontSize=10, leading=14, textColor=MGRAY, spaceAfter=8)))

phases = [
    (1, 'Human-in-Loop AI Drafts', 'Months 0–3', '€14,500 · 170 hrs/yr',
     colors.HexColor('#1e293b'), colors.HexColor('#64748b'),
     [('CRM Contact Maintenance',
       'Deploy Salesforce Einstein Activity Capture. Full autonomy from day one — '
       'zero human review. Milestone: <b>0 manual CRM entries by end of month 1.</b>'),
      ('Pitch Deck Structural Updates',
       'M365 Copilot populates template-only sections. Analyst writes all narrative '
       'and valuations. No AI near financial data.')]),
    (2, 'Supervised Automation', 'Months 3–9', '+€29,000 · 390 hrs/yr cumulative',
     colors.HexColor('#0f172a'), INDIGO,
     [('Regulatory Deadline Tracking',
       'Zapier + SEC EDGAR + Airtable fully automated. Compliance officer validates weekly. '
       'Target: <b>0 missed alerts.</b>'),
      ('Trade Confirmation Reconciliation',
       'Alteryx on-premise runs 07:00 daily. Human reviews exception queue only. '
       'Target: <b>90 min → 15 min by month 6.</b>'),
      ('Deal Pipeline Report',
       'Power BI auto-generates weekly draft. Partner reviews before distribution. '
       'Target: <b>3 hrs → 45 min by month 5.</b>')]),
    (3, 'Full Agent Delegation', 'Months 9–18', '€65K full run-rate · 764 hrs/yr',
     colors.HexColor('#1e1b4b'), PURPLE,
     [('Investor Update Emails',
       'Claude drafts from Notion data store, segmented by investor tier. Partner approves '
       'in <10 min. Target: <b>draft-to-send under 20 min by month 12.</b>'),
      ('All Phase 1–2 tasks',
       'Move to autonomous operation with monthly audit. No routine human review required.')]),
]

for ph_num, ph_name, ph_time, ph_savings, ph_bg, ph_accent, ph_tasks in phases:
    # Phase header
    ph_hdr = Table([[
        Paragraph(f'<b>PHASE {ph_num}</b>',
                  S(f'phh{ph_num}', fontName='Helvetica-Bold', fontSize=9, leading=11,
                    textColor=ph_accent, backColor=colors.HexColor('#ffffff'))),
        Paragraph(f'<b>{ph_name}  —  {ph_time}</b>',
                  S(f'phn{ph_num}', fontName='Helvetica-Bold', fontSize=12, leading=15,
                    textColor=colors.white)),
        Paragraph(ph_savings,
                  S(f'phs{ph_num}', fontSize=9, leading=11,
                    textColor=colors.HexColor('#94a3b8'), alignment=TA_RIGHT)),
    ]], colWidths=[22*mm, 96*mm, 48*mm])
    ph_hdr.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1), ph_bg),
        ('BACKGROUND',(0,0),(0,0), colors.white),
        ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
        ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))

    task_cells = []
    for task_name, task_desc in ph_tasks:
        tc = Table([
            [Paragraph(f'<b>{task_name}</b>', sH3)],
            [Paragraph(task_desc, S('ptd', fontSize=9, leading=13, textColor=DGRAY))],
        ], colWidths=[79*mm])
        tc.setStyle(TableStyle([
            ('BOX',(0,0),(-1,-1),0.5,BORDER),
            ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
            ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
        ]))
        task_cells.append(tc)
    # pad to even columns
    while len(task_cells) % 2 != 0:
        task_cells.append(Spacer(1,1))
    pairs = [task_cells[i:i+2] for i in range(0, len(task_cells), 2)]
    tasks_t = Table(pairs, colWidths=[82*mm, 82*mm])
    tasks_t.setStyle(TableStyle([
        ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),3),
        ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),0),
    ]))

    phase_card = Table([[ph_hdr],[tasks_t]], colWidths=[166*mm])
    phase_card.setStyle(TableStyle([
        ('BOX',(0,0),(-1,-1),0.5,BORDER),
        ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
    ]))
    story += [phase_card, Spacer(1, 4*mm)]

# End-state vision
vision = Table([[Paragraph(
    '<b>End-State Vision — Month 18:</b> An investment banking team running a partially '
    'agentic operations layer. CRM self-maintains. Compliance reminders self-generate. '
    'Trade reconciliation runs overnight with exception-only review. Reports auto-publish '
    'on schedule. The team\'s intellectual capital is redirected from operational overhead '
    'to deal origination, client strategy, and market analysis — <b>the work that compounds into revenue.</b>',
    S('vis', fontSize=10, leading=15, textColor=colors.HexColor('#4c1d95')))
]], colWidths=[166*mm])
vision.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,-1), colors.HexColor('#faf5ff')),
    ('BOX',(0,0),(-1,-1),0.5, colors.HexColor('#ddd6fe')),
    ('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10),
    ('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),
]))
story += [vision, PageBreak()]

# ═════════════════════════════════════════════ FINANCIAL SUMMARY ══
story.append(Paragraph('<font color="#0071e3">04 —</font> Implementation Priorities & Financial Summary', sH1))
story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=8))

# Priority table
pt_headers = ['Task', 'Score', 'Risk', 'hrs/yr', 'Phase']
pt_data = [
    [Paragraph(f'<b>{h}</b>',
               S(f'ph{h}', fontName='Helvetica-Bold', fontSize=8, textColor=colors.white))
     for h in pt_headers]
]
task_rows = [
    ('Maintain CRM Database',        78, 'safe',    112, '3 — Full Agent'),
    ('Monitor Reg. Deadlines',       66, 'caution', 159, '2 — Supervised'),
    ('Reconcile Trade Confirmations',69, 'warning', 281, '2 — Supervised'),
    ('Deal Pipeline Report',         62, 'warning', 109, '2 — Supervised'),
    ('Investor Update Emails',       58, 'caution',  29, '3 — Full Agent'),
    ('Pitch Deck Updates',           38, 'warning',  75, '1 — Human-in-Loop'),
    ('TOTAL', None, None, 764, ''),
]
risk_labels2 = {'safe': '✅ SAFE', 'caution': '⚠ CAUTION', 'warning': '🔴 HIGH', None: ''}
for name, sc, risk, hrs, phase in task_rows:
    is_total = name == 'TOTAL'
    fn = 'Helvetica-Bold' if is_total else 'Helvetica'
    pt_data.append([
        Paragraph(f'<b>{name}</b>' if is_total else name,
                  S(f'pn{name}', fontName=fn, fontSize=9, leading=12)),
        Paragraph(f'<b>{sc}%</b>' if sc else '—',
                  S(f'ps{name}', fontName='Helvetica-Bold', fontSize=10,
                    textColor=score_color(sc) if sc else MGRAY, alignment=TA_CENTER)),
        Paragraph(risk_labels2.get(risk,''),
                  S(f'pr{name}', fontName='Helvetica-Bold', fontSize=7,
                    textColor=risk_color(risk) if risk else MGRAY, alignment=TA_CENTER)),
        Paragraph(f'<b>{hrs}</b>' if is_total else str(hrs),
                  S(f'ph{name}', fontName=fn, fontSize=9, alignment=TA_CENTER)),
        Paragraph(phase, S(f'pph{name}', fontSize=8, textColor=PURPLE if '3' in phase else INDIGO if '2' in phase else MGRAY)),
    ])

pt = Table(pt_data, colWidths=[62*mm, 20*mm, 22*mm, 18*mm, 44*mm])
row_bgs = [None] + [colors.white if i%2==0 else LGRAY for i in range(len(task_rows)-1)] + [colors.HexColor('#f0fdf4')]
ts = [('BACKGROUND',(0,0),(-1,0), NAVY),
      ('ROWBACKGROUNDS',(0,1),(-1,-2),[colors.white, LGRAY]),
      ('BACKGROUND',(0,-1),(-1,-1), colors.HexColor('#f0fdf4')),
      ('BOX',(0,0),(-1,-1),0.5,BORDER),
      ('INNERGRID',(0,0),(-1,-1),0.3,BORDER),
      ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
      ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
      ('VALIGN',(0,0),(-1,-1),'MIDDLE')]
pt.setStyle(TableStyle(ts))
story += [pt, Spacer(1, 6*mm)]

# Financial summary dark panel
fin_items = [
    ('Annual Run-Rate Savings', '€64,978', colors.HexColor('#4ade80')),
    ('Hours Reclaimed / Year',  '764 hrs', colors.HexColor('#60a5fa')),
    ('Est. Implementation Cost','~€12,000', colors.HexColor('#f9a8d4')),
    ('First-Year ROI Multiple', '5.4×',    colors.HexColor('#fbbf24')),
]
fin_cells = [[
    Table([[Paragraph(f'<b>{v}</b>', S(f'fv{l}', fontName='Helvetica-Bold', fontSize=22,
                                        leading=26, textColor=vc, alignment=TA_CENTER))],
           [Paragraph(l, S(f'fl{l}', fontSize=7, leading=9,
                           textColor=colors.HexColor('#9ca3af'), alignment=TA_CENTER))]],
          colWidths=[38*mm], style=TableStyle([
              ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
              ('ALIGN',(0,0),(-1,-1),'CENTER'),
          ]))
    for l, v, vc in fin_items
]]
fin_t = Table(fin_cells, colWidths=[40*mm]*4)
fin_t.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,-1), NAVY),
    ('INNERGRID',(0,0),(-1,-1),0.3,colors.HexColor('#334155')),
    ('BOX',(0,0),(-1,-1),0,NAVY),
    ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0),
    ('LEFTPADDING',(0,0),(-1,-1),2),('RIGHTPADDING',(0,0),(-1,-1),2),
]))
fin_outer = Table([[fin_t]], colWidths=[166*mm])
fin_outer.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,-1), NAVY),
    ('BOX',(0,0),(-1,-1),0.5,NAVY),
    ('ROUNDEDCORNERS',[8]),
    ('TOPPADDING',(0,0),(-1,-1),14),('BOTTOMPADDING',(0,0),(-1,-1),14),
    ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
]))
story += [fin_outer, Spacer(1, 8*mm)]

# Footer
story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceAfter=6))
footer = Table([[
    Paragraph('<b><font color="#0071e3">■ WorkScanAI</font></b>  AI Automation Intelligence Platform',
              S('fl', fontSize=9, leading=12)),
    Paragraph(f'workscanai.vercel.app  ·  Analysis ID: WS-2026-IB-001  ·  {DATE}<br/>'
              '<font color="#9ca3af">This report is confidential and intended solely for the named recipient.</font>',
              S('fr', fontSize=8, leading=11, alignment=TA_RIGHT, textColor=MGRAY)),
]], colWidths=[83*mm, 83*mm])
footer.setStyle(TableStyle([
    ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0),
    ('VALIGN',(0,0),(-1,-1),'TOP'),
]))
story.append(footer)

# ── Build ─────────────────────────────────────────────────────────────────────
doc.build(story)
print(f'PDF saved → {OUT}')
