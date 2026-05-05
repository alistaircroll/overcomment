---
name: overcomment
description: Use when performing deep forensic code audits that should overcomment a copied codebase with dependency traces, diagnostics, unused-code analysis, redundancy or contradiction review, or PASS scoring for performance, availability, scalability, and security.
---

# Overcomment

## Overview

Run an evidence-first audit by turning a copied codebase into a durable dependency and diagnostics map. The core move is Overcommenting: mass-edit every audited codepoint in the copy so later passes can inspect annotations instead of rediscovering dependency evidence.

## Operating Rules

- Do not guess. Trace definitions, exports, imports, callers, routes, tests, jobs, configs, and runtime entrypoints with `rg`, language tooling, and file reads before annotating.
- Work in a disposable audit copy. If the user provides a copied codebase, annotate that copy. If not, create or ask to create a git worktree/filesystem copy before mass edits.
- Mass-edit the audit copy. Add forensic comments for every audited function, class, export, route, job, command, schema, and nontrivial algorithm. This is the point of the skill.
- Keep comments factual and evidence-backed. Do not rewrite implementation logic while auditing unless the user separately asks for fixes.
- Treat "unused" as unproven until entrypoints, dynamic imports, public APIs, CLIs, tests, config references, and framework conventions have been checked.
- Exclude generated, vendored, minified, build-output, and dependency files unless the user asks to audit them.
- Lead final output with where the annotated copy lives, then findings, exact file/line references, evidence, and residual uncertainty.

## Workflow

1. Establish the audit copy.
   Identify the source repository, target directories, languages, production entrypoints, and the path to the copy that will be annotated. Do not annotate the user's active working tree unless they explicitly identify it as the audit copy. For large repos, process batches and track completed directories.

2. Build a code inventory.
   Use `rg --files` and targeted searches to map modules, exports, classes, functions, public APIs, route handlers, jobs, tests, config, and data boundaries. Record each audited codepoint as `file:line symbol`.

3. Overcomment the audit copy.
   Add a comment near every codepoint using the local language's comment style. In TypeScript/JavaScript, prefer a doc block immediately above the declaration:

   ```typescript
   /**
    * @FORENSIC_AUDIT
    * Why it exists: ...
    * Direct dependencies: ...
    * Known dependents: ...
    * Contracts and invariants: ...
    * Execution path: ...
    * Diagnostics: ...
    * Evidence searched: ...
    * Open uncertainty: ...
    *
    * @PASS_SCORE file=src/example.ts symbol=handleRequest line=42
    * - Performance: 7/10 (One DB lookup per call; no obvious N+1 loop)
    * - Availability: 5/10 (No timeout or retry around the upstream request)
    * - Scalability: 6/10 (Stateless, but fan-out grows linearly with each account)
    * - Security: 8/10 (Uses centralized authorization before data access)
    */
   export function handleRequest() {}
   ```

   In other languages, use idiomatic block or line comments and preserve parseability. If a file has many small declarations, batch annotations carefully with the available file-editing tool so each codepoint still has its own `@FORENSIC_AUDIT` and `@PASS_SCORE`.

4. Run four passes.
   - **Unused Code:** Search annotations for code with no proven dependents or runtime entrypoint. Mark confidence and the searches performed.
   - **Redundancy:** Compare annotations for duplicated responsibilities, parallel helpers, repeated validation, copy-pasted control flow, and near-identical schemas.
   - **Contradictions:** Compare annotations for naming drift, incompatible contracts, inconsistent error handling, conflicting auth or validation rules, and one-off patterns.
   - **PASS Scoring:** Ensure every audited function, class, exported value, route, job, and nontrivial algorithm has Performance, Availability, Scalability, and Security scores.

5. Produce a prioritized report.
   Run the score extractor over the annotated copy, then sort findings by severity and evidence strength. Include low PASS totals, then unused/redundant/contradictory code. Mention tests or commands used to confirm behavior.

## PASS Scoring

Use 1-10 scores where 10 is strong and 1 is dangerous or badly deficient. Score the code as it exists, not as intended.

