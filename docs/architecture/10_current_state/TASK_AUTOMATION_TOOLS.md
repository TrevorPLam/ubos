# Task Automation Tools

## Purpose
Document task-manager automation scripts for dependency analysis and sprint planning.

## Scripts

### `script/task-graph.ts`
- Parses role task ledgers under `agents/roles/*/tasks`.
- Produces blocker reports and critical-path output.
- Exports graph artifacts to JSON/DOT/SVG and uses Graphviz for PNG/PDF when `dot` is available.

#### Usage
```bash
npm run task:graph -- --out-dir artifacts/task-graph --format all
npm run task:graph -- --task TASK-20260203-001
```

### `script/sprint-planner.ts`
- Parses grouped backlog tasks for a role.
- Selects tasks by type/priority and optional capacity/skills inputs.
- Emits sprint planning report JSON and can populate TODO entries when enabled.

#### Usage
```bash
npm run task:sprint-plan -- --role TASKS_MANAGER --type dev --priority high --limit 5
npm run task:sprint-plan -- --capacity alice:24,bob:16 --skills alice:tooling|repo,bob:automation
```

## Verification
- `npm run check`
- `npm run task:graph -- --format json`
- `npm run task:sprint-plan -- --role TASKS_MANAGER --type dev --priority high --limit 2`
