import re, subprocess, pathlib, sys
root = pathlib.Path(r"C:\Users\damya\Projects\workscanai")
out = subprocess.run(["git","-C",str(root),"ls-files"], capture_output=True, text=True, check=True)
files = [root / f for f in out.stdout.splitlines()]
patterns = {
    "anthropic_key": r"sk-ant-[a-zA-Z0-9_-]{20,}",
    "resend_key":    r"re_[a-zA-Z0-9_-]{20,}",
    "render_key":    r"rnd_[a-zA-Z0-9]{20,}",
    "tavily_key":    r"tvly-[a-zA-Z0-9]{20,}",
    "openai_key":    r"sk-[a-zA-Z0-9]{40,}",
    "github_pat":    r"ghp_[a-zA-Z0-9]{30,}",
    "aws_access":    r"AKIA[0-9A-Z]{16}",
}
hits = 0
for f in files:
    if not f.exists() or f.is_dir() or f.stat().st_size > 5_000_000:
        continue
    try:
        txt = f.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        continue
    for name, pat in patterns.items():
        for m in re.finditer(pat, txt):
            print(f"HIT {name} in {f.relative_to(root)}: {m.group()[:50]}...")
            hits += 1
print(f"Scanned {len(files)} tracked files, hits: {hits}")
sys.exit(0 if hits == 0 else 1)