| Dimension | Look For |
|---|---|
| Performance | Algorithmic complexity, quadratic/cubic behavior, nested loops over unbounded data, blocking work, sync I/O in request paths, repeated I/O, N+1 queries, chatty network calls, waterfall awaits, unnecessary serialization/deserialization, repeated JSON parsing/stringifying, large object cloning, excessive allocations, cache misses, missing memoization, stale or unbounded caches, inefficient database scans, missing indexes, full table scans, unpaginated reads, eager loading, loading whole files into memory, regex backtracking, polling, busy waiting, sleep-based waits, excessive logging in hot paths, CPU-bound work on event loops, lock contention, unnecessary compression/encryption, repeated sorting/filtering, avoidable retries, inefficient batch sizes |
| Availability | Error handling, retries, backoff, jitter, idempotency, graceful degradation, fallback behavior, circuit breakers, timeouts, cancellation, cleanup, resource release, connection pooling, dependency failure behavior, partial outage behavior, input validation, malformed input handling, null/undefined handling, empty state handling, panic/crash risk, unhandled promises, swallowed errors, silent failure, infinite retry loops, retry storms, dead-letter handling, poison messages, transaction rollback, compensation logic, startup failure, shutdown behavior, health checks, readiness checks, observability, alertability, rate-limit handling, quota exhaustion, disk/memory exhaustion, clock skew, network partitions, third-party API outage handling, migration failure behavior |
| Scalability | Contention, shared mutable state, global state, singletons, queues, fan-out, fan-in bottlenecks, memory growth, leaks, unbounded arrays/maps/sets, race conditions, thundering herd, stampedes, head-of-line blocking, serial processing where parallelism is safe, parallel processing without bounds, worker pool saturation, connection exhaustion, file descriptor exhaustion, high-cardinality metrics, large tenant hotspots, noisy-neighbor risk, per-user/per-agent state growth, unbounded concurrency, batch size limits, pagination, streaming, backpressure, sharding/partitioning assumptions, ordering assumptions, distributed locks, cache invalidation, coordination overhead, cross-region latency, cold starts, load spikes, data skew, behavior under thousands of users/agents/jobs/messages |
| Security | Authn gaps, authz gaps, missing ownership checks, confused deputy risk, privilege escalation, injection, SQL/NoSQL/command/template/header injection, XSS, CSRF, SSRF, unsafe deserialization, path traversal, open redirects, secrets in code/logs/errors, token leakage, credential reuse, weak cryptography, insecure randomness, missing TLS validation, overbroad CORS, unsafe defaults, data exposure, PII leakage, excessive error detail, insecure direct object references, missing audit logs, missing rate limits, brute-force exposure, replay attacks, request smuggling, prototype pollution, dependency vulnerabilities, supply-chain risk, unsafe file upload/download, zip slip, symlink traversal, sandbox escape, tenant isolation gaps, prompt injection/tool injection for AI code, stale permissions, missing revocation, insecure temporary files |

Use the table as a search vocabulary, not as proof. When a term appears, trace the actual execution path and score the concrete behavior.

Score anchors:

- `9-10`: Strong for expected production use; any weaknesses are minor and documented.
- `7-8`: Generally sound with bounded risks or ordinary improvement opportunities.
- `4-6`: Meaningful risk under realistic load, failure, growth, or hostile input.
- `1-3`: Severe flaw, likely incident source, exploitable behavior, or fundamentally brittle design.

Use this block format in source annotations so the bundled extractor can rank results:

```markdown
@PASS_SCORE file=src/example.ts symbol=handleRequest line=42
- Performance: 7/10 (One DB lookup per call; no obvious N+1 loop)
- Availability: 5/10 (No timeout or retry around the upstream request)
- Scalability: 6/10 (Stateless, but fan-out grows linearly with each account)
- Security: 8/10 (Uses centralized authorization before data access)
```

The `file`, `symbol`, and `line` metadata should refer to the annotated copy's codepoint location at the time of annotation.

## Evidence Commands

Prefer fast, repeatable searches:

```bash
rg --files
rg "symbolName|from ['\"].*module|require\\(.*module"
rg "routeName|jobName|commandName|envVarName"
rg "@PASS_SCORE" .
node scripts/extract-pass-scores.cjs <annotated-copy>
```

Use language-aware tools when available, but keep the evidence trail explicit enough that another reviewer can reproduce it.

## Bundled Script

`scripts/extract-pass-scores.cjs` scans Markdown and common source files for `@PASS_SCORE` blocks in the annotated copy, sorts the lowest totals first, and emits Markdown by default. Use `--json` for machine-readable output.

Example:

```bash
node scripts/extract-pass-scores.cjs docs/forensic-audit.md
node scripts/extract-pass-scores.cjs . --json
```
