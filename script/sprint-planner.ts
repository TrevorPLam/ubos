#!/usr/bin/env tsx
/**
 * Sprint planning automation for file-based task system.
 *
 * Inputs:
 * - BACKLOG.md grouped tasks
 * - Agent capacity and skill hints provided via CLI
 *
 * Outputs:
 * - Plan report JSON
 * - Optional TODO.md population for selected group
 *
 * Invariants:
 * - Preserve task order from selected backlog group
 * - Keep TODO.md single-batch-type policy
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface BacklogTask {
  id: string;
  type: string;
  priority: string;
  component: string;
  title: string;
  raw: string;
  effortHours: number;
  groupKey: string;
}

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args.set(token, next);
      i += 1;
    } else {
      args.set(token, 'true');
    }
  }

  const capacities = (args.get('--capacity') ?? 'agent:20')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [agent, hours] = item.split(':');
      return { agent, hours: Number(hours || 0), remaining: Number(hours || 0) };
    });

  const skills = (args.get('--skills') ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [agent, skillList] = item.split(':');
      return { agent, skills: (skillList ?? '').split('|').filter(Boolean) };
    });

  return {
    role: args.get('--role') ?? 'TASKS_MANAGER',
    targetType: args.get('--type') ?? '',
    targetPriority: args.get('--priority') ?? '',
    limit: Number(args.get('--limit') ?? '5'),
    capacities,
    skills,
    outDir: args.get('--out-dir') ?? 'artifacts/sprint-planner',
    populateTodo: args.get('--populate-todo') === 'true',
  };
}

function effortToHours(text: string): number {
  const lower = text.toLowerCase();
  const hours = lower.match(/(\d+)\s*hour/);
  if (hours) return Number(hours[1]);
  const days = lower.match(/(\d+)\s*day/);
  if (days) return Number(days[1]) * 8;
  const weeks = lower.match(/(\d+)\s*week/);
  if (weeks) return Number(weeks[1]) * 40;
  return 8;
}

function parseBacklog(content: string): BacklogTask[] {
  const tasks: BacklogTask[] = [];
  let currentGroup = '';
  for (const chunk of content.split(/## task_begin/)) {
    // If this chunk has no task header, it may still introduce a new group for subsequent tasks.
    const blockMatch = chunk.match(/### # \[id:([^\]]+)]\[type:([^\]]+)]\[priority:([^\]]+)]\[component:([^\]]+)]\s*([^\n]+)/);
    if (!blockMatch) {
      const groupOnlyMatch = chunk.match(/## group_begin \[type:([^\]]+)]\[priority:([^\]]+)]/);
      if (groupOnlyMatch) {
        currentGroup = `${groupOnlyMatch[1]}:${groupOnlyMatch[2]}`;
      }
      continue;
    }

    // For chunks with a task header, only treat a group_begin that appears before the header
    // as the group for this task; group_begin lines after the task belong to the next group.
    const headerText = blockMatch[0];
    const headerIndex = chunk.indexOf(headerText);
    const groupMatchBeforeHeader = chunk
      .slice(0, headerIndex)
      .match(/## group_begin \[type:([^\]]+)]\[priority:([^\]]+)]/);
    if (groupMatchBeforeHeader) {
      currentGroup = `${groupMatchBeforeHeader[1]}:${groupMatchBeforeHeader[2]}`;
    }
    const [, id, type, priority, component, title] = blockMatch;
    const effort = chunk.match(/\*\*Estimated Effort:\*\*\s*([^\n]+)/)?.[1] ?? '1 day';
    tasks.push({
      id,
      type,
      priority,
      component,
      title: title.trim(),
      raw: `## task_begin${chunk.split('## task_end')[0]}## task_end`,
      effortHours: effortToHours(effort),
      groupKey: currentGroup,
    });
  }
  return tasks;
}

function chooseAgent(task: BacklogTask, capacities: Array<{ agent: string; remaining: number }>, skills: Array<{ agent: string; skills: string[] }>) {
  const ranked = capacities
    .filter((c) => c.remaining > 0)
    .map((capacity) => {
      const skillMatch = skills.find((entry) => entry.agent === capacity.agent);
      const score = skillMatch && skillMatch.skills.includes(task.component) ? 2 : 1;
      return { capacity, score };
    })
    .sort((a, b) => b.score - a.score || b.capacity.remaining - a.capacity.remaining);

  // Pick the best agent who actually has enough remaining capacity for this task.
  const pick = ranked.find(({ capacity }) => capacity.remaining >= task.effortHours)?.capacity;
  if (!pick) return 'unassigned';
  pick.remaining -= task.effortHours;
  return pick.agent;
}

function createTodoBlock(task: BacklogTask, index: number, assignee: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `## task_begin
## ${index}. # [id:${task.id}][type:${task.type}][priority:${task.priority}][component:${task.component}] ${task.title}

**Status:** todo  
**Created:** ${today}  
**Assignee:** @${assignee}

### Description
> Promoted from BACKLOG.md by sprint planner automation.

### Acceptance Criteria
- [ ] Implement according to task plan in backlog
- [ ] Verification checks pass

### Definition of Done
- [ ] Implementation complete
- [ ] Validation complete

### Relevant Files
- TBD (see backlog)

### Relevant Documentation
- agents/roles/TASKS_MANAGER/tasks/TASKS.md — Workflow and batch rules.

### Dependencies
- None

### Plan
1. Follow backlog plan.
2. Validate outputs.
3. Archive after completion.

### Estimated Effort
${task.effortHours} hours

### Notes & Summary
- [log] Auto-promoted by sprint planner.
## task_end

---`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const tasksDir = join(process.cwd(), 'agents', 'roles', options.role, 'tasks');
  const backlogPath = join(tasksDir, 'BACKLOG.md');
  const todoPath = join(tasksDir, 'TODO.md');
  const backlog = readFileSync(backlogPath, 'utf8');
  const tasks = parseBacklog(backlog)
    .filter((task) => (!options.targetType || task.type === options.targetType) && (!options.targetPriority || task.priority === options.targetPriority));

  // By default, keep selection constrained to a single backlog group to respect batching rules.
  const [firstTask] = tasks;
  const groupScopedTasks =
    firstTask && !options.targetType && !options.targetPriority
      ? tasks.filter((task) => task.groupKey === firstTask.groupKey)
      : tasks;

  const selected = groupScopedTasks.slice(0, options.limit);
  const assignment = selected.map((task) => ({
    id: task.id,
    assignee: chooseAgent(task, options.capacities, options.skills),
    effortHours: task.effortHours,
    group: task.groupKey,
  }));

  const report = {
    generatedAt: new Date().toISOString(),
    role: options.role,
    totalCandidateTasks: tasks.length,
    selectedTasks: assignment,
    capacityRemaining: options.capacities,
  };

  mkdirSync(options.outDir, { recursive: true });
  writeFileSync(join(options.outDir, 'sprint-plan.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (options.populateTodo && selected.length > 0) {
    const todo = readFileSync(todoPath, 'utf8');
    const blocks = selected.map((task, index) => createTodoBlock(task, index + 1, assignment[index].assignee)).join('\n\n');
    const updated = `${todo.trim()}\n\n${blocks}\n`;
    writeFileSync(todoPath, updated);
  }
}

main();
