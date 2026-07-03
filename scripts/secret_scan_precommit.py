#!/usr/bin/env python3
"""
Pre-commit secret scanner. Scans STAGED content (what's about to be committed)
and blocks the commit if anything looks like a secret. This is the structural
guard that makes leaking a secret hard: you'd have to pass --no-verify on purpose.

Wire it up once (from repo root):
    git config core.hooksPath .githooks
    # (the .githooks/pre-commit script calls this)

Runs on the exact bytes staged (git diff --cached), so it catches secrets even
in files that are otherwise gitignored the moment they're staged.
"""
import re
import subprocess
import sys

# High-signal secret patterns. Add provider prefixes as you adopt new services.
PATTERNS = {
    "anthropic_key": r"sk-ant-[a-zA-Z0-9_-]{20,}",
    "resend_key":    r"re_[a-zA-Z0-9]{20,}",
    "render_key":    r"rnd_[a-zA-Z0-9]{20,}",
    "tavily_key":    r"tvly-[a-zA-Z0-9]{20,}",
    "openai_key":    r"sk-[a-zA-Z0-9]{40,}",
    "github_pat":    r"ghp_[a-zA-Z0-9]{30,}",
    "aws_access":    r"AKIA[0-9A-Z]{16}",
    "turso_token":   r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}",  # JWT-shaped
    "private_key":   r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----",
}

# Explicit blocklist: known-compromised values that must never reappear.
# (No live secrets here — only burned ones we're permanently banning.)
BLOCKLIST = [
    "AKF6uTJalPohB4dtymnEiwZrLDRqSWkc",   # old admin secret (rotated)
]

# Files that legitimately contain the *patterns themselves* (the scanners), so
# we don't flag our own regex definitions.
ALLOW_PATH_SUBSTRINGS = (
    "scripts/secret_scan",
    "tests/_secret_scan",
    ".githooks/",
)


def staged_files():
    out = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
        capture_output=True, text=True,
    )
    return [f for f in out.stdout.splitlines() if f.strip()]


def staged_blob(path):
    # Read the staged version (":path"), not the working tree.
    out = subprocess.run(["git", "show", f":{path}"], capture_output=True, text=True)
    return out.stdout if out.returncode == 0 else ""


def main():
    hits = []
    for path in staged_files():
        if any(s in path.replace("\\", "/") for s in ALLOW_PATH_SUBSTRINGS):
            continue
        content = staged_blob(path)
        if not content:
            continue
        for name, pat in PATTERNS.items():
            for m in re.finditer(pat, content):
                hits.append((path, name, m.group()[:16] + "..."))
        for bad in BLOCKLIST:
            if bad in content:
                hits.append((path, "blocklisted_value", bad[:8] + "..."))

    if hits:
        print("\n[COMMIT BLOCKED] possible secret(s) in staged changes:\n")
        for path, kind, sample in hits:
            print(f"   {kind:18} {path}   ({sample})")
        print("\nSecrets must live in environment variables / .env (gitignored), never in source.")
        print("If this is a false positive, review carefully, then bypass with:  git commit --no-verify")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
