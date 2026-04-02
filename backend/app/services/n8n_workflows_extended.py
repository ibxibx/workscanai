
# ===========================================================================
# EXTENDED WORKFLOW LIBRARY — 20 additional builders (doubles total to 40)
# Each covers a distinct job sub-discipline with genuinely relevant automation
# ===========================================================================

def _wf_seo(task_name, x0):
    """SEO: fetch Search Console/rank data -> flag drops -> Slack + Sheets log."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 7 * * 1"),
          _http(_uid(), "Fetch Search Console Data", x0+220, y,
                "={{ $vars.SEARCH_CONSOLE_API_URL || 'https://api.example.com/seo/metrics' }}"),
          _code(_uid(), "Detect Rank Drops", x0+440, y,
                "const data = items[0].json;\n"
                "const pages = Array.isArray(data) ? data : data.pages || [data];\n"
                "const drops = pages.filter(p => (p.position_delta || 0) > 3);\n"
                "const winners = pages.filter(p => (p.position_delta || 0) < -3);\n"
                "return [{ json: {\n"
                "  total_pages: pages.length,\n"
                "  drops: drops.length,\n"
                "  drop_list: drops.slice(0,3).map(p => `${p.url||'?'}: +${p.position_delta||0} pos`).join('\\n'),\n"
                "  winners: winners.length,\n"
                "  week: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Post SEO Alert", x0+660, y, "#seo",
                f"\U0001f50e *{task_name} \u2014 {{{{ $json.week }}}}*\n"
                "\U0001f4c9 Drops: {{{{ $json.drops }}}} | \U0001f4c8 Wins: {{{{ $json.winners }}}}\n{{{{ $json.drop_list }}}}"),
          _sheets_append(_uid(), "Log SEO Data", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_social_media(task_name, x0):
    """Social: monitor engagement metrics -> flag viral posts -> daily digest."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 9 * * *"),
          _http(_uid(), "Fetch Social Metrics", x0+220, y,
                "={{ $vars.SOCIAL_API_URL || 'https://api.example.com/social/metrics' }}"),
          _code(_uid(), "Rank Engagement", x0+440, y,
                "const data = items[0].json;\n"
                "const posts = Array.isArray(data) ? data : data.posts || [data];\n"
                "const scored = posts.map(p => ({...p,\n"
                "  score: (p.likes||0) + (p.shares||0)*3 + (p.comments||0)*2\n"
                "})).sort((a,b) => b.score - a.score);\n"
                "const top = scored[0] || {};\n"
                "return [{ json: {\n"
                "  top_post: (top.text||top.caption||'N/A').slice(0,80),\n"
                "  top_score: top.score || 0,\n"
                "  total_posts: posts.length,\n"
                "  total_likes: posts.reduce((s,p)=>s+(p.likes||0),0),\n"
                "  date: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Post Engagement Digest", x0+660, y, "#social-media",
                f"\U0001f4f1 *{task_name} \u2014 {{{{ $json.date }}}}*\n"
                "Top post score: {{{{ $json.top_score }}}} | Posts: {{{{ $json.total_posts }}}} | Likes: {{{{ $json.total_likes }}}}\n"
                "_{{{{ $json.top_post }}}}_"),
          _sheets_append(_uid(), "Log Social Stats", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_email_marketing(task_name, x0):
    """Email marketing: fetch campaign stats -> flag low open rates -> alert."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 10 * * 2"),
          _http(_uid(), "Fetch Campaign Stats", x0+220, y,
                "={{ $vars.EMAIL_PLATFORM_API || 'https://api.example.com/email/campaigns' }}"),
          _code(_uid(), "Analyse Open Rates", x0+440, y,
                "const camps = Array.isArray(items[0].json) ? items[0].json : [items[0].json];\n"
                "const with_stats = camps.map(c => ({\n"
                "  name: c.name || c.subject || 'Campaign',\n"
                "  sent: c.sent || c.recipients || 0,\n"
                "  opens: c.opens || 0,\n"
                "  clicks: c.clicks || 0,\n"
                "  open_rate: c.sent ? ((c.opens||0)/c.sent*100).toFixed(1)+'%' : 'N/A',\n"
                "  click_rate: c.opens ? ((c.clicks||0)/c.opens*100).toFixed(1)+'%' : 'N/A',\n"
                "  flag: c.sent && (c.opens||0)/c.sent < 0.15 ? '\u26a0\ufe0f Low' : '\u2705 OK'\n"
                "}));\n"
                "return with_stats.map(s => ({ json: s }));"),
          _slack(_uid(), "Email Campaign Report", x0+660, y, "#marketing",
                f"\U0001f4e7 *{task_name}*\n"
                "{{{{ $json.name }}}}: {{{{ $json.flag }}}} | Open: {{{{ $json.open_rate }}}} | "
                "Click: {{{{ $json.click_rate }}}} | Sent: {{{{ $json.sent }}}}"),
          _sheets_append(_uid(), "Log Campaign Stats", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_pr_comms(task_name, x0):
    """PR/Comms: monitor brand mentions via RSS/API -> flag negative -> alert."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1-5"),
          _http(_uid(), "Fetch Brand Mentions", x0+220, y,
                "={{ $vars.MENTION_API_URL || 'https://news.google.com/rss/search?q=YOUR_BRAND' }}"),
          _code(_uid(), "Classify Sentiment", x0+440, y,
                "const body = items[0].json.body || '';\n"
                "const titles = [...body.matchAll(/<title>(.*?)<\\/title>/g)].slice(1,8).map(m=>m[1]);\n"
                "const negative_kw = ['lawsuit','scandal','outage','breach','complaint','recall','warning'];\n"
                "const negative = titles.filter(t => negative_kw.some(k => t.toLowerCase().includes(k)));\n"
                "return [{ json: {\n"
                "  total: titles.length,\n"
                "  negative: negative.length,\n"
                "  negative_list: negative.join('\\n') || 'None',\n"
                "  all_titles: titles.slice(0,5).join('\\n'),\n"
                "  date: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Media Mention Alert", x0+660, y, "#pr-comms",
                f"\U0001f4f0 *{task_name} \u2014 {{{{ $json.date }}}}*\n"
                "Mentions: {{{{ $json.total }}}} | \u26a0\ufe0f Negative: {{{{ $json.negative }}}}\n{{{{ $json.all_titles }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[2]["name"],n[3]["name"])])
    return n, c


def _wf_account_management(task_name, x0):
    """Account management: flag accounts not contacted in 14d, expiring soon."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1"),
          _sheets_read(_uid(), "Load Account Register", x0+220, y),
          _code(_uid(), "Flag At-Risk Accounts", x0+440, y,
                "const accounts = items.map(i => i.json);\n"
                "const now = Date.now();\n"
                "const week14 = 14*24*60*60*1000;\n"
                "const month1 = 30*24*60*60*1000;\n"
                "const at_risk = accounts.filter(a => {\n"
                "  const last = new Date(a.last_contact || 0).getTime();\n"
                "  const renew = new Date(a.renewal_date || 0).getTime();\n"
                "  return (now - last > week14) || (renew > now && renew < now + month1);\n"
                "});\n"
                "return at_risk.slice(0,8).map(a => ({ json: {\n"
                "  account: a.account_name || a.company || 'Unknown',\n"
                "  csm: a.owner || a.csm || 'Unassigned',\n"
                "  last_contact: a.last_contact || 'Never',\n"
                "  renewal: a.renewal_date || 'N/A',\n"
                "  arr: a.arr || a.mrr || ''\n"
                "}}));"),
          _slack(_uid(), "At-Risk Account Alert", x0+660, y, "#customer-success",
                f"\U0001f6a8 *At-Risk Account \u2014 {task_name}*\n"
                "{{{{ $json.account }}}} ({{{{ $json.csm }}}})\n"
                "Last contact: {{{{ $json.last_contact }}}} | Renewal: {{{{ $json.renewal }}}} | ARR: {{{{ $json.arr }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[2]["name"],n[3]["name"])])
    return n, c


def _wf_sales_ops(task_name, x0):
    """Sales ops: quota attainment tracker, pipeline hygiene, weekly forecast."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 7 * * 1"),
          _sheets_read(_uid(), "Load Pipeline Data", x0+220, y),
          _code(_uid(), "Compute Forecast", x0+440, y,
                "const rows = items.map(i => i.json);\n"
                "const open = rows.filter(r => r.stage !== 'Closed Won' && r.stage !== 'Closed Lost');\n"
                "const won = rows.filter(r => r.stage === 'Closed Won');\n"
                "const total_pipe = open.reduce((s,r) => s+(Number(r.amount)||0), 0);\n"
                "const total_won = won.reduce((s,r) => s+(Number(r.amount)||0), 0);\n"
                "const quota = Number(process.env.SALES_QUOTA || 100000);\n"
                "const attainment = quota ? ((total_won/quota)*100).toFixed(1)+'%' : 'N/A';\n"
                "const stale = open.filter(r => {\n"
                "  const mod = new Date(r.last_modified || r.updated_at || 0).getTime();\n"
                "  return Date.now() - mod > 21*24*60*60*1000;\n"
                "});\n"
                "return [{ json: { total_pipe: total_pipe.toFixed(0), total_won: total_won.toFixed(0),\n"
                "  attainment, stale_deals: stale.length, open_deals: open.length,\n"
                "  week: new Date().toISOString().slice(0,10) } }];"),
          _slack(_uid(), "Weekly Sales Forecast", x0+660, y, "#sales-ops",
                f"\U0001f4b9 *{task_name} \u2014 {{{{ $json.week }}}}*\n"
                "Won: ${{{{ $json.total_won }}}} | Attainment: {{{{ $json.attainment }}}}\n"
                "Pipeline: ${{{{ $json.total_pipe }}}} | Open: {{{{ $json.open_deals }}}} | Stale: {{{{ $json.stale_deals }}}}"),
          _sheets_append(_uid(), "Log Forecast Snapshot", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_recruiting(task_name, x0):
    """Recruiting: track candidate pipeline stages, flag stalled, weekly summary."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 9 * * 1"),
          _sheets_read(_uid(), "Load Candidate Pipeline", x0+220, y),
          _code(_uid(), "Analyse Pipeline", x0+440, y,
                "const candidates = items.map(i => i.json);\n"
                "const stages = {};\n"
                "candidates.forEach(c => { const s=c.stage||'Unknown'; stages[s]=(stages[s]||0)+1; });\n"
                "const stalled = candidates.filter(c => {\n"
                "  const upd = new Date(c.last_updated || c.modified || 0).getTime();\n"
                "  return Date.now() - upd > 7*24*60*60*1000 && c.stage !== 'Hired' && c.stage !== 'Rejected';\n"
                "});\n"
                "const stage_summary = Object.entries(stages).map(([s,n])=>`${s}: ${n}`).join(' | ');\n"
                "return [{ json: {\n"
                "  total: candidates.length, stalled: stalled.length,\n"
                "  stages: stage_summary,\n"
                "  stalled_names: stalled.slice(0,3).map(c=>c.name||'?').join(', '),\n"
                "  week: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Recruiting Weekly Digest", x0+660, y, "#recruiting",
                f"\U0001f464 *{task_name} \u2014 {{{{ $json.week }}}}*\n"
                "Total: {{{{ $json.total }}}} | Stalled: {{{{ $json.stalled }}}}\n"
                "Stages: {{{{ $json.stages }}}}\nStalled: {{{{ $json.stalled_names }}}}"),
          _gmail_send(_uid(), "Email Pipeline Report", x0+880, y,
                subject=f"Weekly Recruiting Pipeline: {task_name}",
                body="Total: ={{ $json.total }}, Stalled: ={{ $json.stalled }}, Stages: ={{ $json.stages }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_onboarding(task_name, x0):
    """Onboarding: webhook for new hire -> create task checklist -> notify manager."""
    y, n = _Y_START, []
    n += [_webhook(_uid(), "New Hire Webhook", x0, y, "new-hire"),
          _code(_uid(), "Build Onboarding Plan", x0+220, y,
                "const hire = items[0].json;\n"
                "const name = hire.name || hire.employee_name || 'New Hire';\n"
                "const role = hire.role || hire.title || 'Team Member';\n"
                "const start = hire.start_date || new Date().toISOString().slice(0,10);\n"
                "const manager = hire.manager || hire.manager_email || 'manager@company.com';\n"
                "const checklist = [\n"
                "  'Send welcome email and first-day schedule',\n"
                "  'Set up laptop and software access',\n"
                "  'Add to Slack channels and Google Workspace',\n"
                "  'Schedule 1:1 with manager for day 1',\n"
                "  'Share team handbook and culture docs',\n"
                "  'Assign onboarding buddy',\n"
                "  'Schedule 30/60/90 day check-ins'\n"
                "].map((t,i)=>`${i+1}. ${t}`).join('\\n');\n"
                "return [{ json: { name, role, start, manager, checklist } }];"),
          _notion(_uid(), "Create Onboarding Page", x0+440, y, "create"),
          _slack(_uid(), "Notify Manager", x0+660, y, "#hr",
                f"\U0001f389 *New Hire Onboarding \u2014 {task_name}*\n"
                "Name: {{{{ $json.name }}}} | Role: {{{{ $json.role }}}} | Start: {{{{ $json.start }}}}\n"
                "Manager: {{{{ $json.manager }}}}\n\n{{{{ $json.checklist }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[1]["name"],n[3]["name"])])
    return n, c

def _wf_data_engineering(task_name, x0):
    """Data engineering: monitor ETL pipeline health, failed jobs, data quality."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "*/30 * * * *"),
          _http(_uid(), "Check Pipeline Status", x0+220, y,
                "={{ $vars.PIPELINE_STATUS_API || 'https://api.example.com/pipelines/status' }}"),
          _code(_uid(), "Detect Failed Jobs", x0+440, y,
                "const data = items[0].json;\n"
                "const jobs = Array.isArray(data) ? data : data.jobs || [data];\n"
                "const failed = jobs.filter(j => j.status === 'failed' || j.status === 'error');\n"
                "const slow = jobs.filter(j => j.duration_minutes && j.duration_minutes > 60);\n"
                "if (!failed.length && !slow.length) return [];\n"
                "return [{ json: {\n"
                "  failed_count: failed.length,\n"
                "  slow_count: slow.length,\n"
                "  failed_jobs: failed.slice(0,3).map(j=>j.name||j.id||'unknown').join(', '),\n"
                "  slow_jobs: slow.slice(0,2).map(j=>`${j.name||'?'} (${j.duration_minutes}min)`).join(', '),\n"
                "  timestamp: new Date().toISOString()\n"
                "}}];"),
          _slack(_uid(), "Pipeline Failure Alert", x0+660, y, "#data-engineering",
                f"\U0001f6a8 *Pipeline Alert \u2014 {task_name}*\n"
                "Failed: {{{{ $json.failed_count }}}} ({{{{ $json.failed_jobs }}}})\n"
                "Slow: {{{{ $json.slow_count }}}} ({{{{ $json.slow_jobs }}}})\n_{{{{ $json.timestamp }}}}_")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[2]["name"],n[3]["name"])])
    return n, c


