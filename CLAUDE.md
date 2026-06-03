# CLAUDE.md — Project Instructions for Claude Code

> Loaded automatically at the start of every session.
> For full project context (architecture, APIs, schema), see PROJECT_CONTEXT.xml.

---

## Commit Message Standard

Use **Conventional Commits** format. Every commit follows this structure:

```
type(scope): short description — ≤72 chars

- What changed, and why (not just what the code says)
- One bullet per logical change
- Doc updates are bundled here, not in a separate commit

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or user-visible behaviour |
| `fix` | Bug fix |
| `refactor` | Code restructure with no behaviour change |
| `style` | UI/visual changes only (no logic change) |
| `docs` | Documentation-only commit (no code touched) |
| `chore` | Maintenance — deps, configs, scripts |
| `ci` | CI/CD pipeline or deploy scripts |

### Scopes (optional, use when helpful)

`jobtracker` · `jtadmin` · `api` · `auth` · `db` · `ai`

### Examples

```
feat(jtadmin): add AI model selection tab

- api.py: GET/PUT /api/jtadmin/ai-settings endpoints (jtadmin token)
- AITab.jsx: select active model, add/remove available models
- JtAdminApp.jsx: thêm tab "AI Models"

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## Documentation Update Rule

**After every code change — whether committing or not — automatically check all 4 files below and apply any needed updates in the same commit. Never skip this step, never ask first, never make a separate `docs:` commit for it.**

| File | Update when… |
|------|-------------|
| `PROJECT_CONTEXT.xml` | API endpoints, DB schema, file descriptions, or known issues change |
| `README.md` | User-visible features, admin tabs, or tech stack change |
| `SETUP.md` | Infrastructure, deployment steps, or env variables change |
| `CLAUDE.md` | A workflow rule, code convention, or project constraint changes |

Only use `type: docs` when the commit touches documentation files **exclusively**.

---

## Workflow Conventions

- **Git**: commit only — never push. Pushing is the developer's responsibility.
- **Remotes**: 2 remotes — `origin` (GitLab) and `github` (GitHub). Developer pushes to both after each session.
- **Branch**: `main` is the only branch. Protected on GitLab — no force-push allowed.
- **Rollback**: `git revert` or `git checkout <hash> -- file1 file2` → new commit. No force-push.

## Code Conventions

- **Comments**: English only.
- **Frontend styling**: 100% inline styles — no CSS classes, no Tailwind, no CSS modules. Dark theme via CSS vars in `index.css` (matches the tienmai.space portfolio palette).
- **UI language**: Job Tracker app + JT Admin = Tiếng Việt.
- **Pydantic v2**: Use `request: Request` + `await request.json()` for endpoints that accept `List[Any]` or mixed-type arrays — Pydantic v2 coerces aggressively.
- **Admin auth**: JT Admin reuses the regular jobtracker token (sub == "admin"). There is no separate admin login.

## Relationship to tienmai-space

This project was split out of the **tienmai-space** monorepo. It runs as an independent
service (own repo, own MongoDB cluster, own JWT secret, port 8001) but is served under the
same domain at `tienmai.space/jobtracker` via Nginx. The portfolio + admin remain in
tienmai-space on port 8000.

## After Deploy

Always verify the service restarted successfully:
```bash
journalctl -u jobtracker -n 30
```
Look for `Application startup complete.` — if missing, the old process is still running.
