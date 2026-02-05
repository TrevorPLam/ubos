#!/usr/bin/env tsx
/**
 * Task dependency visualization and analysis tool.
 *
 * Inputs:
 * - Markdown task files under agents/roles/*/tasks/{BACKLOG,TODO,ARCHIVE}.md
 *
 * Outputs:
 * - Console summaries
 * - Optional export files (.json, .dot, .svg and graphviz-generated .png/.pdf when `dot` exists)
 *
 * Invariants:
 * - Task IDs are globally unique
 * - Dependencies are extracted from explicit TASK-* references in `**Dependencies:**` lines
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done' | 'unknown';

interface TaskNode {
  id: string;
  title: string;
  role: string;
  source: string;
  status: TaskStatus;
  dependencies: string[];
}

interface Graph {
  tasks: Map<string, TaskNode>;
  missingDependencies: Set<string>;
}

const ROOT = process.cwd();
const ROLES_DIR = join(ROOT, 'agents', 'roles');

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
  return {
    outDir: args.get('--out-dir') ?? 'artifacts/task-graph',
    taskId: args.get('--task') ?? '',
    exportFormat: args.get('--format') ?? 'all',
  };
}

function parseTaskBlocks(markdown: string, role: string, source: string): TaskNode[] {
  const beginMarkers = markdown.match(/## task_begin/g) ?? [];
  const endMarkers = markdown.match(/## task_end/g) ?? [];
  if (beginMarkers.length !== endMarkers.length) {
    console.warn(
      `Warning: Found ${beginMarkers.length} '## task_begin' markers but ${endMarkers.length} '## task_end' markers in ${source} for role ${role}. ` +
        'Some tasks may be malformed and were skipped during parsing.',
    );
  }
  const blocks = markdown.match(/## task_begin[\s\S]*?## task_end/g) ?? [];
  return blocks
    .map((block) => {
      const id = block.match(/\[id:([^\]]+)\]/)?.[1]?.trim();
      if (!id) return null;
      const title = block.match(/\]([^\n]+)/)?.[1]?.trim() ?? id;
      const status = (block.match(/\*\*Status:\*\*\s*([^\n\r]+)/)?.[1]?.trim().toLowerCase() ?? 'unknown') as TaskStatus;
      const dependencyLine = block.match(/\*\*Dependencies:\*\*\s*([^\n\r]+)/)?.[1] ?? '';
      const dependencies = [...dependencyLine.matchAll(/TASK-\d{8}-\d{3}/g)].map((m) => m[0]);
      return { id, title, role, source, status, dependencies } satisfies TaskNode;
    })
    .filter((entry): entry is TaskNode => Boolean(entry));
}

function loadGraph(): Graph {
  const tasks = new Map<string, TaskNode>();
  const missingDependencies = new Set<string>();
  const roles = readdirSync(ROLES_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

  for (const role of roles) {
    const taskDir = join(ROLES_DIR, role, 'tasks');
    for (const file of ['BACKLOG.md', 'TODO.md', 'ARCHIVE.md']) {
      const fullPath = join(taskDir, file);
      if (!existsSync(fullPath)) continue;
      const parsed = parseTaskBlocks(readFileSync(fullPath, 'utf8'), role, `agents/roles/${role}/tasks/${file}`);
      for (const task of parsed) {
        tasks.set(task.id, task);
      }
    }
  }

  for (const task of tasks.values()) {
    for (const dependency of task.dependencies) {
      if (!tasks.has(dependency)) {
        missingDependencies.add(dependency);
      }
    }
  }

  return { tasks, missingDependencies };
}

function statusColor(status: TaskStatus): string {
  if (status === 'done') return '#16a34a';
  if (status === 'in-progress') return '#2563eb';
  if (status === 'blocked') return '#dc2626';
  return '#ca8a04';
}

function toDot(graph: Graph): string {
  const lines = ['digraph Tasks {', '  rankdir=LR;', '  node [shape=box style="rounded,filled" fontname="Arial"];'];
  for (const task of graph.tasks.values()) {
    lines.push(`  "${task.id}" [label="${task.id}\\n${task.title.replace(/"/g, '\\"')}" fillcolor="${statusColor(task.status)}" fontcolor="white"];`);
  }
  for (const task of graph.tasks.values()) {
    for (const dependency of task.dependencies) {
      lines.push(`  "${dependency}" -> "${task.id}";`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}

function longestPath(graph: Graph): string[] {
  const memo = new Map<string, string[]>();
  const visiting = new Set<string>();

  const dfs = (id: string): string[] => {
    if (memo.has(id)) return memo.get(id)!;
    if (visiting.has(id)) return [id];
    visiting.add(id);
    const task = graph.tasks.get(id);
    if (!task) return [id];
    let best: string[] = [id];
    for (const dep of task.dependencies) {
      if (!graph.tasks.has(dep)) continue;
      const path = [...dfs(dep), id];
      if (path.length > best.length) best = path;
    }
    visiting.delete(id);
    memo.set(id, best);
    return best;
  };

  let result: string[] = [];
  for (const id of graph.tasks.keys()) {
    const path = dfs(id);
    if (path.length > result.length) result = path;
  }
  return result;
}

function blockerReport(graph: Graph) {
  return [...graph.tasks.values()]
    .filter((task) => task.status !== 'done' && task.dependencies.some((dep) => graph.tasks.get(dep)?.status !== 'done'))
    .map((task) => ({
      id: task.id,
      blockedBy: task.dependencies.filter((dep) => graph.tasks.get(dep)?.status !== 'done'),
    }));
}

function renderSimpleSvg(graph: Graph): string {
  const tasks = [...graph.tasks.values()];
  const width = 1400;
  const rowHeight = 60;
  const height = Math.max(120, tasks.length * rowHeight + 40);
  const header = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">\n<rect width="100%" height="100%" fill="#0b1020"/>`;
  const rows = tasks
    .map((task, index) => {
      const y = 30 + index * rowHeight;
      const deps = task.dependencies.join(', ') || 'None';
      return `<rect x="20" y="${y}" width="1360" height="42" rx="8" fill="#111827" stroke="${statusColor(task.status)}"/><text x="35" y="${y + 18}" fill="#f3f4f6" font-family="Arial" font-size="14">${task.id} (${task.status})</text><text x="35" y="${y + 35}" fill="#9ca3af" font-family="Arial" font-size="12">Depends on: ${deps}</text>`;
    })
    .join('\n');
  return `${header}\n${rows}\n</svg>`;
}

function main() {
  const { outDir, taskId, exportFormat } = parseArgs(process.argv.slice(2));
  const graph = loadGraph();
  mkdirSync(outDir, { recursive: true });

  const criticalPath = longestPath(graph);
  const blockers = blockerReport(graph);

  const summary = {
    totalTasks: graph.tasks.size,
    missingDependencies: [...graph.missingDependencies],
    criticalPath,
    blockers,
    selectedTask: taskId
      ? {
          id: taskId,
          task: graph.tasks.get(taskId) ?? null,
          upstream: [...graph.tasks.values()].filter((t) => t.dependencies.includes(taskId)).map((t) => t.id),
        }
      : null,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (exportFormat === 'json' || exportFormat === 'all') {
    writeFileSync(join(outDir, 'task-graph.json'), JSON.stringify(summary, null, 2));
  }

  if (exportFormat === 'dot' || exportFormat === 'all') {
    const dot = toDot(graph);
    const dotPath = join(outDir, 'task-graph.dot');
    writeFileSync(dotPath, dot);

    let dotAvailable = false;
    try {
      // Check if `dot` is available in PATH in a portable way.
      execSync('dot -V', { stdio: 'ignore' });
      dotAvailable = true;
    } catch {
      dotAvailable = false;
    }

    if (dotAvailable) {
      try {
        const escapeForShell = (value: string) => value.replace(/"/g, '\\"');
        const dotPathEscaped = escapeForShell(dotPath);
        const svgOut = escapeForShell(join(outDir, 'task-graph.svg'));
        const pngOut = escapeForShell(join(outDir, 'task-graph.png'));
        const pdfOut = escapeForShell(join(outDir, 'task-graph.pdf'));

        execSync(`dot -Tsvg "${dotPathEscaped}" -o "${svgOut}"`);
        execSync(`dot -Tpng "${dotPathEscaped}" -o "${pngOut}"`);
        execSync(`dot -Tpdf "${dotPathEscaped}" -o "${pdfOut}"`);
      } catch {
        writeFileSync(join(outDir, 'task-graph.svg'), renderSimpleSvg(graph));
      }
    } else {
      writeFileSync(join(outDir, 'task-graph.svg'), renderSimpleSvg(graph));
    }
  }
}

main();
