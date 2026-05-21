# Triage Labels

The `triage` skill moves issues through these states by applying GitHub labels.

| Role             | Label              | Meaning                                      |
| ---------------- | ------------------ | -------------------------------------------- |
| Needs evaluation | `needs-triage`     | Maintainer needs to evaluate                 |
| Waiting on info  | `needs-info`       | Waiting on reporter for clarification        |
| Agent-ready      | `ready-for-agent`  | Fully specified; an AI agent can pick it up  |
| Human-ready      | `ready-for-human`  | Needs human implementation                   |
| Won't fix        | `wontfix`          | Will not be actioned                         |

These labels must exist in the GitHub repo. Create them if missing:

```bash
gh label create needs-triage --color "FBCA04" --description "Maintainer needs to evaluate"
gh label create needs-info --color "D93F0B" --description "Waiting on reporter"
gh label create ready-for-agent --color "0E8A16" --description "Fully specified, agent-ready"
gh label create ready-for-human --color "1D76DB" --description "Needs human implementation"
gh label create wontfix --color "FFFFFF" --description "Will not be actioned"
```
