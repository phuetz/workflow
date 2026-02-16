#!/usr/bin/env node
/**
 * Workflow Platform CLI
 * Usage:
 *   npx tsx src/backend/cli.ts <command> [options]
 *
 * Commands:
 *   list                          List all workflows
 *   execute <workflowId> [--input JSON]  Execute a workflow
 *   export <workflowId> [--format n8n|native]  Export a workflow
 *   import <file> [--format n8n|native]  Import a workflow from file
 *   history [workflowId]          Show execution history
 */

import { prisma } from './database/prisma';
import { executionService } from './services/executionService';
import { WorkflowStatus } from '@prisma/client';
import * as fs from 'node:fs';
import * as path from 'node:path';

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

function printHelp() {
  console.log(`
Workflow Platform CLI

Usage: npx tsx src/backend/cli.ts <command> [options]

Commands:
  list                                  List all workflows
  execute <workflowId> [--input JSON]   Execute a workflow
  export <workflowId> [--format n8n]    Export a workflow to stdout
  import <file> [--format n8n]          Import a workflow from file
  history [workflowId]                  Show execution history

Options:
  --input   JSON string for workflow input data
  --format  Export/import format: "n8n" or "native" (default: native)
  --help    Show this help message
`);
}

function stripN8nPrefix(type: string): string {
  return type.replace(/^n8n-nodes-base\./, '').replace(/^@n8n\/n8n-nodes-/, '');
}

async function listWorkflows() {
  const workflows = await prisma.workflow.findMany({
    select: { id: true, name: true, status: true, tags: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  if (workflows.length === 0) {
    console.log('No workflows found.');
    return;
  }

  console.log(`\n${'ID'.padEnd(38)} ${'Name'.padEnd(30)} ${'Status'.padEnd(10)} Tags`);
  console.log('-'.repeat(100));
  for (const wf of workflows) {
    const tags = Array.isArray(wf.tags) ? (wf.tags as string[]).join(', ') : '';
    console.log(`${wf.id.padEnd(38)} ${wf.name.substring(0, 28).padEnd(30)} ${wf.status.padEnd(10)} ${tags}`);
  }
  console.log(`\n${workflows.length} workflow(s)`);
}

async function executeWorkflow(workflowId: string, inputJson?: string) {
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow) {
    console.error(`Workflow not found: ${workflowId}`);
    process.exit(1);
  }

  const input = inputJson ? JSON.parse(inputJson) : {};
  console.log(`Executing workflow: ${workflow.name} (${workflowId})`);

  const execution = await executionService.startExecution(workflow as any, input, 'cli');

  // Poll for completion
  const startTime = Date.now();
  const maxWait = 300_000; // 5 min
  const pollMs = 500;

  while (Date.now() - startTime < maxWait) {
    const current = await executionService.getExecution(execution.id);
    if (!current) break;

    if (['success', 'failure', 'timeout', 'cancelled'].includes(current.status)) {
      const duration = current.duration || (Date.now() - startTime);
      console.log(`\nStatus: ${current.status}`);
      console.log(`Duration: ${duration}ms`);

      if (current.status === 'failure') {
        console.error(`Error: ${current.error || 'Unknown'}`);
        process.exit(1);
      }

      if (current.output) {
        console.log('\nOutput:');
        console.log(JSON.stringify(current.output, null, 2));
      }
      return;
    }

    process.stdout.write('.');
    await new Promise(r => setTimeout(r, pollMs));
  }

  console.error('\nExecution timed out after 5 minutes');
  process.exit(1);
}

async function exportWorkflow(workflowId: string, format: string) {
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow) {
    console.error(`Workflow not found: ${workflowId}`);
    process.exit(1);
  }

  const nodes = (workflow.nodes || []) as any[];
  const edges = (workflow.edges || []) as any[];

  if (format === 'n8n') {
    // Convert to n8n format
    const n8nNodes = nodes.map((node: any) => ({
      id: node.id,
      name: node.data?.label || node.type || 'Unknown',
      type: `n8n-nodes-base.${node.type || node.data?.type || 'noOp'}`,
      position: [node.position?.x || 0, node.position?.y || 0],
      parameters: { ...(node.data || {}), label: undefined, type: undefined },
      typeVersion: 1,
    }));

    const connections: Record<string, { main: any[][] }> = {};
    for (const edge of edges) {
      if (!connections[edge.source]) connections[edge.source] = { main: [[]] };
      connections[edge.source].main[0].push({
        node: edge.target,
        type: 'main',
        index: 0,
      });
    }

    console.log(JSON.stringify({
      name: workflow.name,
      nodes: n8nNodes,
      connections,
      settings: workflow.settings || {},
      staticData: null,
      tags: (workflow.tags || []).map((t: string) => ({ name: t })),
    }, null, 2));
  } else {
    console.log(JSON.stringify({
      format: 'workflow-platform-v1',
      exportedAt: new Date().toISOString(),
      workflow: {
        name: workflow.name,
        description: workflow.description,
        tags: workflow.tags,
        nodes: workflow.nodes,
        edges: workflow.edges,
        settings: workflow.settings,
        variables: workflow.variables,
      },
    }, null, 2));
  }
}

async function importWorkflow(filePath: string, format: string) {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolvedPath, 'utf-8');
  const data = JSON.parse(raw);

  let name: string;
  let nodes: any[];
  let edges: any[];
  let tags: string[] = [];
  let settings: any = {};

  if (format === 'n8n' || (data.nodes && data.connections && !data.format)) {
    // n8n format
    name = data.name || path.basename(filePath, '.json');
    nodes = (data.nodes || []).map((n: any) => ({
      id: n.id || `node_${Math.random().toString(36).slice(2, 10)}`,
      type: stripN8nPrefix(n.type),
      position: { x: n.position?.[0] || 0, y: n.position?.[1] || 0 },
      data: { label: n.name, type: stripN8nPrefix(n.type), ...n.parameters },
    }));
    edges = [];
    for (const [sourceId, connMap] of Object.entries(data.connections || {})) {
      const main = (connMap as any).main || [];
      for (const outputConns of main) {
        for (const conn of outputConns) {
          edges.push({
            id: `e_${sourceId}_${conn.node}`,
            source: sourceId,
            target: conn.node,
            sourceHandle: 'output',
            targetHandle: 'input',
          });
        }
      }
    }
    tags = (data.tags || []).map((t: any) => t.name || t);
    settings = data.settings || {};
  } else if (data.format === 'workflow-platform-v1') {
    // Native format
    const wf = data.workflow;
    name = wf.name;
    nodes = wf.nodes;
    edges = wf.edges;
    tags = wf.tags || [];
    settings = wf.settings || {};
  } else {
    console.error('Unknown workflow format. Use --format n8n or --format native');
    process.exit(1);
  }

  const workflow = await prisma.workflow.create({
    data: {
      name,
      description: `Imported from ${path.basename(filePath)} on ${new Date().toISOString()}`,
      tags,
      nodes: nodes as any,
      edges: edges as any,
      settings: settings as any,
      status: WorkflowStatus.DRAFT,
      userId: 'cli',
      variables: {},
      statistics: {},
    },
  });

  console.log(`Workflow imported successfully!`);
  console.log(`  ID: ${workflow.id}`);
  console.log(`  Name: ${workflow.name}`);
  console.log(`  Nodes: ${nodes.length}`);
  console.log(`  Edges: ${edges.length}`);
}

