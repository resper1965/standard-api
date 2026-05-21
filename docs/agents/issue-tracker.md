# Issue Tracker

## Primary: GitHub Issues

This repo tracks work in **GitHub Issues** on `resper1965/standard-api`.

- **Create:** `gh issue create --title "…" --body "…" --label "…"`
- **List:** `gh issue list --state open`
- **View:** `gh issue view <number>`
- **Close:** `gh issue close <number>`

Skills that create issues (`to-issues`, `triage`, `to-prd`, `qa`) will use the `gh` CLI.

## Secondary: Local Markdown

For quick drafts, solo spikes, or offline work, issues can also live as markdown files:

```
.scratch/
  <feature-slug>/
    issue.md        — description, acceptance criteria
    notes.md        — optional working notes
```

When a `.scratch/` issue is ready, promote it to GitHub with `gh issue create`.