def _wf_security(task_name, x0):
    """Security: scan access logs for anomalies, failed logins, cert expiry."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 6 * * 1-5"),
          _sheets_read(_uid(), "Load Security Log Data", x0+220, y),
          _code(_uid(), "Detect Anomalies", x0+440, y,
                "const logs = items.map(i => i.json);\n"
                "const failed_logins = logs.filter(l => l.event_type === 'failed_login' || l.status === 'failed');\n"
                "const new_ips = logs.filter(l => l.is_new_ip === true || l.is_new_ip === 'true');\n"
                "const after_hours = logs.filter(l => {\n"
                "  const hr = new Date(l.timestamp || 0).getHours();\n"
                "  return hr < 6 || hr > 22;\n"
                "});\n"
                "if (!failed_logins.length && !new_ips.length && !after_hours.length) return [];\n"
                "return [{ json: {\n"
                "  failed_logins: failed_logins.length,\n"
                "  new_ips: new_ips.length,\n"
                "  after_hours: after_hours.length,\n"
                "  top_user: failed_logins[0]?.user || failed_logins[0]?.email || 'unknown',\n"
                "  date: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Security Anomaly Alert", x0+660, y, "#security",
                f"\U0001f512 *Security Alert \u2014 {task_name}*\n"
                "Failed logins: {{{{ $json.failed_logins }}}} | New IPs: {{{{ $json.new_ips }}}}\n"
                "After-hours activity: {{{{ $json.after_hours }}}} | Top user: {{{{ $json.top_user }}}}"),
          _gmail_send(_uid(), "Email Security Report", x0+880, y,
                subject=f"Security Alert: {task_name}",
                body="Failed logins: ={{ $json.failed_logins }}, New IPs: ={{ $json.new_ips }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_cloud_infra(task_name, x0):
    """Cloud/infra: fetch AWS/GCP cost and usage, flag anomalies, weekly report."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1"),
          _http(_uid(), "Fetch Cloud Cost Data", x0+220, y,
                "={{ $vars.CLOUD_COST_API || 'https://api.example.com/cloud/costs' }}"),
          _code(_uid(), "Detect Cost Anomalies", x0+440, y,
                "const data = items[0].json;\n"
                "const services = Array.isArray(data) ? data : data.services || [data];\n"
                "const total = services.reduce((s,sv) => s+(Number(sv.cost)||0), 0);\n"
                "const prev_total = services.reduce((s,sv) => s+(Number(sv.prev_cost)||0), 0);\n"
                "const delta_pct = prev_total ? ((total-prev_total)/prev_total*100).toFixed(1) : '0';\n"
                "const spikes = services.filter(sv => {\n"
                "  const prev = Number(sv.prev_cost)||0;\n"
                "  return prev > 0 && (Number(sv.cost)||0)/prev > 1.3;\n"
                "});\n"
                "return [{ json: {\n"
                "  total: total.toFixed(2), prev_total: prev_total.toFixed(2),\n"
                "  delta: delta_pct+'%', spikes: spikes.length,\n"
                "  spike_services: spikes.slice(0,3).map(s=>s.service||s.name||'?').join(', '),\n"
                "  week: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Cloud Cost Report", x0+660, y, "#infrastructure",
                f"\u2601\ufe0f *{task_name} \u2014 {{{{ $json.week }}}}*\n"
                "Total: ${{{{ $json.total }}}} | vs prev: {{{{ $json.delta }}}}\n"
                "Cost spikes: {{{{ $json.spikes }}}} services ({{{{ $json.spike_services }}}})"),
          _gmail_send(_uid(), "Email Cost Report", x0+880, y,
                subject=f"Cloud Cost Report: {task_name}",
                body="Week: ={{ $json.week }}, Total: $={{ $json.total }}, vs prev: ={{ $json.delta }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_product_analytics(task_name, x0):
    """Product analytics: pull funnel data, flag drop-offs, A/B test alerts."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1-5"),
          _http(_uid(), "Fetch Funnel Metrics", x0+220, y,
                "={{ $vars.ANALYTICS_API || 'https://api.example.com/analytics/funnel' }}"),
          _code(_uid(), "Detect Drop-offs", x0+440, y,
                "const data = items[0].json;\n"
                "const steps = Array.isArray(data) ? data : data.steps || [data];\n"
                "const drop_offs = [];\n"
                "for (let i=1; i<steps.length; i++) {\n"
                "  const prev = Number(steps[i-1].users || steps[i-1].count || 0);\n"
                "  const curr = Number(steps[i].users || steps[i].count || 0);\n"
                "  const drop = prev > 0 ? ((prev-curr)/prev*100).toFixed(1) : '0';\n"
                "  if (Number(drop) > 40) drop_offs.push(`${steps[i].name||`Step ${i}`}: -${drop}%`);\n"
                "}\n"
                "return [{ json: {\n"
                "  total_steps: steps.length,\n"
                "  critical_drops: drop_offs.length,\n"
                "  drop_list: drop_offs.join('\\n') || 'No critical drops',\n"
                "  top_step: steps[0]?.name || 'Entry',\n"
                "  date: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Funnel Drop-off Alert", x0+660, y, "#product-analytics",
                f"\U0001f4c9 *{task_name} \u2014 {{{{ $json.date }}}}*\n"
                "Critical drops: {{{{ $json.critical_drops }}}}\n{{{{ $json.drop_list }}}}"),
          _sheets_append(_uid(), "Log Funnel Snapshot", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_ecommerce(task_name, x0):
    """Ecommerce: process new orders, low inventory alerts, abandoned cart digest."""
    y, n = _Y_START, []
    n += [_webhook(_uid(), "New Order Webhook", x0, y, "ecommerce-order"),
          _code(_uid(), "Process Order", x0+220, y,
                "const order = items[0].json;\n"
                "const total = Number(order.total || order.amount || 0).toFixed(2);\n"
                "const items_count = order.items?.length || order.line_items?.length || 1;\n"
                "const customer = order.customer?.name || order.billing?.first_name || 'Customer';\n"
                "const email = order.customer?.email || order.billing?.email || '';\n"
                "const order_id = order.id || order.order_number || 'N/A';\n"
                "const sku_list = (order.items||order.line_items||[]).map(i=>i.sku||i.product_id||'?').slice(0,3);\n"
                "return [{ json: { order_id, customer, email, total, items_count,\n"
                "  skus: sku_list.join(', '), received: new Date().toISOString() } }];"),
          _sheets_append(_uid(), "Log Order to Sheet", x0+440, y),
          _slack(_uid(), "New Order Alert", x0+660, y, "#ecommerce",
                f"\U0001f6d2 *New Order \u2014 {task_name}*\n"
                "Order: {{{{ $json.order_id }}}} | Customer: {{{{ $json.customer }}}}\n"
                "Total: ${{{{ $json.total }}}} | Items: {{{{ $json.items_count }}}} | SKUs: {{{{ $json.skus }}}}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[1]["name"],n[3]["name"])])
    return n, c


def _wf_logistics(task_name, x0):
    """Logistics: track shipments, flag delivery exceptions, warehouse alerts."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 7,13 * * 1-5"),
          _http(_uid(), "Fetch Shipment Status", x0+220, y,
                "={{ $vars.LOGISTICS_API || 'https://api.example.com/shipments/active' }}"),
          _code(_uid(), "Flag Exceptions", x0+440, y,
                "const shipments = Array.isArray(items[0].json) ? items[0].json : [items[0].json];\n"
                "const exceptions = shipments.filter(s =>\n"
                "  ['delayed','exception','failed_delivery','returned'].includes((s.status||'').toLowerCase()));\n"
                "const on_time = shipments.filter(s => s.status === 'delivered');\n"
                "if (!exceptions.length) return [{ json: {\n"
                "  total: shipments.length, exceptions: 0, on_time: on_time.length,\n"
                "  status: 'All shipments on track', date: new Date().toISOString().slice(0,10) } }];\n"
                "return exceptions.slice(0,5).map(s => ({ json: {\n"
                "  tracking: s.tracking_number || s.id || 'N/A',\n"
                "  status: s.status, carrier: s.carrier || 'Unknown',\n"
                "  destination: s.destination || 'Unknown',\n"
                "  exception_reason: s.exception_reason || s.reason || 'No reason given'\n"
                "}}));"),
          _slack(_uid(), "Shipment Exception Alert", x0+660, y, "#logistics",
                f"\U0001f4e6 *{task_name} Alert*\n"
                "Tracking: {{{{ $json.tracking }}}} | Status: {{{{ $json.status }}}}\n"
                "Carrier: {{{{ $json.carrier }}}} | Reason: {{{{ $json.exception_reason }}}}"),
          _sheets_append(_uid(), "Log Exceptions", x0+880, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c

def _wf_procurement(task_name, x0):
    """Procurement: PO approval workflow, vendor invoice tracking, budget alerts."""
    y, n = _Y_START, []
    n += [_webhook(_uid(), "New Purchase Request", x0, y, "purchase-request"),
          _code(_uid(), "Validate & Route PO", x0+220, y,
                "const po = items[0].json;\n"
                "const amount = Number(po.amount || po.total || 0);\n"
                "const vendor = po.vendor || po.supplier || 'Unknown Vendor';\n"
                "const requester = po.requester || po.requested_by || 'Unknown';\n"
                "const category = po.category || po.cost_center || 'General';\n"
                "let approver = 'manager@company.com';\n"
                "let channel = '#procurement';\n"
                "if (amount > 10000) { approver = 'cfo@company.com'; channel = '#finance-approvals'; }\n"
                "else if (amount > 1000) { approver = 'finance@company.com'; channel = '#procurement'; }\n"
                "return [{ json: { amount: amount.toFixed(2), vendor, requester,\n"
                "  category, approver, channel, po_id: po.id || Date.now().toString(),\n"
                "  submitted: new Date().toISOString() } }];"),
          _slack(_uid(), "Request PO Approval", x0+440, y, "={{ $json.channel }}",
                f"\U0001f4b0 *PO Approval Required \u2014 {task_name}*\n"
                "PO: {{{{ $json.po_id }}}} | Vendor: {{{{ $json.vendor }}}}\n"
                "Amount: ${{{{ $json.amount }}}} | Category: {{{{ $json.category }}}}\n"
                "Requester: {{{{ $json.requester }}}} | Approver: {{{{ $json.approver }}}}"),
          _sheets_append(_uid(), "Log PO to Register", x0+660, y)]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),(n[1]["name"],n[3]["name"])])
    return n, c


