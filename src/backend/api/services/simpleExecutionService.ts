import { Workflow, WorkflowNode, WorkflowEdge, WorkflowNodeData } from '../repositories/workflows';
import { createExecution, updateExecution, ExecutionRecord } from '../repositories/executions';
import { executeHttpRequest, type HttpAuth } from './executors/http';
import { getCredentialDecrypted } from '../repositories/adapters';
import { executeCodeNode } from './executors/code';
import { evaluateExpression, type EvalContext } from './expressions';
import { emitNodeStarted, emitNodeFinished, emitExecutionLog } from './events';
import { recordNodeFinished } from './metrics';
import { startNodeExecution, appendNodeLog, finishNodeExecution } from '../repositories/adapters';
import type { Credential } from '../repositories/credentials';

function findStartNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const targets = new Set(edges.map(e => e.target));
  return nodes.filter(n => !targets.has(n.id));
}

function nextNodes(nodeId: string, nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const outs = edges.filter(e => e.source === nodeId).map(e => e.target);
  const map = new Map(nodes.map(n => [n.id, n] as const));
  return outs.map(id => map.get(id)).filter(Boolean) as WorkflowNode[];
}

interface ExecutionContext {
  input?: unknown;
  results: Record<string, unknown>;
  vars?: Record<string, unknown>;
}

