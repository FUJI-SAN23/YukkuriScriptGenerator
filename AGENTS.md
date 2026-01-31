# AGENTS.md

This file defines **mandatory rules and guardrails for AI agents**
(e.g. Codex, Cursor, Copilot-style tools) working in this repository.

AI agents MUST follow these instructions strictly.

---

## 1. Security guardrails (highest priority)

### Secrets handling

- NEVER print, log, commit, or paste secrets into the repository.
- Secrets include (but are not limited to):
  - Webhook tokens
  - Google Apps Script Web App URLs
  - Spreadsheet IDs
  - API keys
  - OAuth tokens
- Do NOT include secrets in:
  - source code
  - README
  - issues
  - examples
  - logs
  - comments

### Logging

- Do NOT log request headers.
- Do NOT log full request bodies.
- Avoid logging user-provided text unless explicitly required for debugging.
- Prefer minimal, non-sensitive logs.

### Authentication & validation

- Prefer allowlists over denylists.
- Do not weaken authentication or validation logic.
- Any change to auth or validation must clearly state:
  - what threat is being mitigated
  - why the change is safe

---

## 2. Project scope constraints

### Source of truth

- `design.md` is the **authoritative specification**.
- Do NOT implement features listed under:
  - Non-goals
  - Future extensions
- If something is unclear, ask instead of guessing.

### Explicit non-goals (do not implement)

- User accounts or authentication systems
- Multi-tenant or per-user spreadsheet handling
- UI for script preview or editing
- Automatic regeneration or retry UX
- Audio synthesis or video generation
- Complex authorization systems

---

## 3. Google Apps Script (GAS) specific rules

### Configuration

- For the initial version:
  - `TOKEN` and `SPREADSHEET_ID` MUST be stored in **GAS Script Properties**
  - They MUST NOT be hardcoded
- Configuration access MUST be centralized
  - e.g. a single `getConfig()` function

### Webhook behavior

- Authentication uses a fixed secret token.
- Invalid TSV lines must be:
  - skipped
  - counted
  - reported in the response
- Do NOT add visual highlighting (e.g. red rows) in the initial version.

### Spreadsheet handling

- One video = one new sheet.
- Sheet name format must be:
  - `001_<theme>`
  - theme truncated to 20 characters
  - wrap from 999 back to 001
- Header row is mandatory.
- Column definitions must be forward-compatible.
  - Headers must be defined in one place.

---

## 4. Code structure & quality rules

### Separation of concerns

- Parsing and validation must be separated from side effects.
  - e.g. TSV parsing must not write to Sheets directly
- Configuration logic must be separated from business logic.

### Extensibility

- Assume columns will be added in the future.
- Avoid positional coupling where possible.
- Do not bake future features into the initial implementation.

### Error handling

- Fail safely.
- Return structured error responses.
- Do not expose internal state or stack traces.

### Code comments (required)

- Code comments MUST be written in Japanese.
- Comments should explain:
  - why the code exists
  - non-obvious behavior
  - constraints or design decisions
- Avoid redundant comments that only restate the code.
- Public-facing comments and internal implementation comments
  must both follow this rule.
- When modifying existing code, keep comment language consistent.

---

## 5. clasp & repository hygiene

### clasp usage

- `.clasp.json` MUST NOT be committed.
- `.claspignore` MUST be respected.
- Assume this repository is **public**.

### Git safety

- Avoid destructive commands.
- Do not run `git push` unless explicitly instructed.
- Explain any potentially risky operation before executing it.

---

## 6. AI agent behavior rules

- Do not expand scope on your own initiative.
- Do not refactor unrelated code.
- Prefer minimal, reviewable diffs.
- If requirements are ambiguous:
  - stop
  - ask clarifying questions
  - do NOT guess

---

## 7. Documentation expectations

- README should not contain secrets or URLs.
- Security-relevant decisions should be documented briefly.
- Keep documentation concise and factual.

---

By working in this repository, AI agents acknowledge and must comply
with all rules defined in this document.
