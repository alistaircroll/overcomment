# Overcomment

Overcomment is an agent skill for forensic code audits. It turns a disposable copy of a codebase into a durable dependency and diagnostics map by adding evidence-backed comments to every audited codepoint.

The workflow is intentionally invasive inside the audit copy:

- trace callers, imports, routes, jobs, tests, configs, and runtime entrypoints before judging code
- add `@FORENSIC_AUDIT` comments near each function, class, export, route, job, schema, and nontrivial algorithm
- score each codepoint with `@PASS_SCORE` for Performance, Availability, Scalability, and Security
- use the annotated copy for later unused-code, redundancy, contradiction, and risk-ranking passes

## Contents

- `SKILL.md` - the portable skill instructions
- `scripts/extract-pass-scores.cjs` - ranks `@PASS_SCORE` blocks from an annotated copy
- `agents/openai.yaml` - optional UI metadata for OpenAI-compatible skill loaders

## Use

Install or reference this directory as a skill in any agent environment that supports Markdown skills. Invoke it when you want an audit copy of a codebase overcommented with dependency traces and PASS scoring.

After annotating a copy, rank low-scoring codepoints:

```bash
node scripts/extract-pass-scores.cjs path/to/annotated-copy
node scripts/extract-pass-scores.cjs path/to/annotated-copy --json
```

The script requires Node.js and has no package dependencies.

## Safety

Run this against a disposable copy, worktree, or branch made for audit annotations. The skill is designed to mass-edit code comments; it is not designed to patch production logic during the audit.