export async function executeWorkflowSimple(workflow: Workflow, input?: unknown, opts?: { execId?: string }): Promise<ExecutionRecord> {
  const exec = createExecution(workflow.id, input);
  updateExecution(exec.id, { status: 'running', startedAt: new Date().toISOString(), logs: [...exec.logs, { ts: Date.now(), level: 'info', message: 'Execution started' }] });

  const context: ExecutionContext = { input, results: {} };
  const nodesById = new Map(workflow.nodes.map(n => [n.id, n] as const));

  const queue: WorkflowNode[] = [...findStartNodes(workflow.nodes, workflow.edges)];

  const incoming = (nodeId: string) => workflow.edges.filter(e => e.target === nodeId);

  async function executeChainFrom(start: WorkflowNode, ctx: ExecutionContext, visited = new Set<string>()) {
    if (visited.has(start.id)) return; // prevent cycles
    visited.add(start.id);
    // Reuse main loop logic by enqueuing and processing only subtree
    const localQueue: WorkflowNode[] = [start];
    while (localQueue.length) {
      const node = localQueue.shift()!;
      const startedAt = Date.now();
      const nodeData = node.data as WorkflowNodeData;
      emitNodeStarted({ execId: opts?.execId || exec.id, nodeId: node.id, type: String(nodeData?.type || 'unknown'), ts: startedAt });
      try { await startNodeExecution(opts?.execId || exec.id, { id: node.id, name: nodeData?.label, type: nodeData?.type }); } catch {}
      const type = nodeData?.type;
      try {
        if (type === 'httpRequest') {
        const cfg = (nodeData?.config || {}) as Record<string, unknown>;
        let auth: HttpAuth | undefined;
        if (cfg.credentialId && !cfg.authentication) {
          const cred = await getCredentialDecrypted(String(cfg.credentialId)) as Credential | null;
          if (cred) {
            if (cred.kind === 'basic') auth = { type: 'basic', username: cred.username, password: cred.password };
            if (cred.kind === 'bearer') auth = { type: 'bearer', token: cred.token };
            if (cred.kind === 'api_key') auth = { type: 'api_key', apiKey: cred.apiKey, headerName: cred.headerName };
          }
        } else {
          auth = cfg.authentication as HttpAuth | undefined;
        }
        const res = await executeHttpRequest({
          method: String(cfg.method || 'GET'),
          url: String(cfg.url || ''),
          headers: cfg.headers as Record<string, string> | undefined,
          queryParams: cfg.queryParams as Record<string, string> | undefined,
          body: cfg.body,
          timeoutMs: cfg.timeoutMs as number | undefined,
          authentication: auth,
        });
        ctx.results[node.id] = res;
        try { await appendNodeLog(opts?.execId || exec.id, node.id, { ts: Date.now(), level: 'info', message: 'httpRequest OK' }); } catch {}
      } else if (type === 'code') {
        const cfg = (nodeData?.config || {}) as Record<string, unknown>;
        const res = await executeCodeNode(
          { code: String(cfg.code || ''), timeoutMs: Number(cfg.timeoutMs) || 100 },
          ctx.results,
          { onLog: (args: unknown[]) => emitExecutionLog({ execId: opts?.execId || exec.id, ts: Date.now(), level: 'info', message: String(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')) }) }
        );
        ctx.results[node.id] = res;
        try { await appendNodeLog(opts?.execId || exec.id, node.id, { ts: Date.now(), level: 'info', message: 'code OK' }); } catch {}
      } else if (type === 'delay') {
        const cfg = (nodeData?.config || {}) as Record<string, unknown>;
        const ms = Number(cfg?.ms || 0);
        if (ms > 0) await new Promise(r => setTimeout(r, Math.min(ms, 60_000))); // cap
        try { await appendNodeLog(opts?.execId || exec.id, node.id, { ts: Date.now(), level: 'info', message: `delay ${ms}ms` }); } catch {}
        } else if (type === 'if') {
        const cfg = (nodeData?.config || {}) as Record<string, unknown>;
        const condition = String(cfg?.condition || 'true');
        const evalCtx: EvalContext = { json: ctx.input as Record<string, unknown>, vars: ctx.results };
        const passed = !!evaluateExpression(`{{ ${condition} }}`, evalCtx);
        ctx.results[node.id] = { passed };
        const outs = workflow.edges.filter(e => e.source === node.id);
        const targetEdges = outs.filter(e => {
          const edgeData = (e.data || {}) as Record<string, unknown>;
          const c = edgeData?.condition;
          if (c === undefined) return true;
          return String(c).toLowerCase() === String(passed);
        });
        for (const e of targetEdges) {
          const nxt = nodesById.get(e.target);
          if (nxt) localQueue.push(nxt);
        }
        continue;
        } else if (type === 'merge') {
        // Collate predecessor outputs
        const preds = incoming(node.id).map(e => ctx.results[e.source]).filter(Boolean);
        ctx.results[node.id] = preds;
        try { await appendNodeLog(opts?.execId || exec.id, node.id, { ts: Date.now(), level: 'info', message: 'merge' }); } catch {}
        } else if (type === 'splitInBatches') {
        const cfg = (nodeData?.config || {}) as Record<string, unknown>;
        let items: unknown = cfg.items;
        if (typeof items === 'string') {
          const evalCtx: EvalContext = { json: ctx.input as Record<string, unknown>, vars: ctx.results };
          items = evaluateExpression(items, evalCtx);
        }
        const arr = Array.isArray(items) ? items : [];
        const size = Math.max(1, Number(cfg.batchSize || 1));
        const outs = workflow.edges.filter(e => e.source === node.id);
        const children = outs.map(e => nodesById.get(e.target)).filter(Boolean) as WorkflowNode[];
        ctx.results[node.id] = [];
        for (let i = 0; i < arr.length; i += size) {
          const batch = arr.slice(i, i + size);
          const batchCtx: ExecutionContext = { ...ctx, vars: { ...(ctx.vars || {}), batch, index: i/size } };
          for (const child of children) {
            await executeChainFrom(child, batchCtx, new Set(visited));
          }
          (ctx.results[node.id] as unknown[]).push(batchCtx.results);
        }
        try { await appendNodeLog(opts?.execId || exec.id, node.id, { ts: Date.now(), level: 'info', message: `splitInBatches items=${arr.length} size=${size}` }); } catch {}
        continue;
        } else if (type === 'transform') {
        const cfg = (nodeData?.config || {}) as Record<string, unknown>;
        const evalCtx: EvalContext = { json: context.input as Record<string, unknown>, vars: context.results };
        const value = evaluateExpression(String(cfg.expression || 'null'), evalCtx);
        ctx.results[node.id] = value;
        } else {
          // unsupported -> skip
        }
      } catch (err) {
        const cfg = (nodeData?.config || {}) as Record<string, unknown>;
        const cont = Boolean(cfg?.continueOnFail) || Boolean(workflow.settings?.continueOnError);
        if (!cont) throw err;
      }
      const endedAt = Date.now();
      const duration = endedAt - startedAt;
      emitNodeFinished({ execId: opts?.execId || exec.id, nodeId: node.id, type: String(nodeData?.type || 'unknown'), ts: endedAt, status: 'success', durationMs: duration });
      try { recordNodeFinished(String(nodeData?.type || 'unknown'), 'success', duration); } catch {}
      try { await finishNodeExecution(opts?.execId || exec.id, node.id, 'success'); } catch {}
      const children = workflow.edges.filter(e => e.source === node.id).map(e => nodesById.get(e.target)).filter(Boolean) as WorkflowNode[];
      for (const child of children) localQueue.push(child);
    }
  }

  try {
    while (queue.length) {
      const node = queue.shift()!;
      const nodeData = node.data as WorkflowNodeData;
      const type = nodeData?.type;
      const startedAt = Date.now();
      emitNodeStarted({ execId: opts?.execId || exec.id, nodeId: node.id, type: String(type || 'unknown'), ts: startedAt });
      try { await startNodeExecution(opts?.execId || exec.id, { id: node.id, name: nodeData?.label, type: nodeData?.type }); } catch {}

      try {
        if (type === 'httpRequest') {
        const cfg = (nodeData?.config || {}) as Record<string, unknown>;
        // Resolve credential if referenced
        let auth: HttpAuth | undefined;
        if (cfg.credentialId && !cfg.authentication) {
          const cred = await getCredentialDecrypted(String(cfg.credentialId)) as Credential | null;
          if (cred) {
            if (cred.kind === 'basic') auth = { type: 'basic', username: cred.username, password: cred.password };
            if (cred.kind === 'bearer') auth = { type: 'bearer', token: cred.token };
            if (cred.kind === 'api_key') auth = { type: 'api_key', apiKey: cred.apiKey, headerName: cred.headerName };
          }
        } else {
          auth = cfg.authentication as HttpAuth | undefined;
        }
        const res = await executeHttpRequest({
          method: String(cfg.method || 'GET'),
          url: String(cfg.url || ''),
          headers: cfg.headers as Record<string, string> | undefined,
          queryParams: cfg.queryParams as Record<string, string> | undefined,
          body: cfg.body,
          timeoutMs: cfg.timeoutMs as number | undefined,
          authentication: auth,
        });
        context.results[node.id] = res;
        exec.logs.push({ ts: Date.now(), level: 'info', message: `Node ${node.id} (httpRequest) OK` });
        emitExecutionLog({ execId: opts?.execId || exec.id, ts: Date.now(), level: 'info', message: `Node ${node.id} (httpRequest) OK` });
      } else if (type === 'code') {
        const cfg = (nodeData?.config || {}) as Record<string, unknown>;
        const res = await executeCodeNode(
          { code: String(cfg.code || ''), timeoutMs: Number(cfg.timeoutMs) || 100 },
          context.results,
          { onLog: (args: unknown[]) => emitExecutionLog({ execId: opts?.execId || exec.id, ts: Date.now(), level: 'info', message: String(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')) }) }
        );
        context.results[node.id] = res;
        exec.logs.push({ ts: Date.now(), level: 'info', message: `Node ${node.id} (code) OK` });
        emitExecutionLog({ execId: opts?.execId || exec.id, ts: Date.now(), level: 'info', message: `Node ${node.id} (code) OK` });
      } else if (type === 'delay') {
        const cfg = (nodeData?.config || {}) as Record<string, unknown>;
        const ms = Number(cfg?.ms || 0);
        if (ms > 0) await new Promise(r => setTimeout(r, Math.min(ms, 60_000))); // cap 60s per delay
        exec.logs.push({ ts: Date.now(), level: 'info', message: `Node ${node.id} (delay) ${ms}ms` });
        emitExecutionLog({ execId: opts?.execId || exec.id, ts: Date.now(), level: 'info', message: `Node ${node.id} (delay) ${ms}ms` });
      } else if (type === 'if') {
        // evaluate boolean condition and only enqueue matching branch
        const cfg = (nodeData?.config || {}) as Record<string, unknown>;
        const condition = String(cfg?.condition || 'true');
        const evalCtx: EvalContext = { json: context.input as Record<string, unknown>, vars: context.results };
        const passed = !!evaluateExpression(`{{ ${condition} }}`, evalCtx);
        context.results[node.id] = { passed };
        exec.logs.push({ ts: Date.now(), level: 'info', message: `Node ${node.id} (if) => ${passed}` });
        emitExecutionLog({ execId: opts?.execId || exec.id, ts: Date.now(), level: 'info', message: `Node ${node.id} (if) => ${passed}` });
        // filter edges: assume edge.data.condition is 'true' or 'false' to branch
        const outs = workflow.edges.filter(e => e.source === node.id);
        const targetEdges = outs.filter(e => {
          const edgeData = (e.data || {}) as Record<string, unknown>;
          const c = edgeData?.condition;
          if (c === undefined) return true;
          return String(c).toLowerCase() === String(passed);
        });
        for (const e of targetEdges) queue.push(nodesById.get(e.target)!);
        continue; // skip default enqueue below
      } else if (type === 'merge') {
        const preds = incoming(node.id).map(e => context.results[e.source]).filter(Boolean);
        context.results[node.id] = preds;
        } else if (type === 'splitInBatches') {
        const cfg = (nodeData?.config || {}) as Record<string, unknown>;
        let items: unknown = cfg.items;
        if (typeof items === 'string') {
          const evalCtx: EvalContext = { json: context.input as Record<string, unknown>, vars: context.results };
          items = evaluateExpression(items, evalCtx);
        }
        const arr = Array.isArray(items) ? items : [];
        const size = Math.max(1, Number(cfg.batchSize || 1));
        const outs = workflow.edges.filter(e => e.source === node.id);
        const children = outs.map(e => nodesById.get(e.target)).filter(Boolean) as WorkflowNode[];
        context.results[node.id] = [];
        for (let i = 0; i < arr.length; i += size) {
          const batch = arr.slice(i, i + size);
          const batchCtx: ExecutionContext = { ...context, vars: { ...(context.vars || {}), batch, index: i/size } };
          for (const child of children) {
            await executeChainFrom(child, batchCtx);
          }
          (context.results[node.id] as unknown[]).push(batchCtx.results);
        }
        continue;
        } else if (type === 'transform') {
        const cfg = (nodeData?.config || {}) as Record<string, unknown>;
        const evalCtx: EvalContext = { json: context.input as Record<string, unknown>, vars: context.results };
        const value = evaluateExpression(String(cfg.expression || 'null'), evalCtx);
        context.results[node.id] = value;
        } else {
          // Unsupported node types are skipped for now
          exec.logs.push({ ts: Date.now(), level: 'warn', message: `Node ${node.id} type '${type}' not supported; skipped` });
          emitExecutionLog({ execId: opts?.execId || exec.id, ts: Date.now(), level: 'warn', message: `Node ${node.id} type '${type}' not supported; skipped` });
        }
      } catch (err) {
        const cfg = (nodeData?.config || {}) as Record<string, unknown>;
        const cont = Boolean(cfg?.continueOnFail) || Boolean(workflow.settings?.continueOnError);
        if (!cont) throw err;
      }

      // Enqueue next nodes
      for (const next of nextNodes(node.id, workflow.nodes, workflow.edges)) {
        if (!nodesById.has(next.id)) continue;
        queue.push(next);
      }
      const endedAt = Date.now();
      const duration = endedAt - startedAt;
      emitNodeFinished({ execId: opts?.execId || exec.id, nodeId: node.id, type: String(type || 'unknown'), ts: endedAt, status: 'success', durationMs: duration });
      try { recordNodeFinished(String(type || 'unknown'), 'success', duration); } catch {}
      try { await finishNodeExecution(opts?.execId || exec.id, node.id, 'success'); } catch {}
    }

    updateExecution(exec.id, {
      status: 'success',
      output: context.results,
      finishedAt: new Date().toISOString(),
      durationMs: exec.startedAt ? Date.now() - new Date(exec.startedAt).getTime() : 0,
      logs: [...exec.logs, { ts: Date.now(), level: 'info', message: 'Execution finished' }],
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    updateExecution(exec.id, {
      status: 'failure',
      error: errorMessage,
      finishedAt: new Date().toISOString(),
      durationMs: exec.startedAt ? Date.now() - new Date(exec.startedAt).getTime() : 0,
      logs: [...exec.logs, { ts: Date.now(), level: 'error', message: 'Execution failed', data: { error: errorMessage } }],
    });
  }

  return exec;
}