def _wf_compliance(task_name, x0):
    """Compliance: track policy review deadlines, audit prep tasks, reg alerts."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 9 * * 1"),
          _sheets_read(_uid(), "Load Compliance Register", x0+220, y),
          _code(_uid(), "Flag Upcoming Deadlines", x0+440, y,
                "const items2 = items.map(i => i.json);\n"
                "const now = Date.now();\n"
                "const days30 = 30*24*60*60*1000;\n"
                "const days7 = 7*24*60*60*1000;\n"
                "const critical = items2.filter(r => {\n"
                "  const due = new Date(r.deadline || r.due_date || 0).getTime();\n"
                "  return due > now && due < now + days7;\n"
                "});\n"
                "const upcoming = items2.filter(r => {\n"
                "  const due = new Date(r.deadline || r.due_date || 0).getTime();\n"
                "  return due > now + days7 && due < now + days30;\n"
                "});\n"
                "return [{ json: {\n"
                "  critical: critical.length,\n"
                "  upcoming: upcoming.length,\n"
                "  critical_list: critical.map(r=>`${r.requirement||r.name||'?'} (due ${r.deadline||'?'})`).join('\\n'),\n"
                "  week: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "Compliance Deadline Alert", x0+660, y, "#compliance",
                f"\u2696\ufe0f *{task_name} \u2014 {{{{ $json.week }}}}*\n"
                "\U0001f534 Critical (7d): {{{{ $json.critical }}}}\n{{{{ $json.critical_list }}}}\n"
                "\U0001f7e1 Upcoming (30d): {{{{ $json.upcoming }}}}"),
          _gmail_send(_uid(), "Email Compliance Alert", x0+880, y,
                subject=f"Compliance Deadline Alert: {task_name}",
                body="Critical: ={{ $json.critical }}, Upcoming: ={{ $json.upcoming }}\n={{ $json.critical_list }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_investor_relations(task_name, x0):
    """IR: board report prep digest, fundraising pipeline, investor email tracker."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1"),
          _sheets_read(_uid(), "Load Investor Pipeline", x0+220, y),
          _code(_uid(), "Compile IR Digest", x0+440, y,
                "const rows = items.map(i => i.json);\n"
                "const stages = { interested:0, diligence:0, committed:0, passed:0 };\n"
                "let total_committed = 0;\n"
                "rows.forEach(r => {\n"
                "  const s = (r.stage||'').toLowerCase();\n"
                "  if (s in stages) stages[s]++;\n"
                "  if (s === 'committed') total_committed += Number(r.amount||0);\n"
                "});\n"
                "return [{ json: {\n"
                "  total_investors: rows.length,\n"
                "  committed: stages.committed, committed_amount: total_committed.toFixed(0),\n"
                "  in_diligence: stages.diligence, interested: stages.interested,\n"
                "  week: new Date().toISOString().slice(0,10)\n"
                "}}];"),
          _slack(_uid(), "IR Weekly Digest", x0+660, y, "#investor-relations",
                f"\U0001f4b8 *{task_name} \u2014 {{{{ $json.week }}}}*\n"
                "Committed: {{{{ $json.committed }}}} (${{{{ $json.committed_amount }}}})\n"
                "In diligence: {{{{ $json.in_diligence }}}} | Interested: {{{{ $json.interested }}}}"),
          _gmail_send(_uid(), "Email IR Report", x0+880, y,
                subject=f"Weekly IR Update: {task_name}",
                body="Committed: $={{ $json.committed_amount }}, Diligence: ={{ $json.in_diligence }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_executive(task_name, x0):
    """Executive: daily briefing from multiple sources — KPIs, news, calendar."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "30 7 * * 1-5"),
          _calendar(_uid(), "Get Today Meetings", x0+220, y),
          _code(_uid(), "Build Executive Brief", x0+440, y,
                "const meetings = items.map(i => i.json);\n"
                "const mlines = meetings.slice(0,5).map(e => {\n"
                "  const t = e.start?.dateTime?.slice(11,16) || 'All day';\n"
                "  return `\u2022 ${t} \u2014 ${e.summary||'Meeting'}`;\n"
                "});\n"
                "const date = new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'});\n"
                "return [{ json: {\n"
                "  date,\n"
                "  meetings_count: meetings.length,\n"
                "  schedule: mlines.join('\\n') || 'No meetings today'\n"
                "}}];"),
          _slack(_uid(), "Post Executive Brief", x0+660, y, "#executives",
                f"\U0001f31f *Daily Brief \u2014 {{{{ $json.date }}}}*\n"
                f"*{task_name}*\n\n"
                "\U0001f4c5 *Today ({{{{ $json.meetings_count }}}} meetings)*\n{{{{ $json.schedule }}}}"),
          _gmail_send(_uid(), "Email Daily Brief", x0+880, y,
                subject=f"Daily Executive Brief: {task_name}",
                body="Date: ={{ $json.date }}\nMeetings: ={{ $json.meetings_count }}\n={{ $json.schedule }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_academic(task_name, x0):
    """Academic: track paper submission deadlines, citation alerts, grant status."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 9 * * 1"),
          _sheets_read(_uid(), "Load Academic Deadlines", x0+220, y),
          _code(_uid(), "Flag Paper Deadlines", x0+440, y,
                "const items2 = items.map(i => i.json);\n"
                "const now = Date.now();\n"
                "const days14 = 14*24*60*60*1000;\n"
                "const upcoming = items2.filter(r => {\n"
                "  const due = new Date(r.deadline || r.submission_date || 0).getTime();\n"
                "  return due > now && due < now + days14;\n"
                "});\n"
                "return upcoming.map(r => ({ json: {\n"
                "  title: (r.title || r.conference || r.journal || 'Unknown').slice(0,60),\n"
                "  deadline: r.deadline || r.submission_date,\n"
                "  type: r.type || r.category || 'Submission',\n"
                "  days_left: Math.ceil((new Date(r.deadline||r.submission_date||0)-now)/86400000)\n"
                "}}));"),
          _slack(_uid(), "Academic Deadline Reminder", x0+660, y, "#research",
                f"\U0001f4da *{task_name} Deadline*\n"
                "{{{{ $json.type }}}}: {{{{ $json.title }}}}\n"
                "Due: {{{{ $json.deadline }}}} ({{{{ $json.days_left }}}} days)"),
          _gmail_send(_uid(), "Email Deadline Reminder", x0+880, y,
                subject=f"Academic Deadline: {task_name}",
                body="Title: ={{ $json.title }}\nDeadline: ={{ $json.deadline }}\nDays left: ={{ $json.days_left }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c


def _wf_healthcare_admin(task_name, x0):
    """Healthcare admin: appointment reminders, billing follow-ups, compliance."""
    y, n = _Y_START, []
    n += [_sched(_uid(), x0, y, "0 8 * * 1-5"),
          _sheets_read(_uid(), "Load Appointment Schedule", x0+220, y),
          _code(_uid(), "Build Reminder List", x0+440, y,
                "const appts = items.map(i => i.json);\n"
                "const tomorrow = new Date();\n"
                "tomorrow.setDate(tomorrow.getDate()+1);\n"
                "const tmrw_str = tomorrow.toISOString().slice(0,10);\n"
                "const upcoming = appts.filter(a => (a.date||a.appointment_date||'').startsWith(tmrw_str));\n"
                "const no_shows = appts.filter(a => a.status === 'no_show' && !a.follow_up_sent);\n"
                "return [{ json: {\n"
                "  upcoming_count: upcoming.length,\n"
                "  upcoming_list: upcoming.slice(0,5).map(a=>`${a.time||'?'} \u2014 ${a.patient||a.name||'?'}`).join('\\n'),\n"
                "  no_show_count: no_shows.length,\n"
                "  date: tmrw_str\n"
                "}}];"),
          _slack(_uid(), "Appointment Reminder Digest", x0+660, y, "#admin",
                f"\U0001f3e5 *{task_name} \u2014 Tomorrow {{{{ $json.date }}}}*\n"
                "Appointments: {{{{ $json.upcoming_count }}}}\n{{{{ $json.upcoming_list }}}}\n"
                "No-shows to follow up: {{{{ $json.no_show_count }}}}"),
          _gmail_send(_uid(), "Email Admin Digest", x0+880, y,
                subject=f"Daily Schedule: {task_name}",
                body="Tomorrow: ={{ $json.date }}, Appointments: ={{ $json.upcoming_count }}, No-shows: ={{ $json.no_show_count }}")]
    c = _conns([(n[0]["name"],n[1]["name"]),(n[1]["name"],n[2]["name"]),
                (n[2]["name"],n[3]["name"]),(n[2]["name"],n[4]["name"])])
    return n, c