async function showHistory(workflowId?: string) {
  const where = workflowId ? { workflowId } : {};
  const executions = await prisma.workflowExecution.findMany({
    where,
    select: { id: true, workflowId: true, status: true, duration: true, startedAt: true, error: true },
    orderBy: { startedAt: 'desc' },
    take: 20,
  });

  if (executions.length === 0) {
    console.log('No executions found.');
    return;
  }

  console.log(`\n${'ID'.padEnd(38)} ${'Workflow'.padEnd(38)} ${'Status'.padEnd(10)} ${'Duration'.padEnd(10)} Started`);
  console.log('-'.repeat(130));
  for (const ex of executions) {
    const dur = ex.duration ? `${ex.duration}ms` : '-';
    const started = ex.startedAt ? new Date(ex.startedAt).toISOString().slice(0, 19) : '-';
    console.log(`${ex.id.padEnd(38)} ${ex.workflowId.padEnd(38)} ${ex.status.padEnd(10)} ${dur.padEnd(10)} ${started}`);
  }
  console.log(`\n${executions.length} execution(s)`);
}

async function main() {
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'list':
        await listWorkflows();
        break;
      case 'execute':
        if (!args[1]) { console.error('Usage: execute <workflowId> [--input JSON]'); process.exit(1); }
        await executeWorkflow(args[1], getFlag('input'));
        break;
      case 'export':
        if (!args[1]) { console.error('Usage: export <workflowId> [--format n8n|native]'); process.exit(1); }
        await exportWorkflow(args[1], getFlag('format') || 'native');
        break;
      case 'import':
        if (!args[1]) { console.error('Usage: import <file> [--format n8n|native]'); process.exit(1); }
        await importWorkflow(args[1], getFlag('format') || 'auto');
        break;
      case 'history':
        await showHistory(args[1]);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
