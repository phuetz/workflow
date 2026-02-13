type Labels = Record<string, string>;

function labelString(labels?: Labels) {
  if (!labels || Object.keys(labels).length === 0) return '';
  const parts = Object.keys(labels).sort().map(k => `${k}="${String(labels[k]).replace(/"/g, '\\"')}"`);
  return `{${parts.join(',')}}`;
}

class Counter {
  private values = new Map<string, number>();
  constructor(private name: string, private help: string) {}
  inc(labels?: Labels, v = 1) {
    const key = JSON.stringify(labels || {});
    this.values.set(key, (this.values.get(key) || 0) + v);
  }
  render() {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    for (const [k, v] of this.values.entries()) {
      const labels = JSON.parse(k);
      lines.push(`${this.name}${labelString(labels)} ${v}`);
    }
    return lines.join('\n');
  }
}

class Gauge {
  private values = new Map<string, number>();
  constructor(private name: string, private help: string) {}
  set(labels: Labels | undefined, val: number) {
    const key = JSON.stringify(labels || {});
    this.values.set(key, val);
  }
  inc(labels?: Labels, v = 1) { this.set(labels, (this.values.get(JSON.stringify(labels || {})) || 0) + v); }
  dec(labels?: Labels, v = 1) { this.inc(labels, -v); }
  render() {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} gauge`];
    for (const [k, v] of this.values.entries()) {
      const labels = JSON.parse(k);
      lines.push(`${this.name}${labelString(labels)} ${v}`);
    }
    return lines.join('\n');
  }
}

class SummaryLike {
  // Keep sum/count per label, approximates summary
  private sums = new Map<string, number>();
  private counts = new Map<string, number>();
  constructor(private name: string, private help: string) {}
  observe(labels?: Labels, val = 0) {
    const key = JSON.stringify(labels || {});
    this.sums.set(key, (this.sums.get(key) || 0) + val);
    this.counts.set(key, (this.counts.get(key) || 0) + 1);
  }
  render() {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} summary`];
    for (const [k] of this.counts.entries()) {
      const labels = JSON.parse(k);
      const count = this.counts.get(k) || 0;
      const sum = this.sums.get(k) || 0;
      lines.push(`${this.name}_count${labelString(labels)} ${count}`);
      lines.push(`${this.name}_sum${labelString(labels)} ${sum}`);
    }
    return lines.join('\n');
  }
}

// Metrics registry
const executionsTotal = new Counter('app_executions_total', 'Total number of workflow executions labeled by status');
const executionsInProgress = new Gauge('app_executions_in_progress', 'Number of running executions');
const executionDuration = new SummaryLike('app_execution_duration_ms', 'Execution duration sum and count in ms');
const nodeTotal = new Counter('app_nodes_total', 'Total number of node executions labeled by status and type');
const nodeDuration = new SummaryLike('app_node_duration_ms', 'Node execution duration sum and count in ms');

export function recordExecutionQueued(workflowId: string) {
  executionsTotal.inc({ status: 'queued' });
}
export function recordExecutionStarted(workflowId: string) {
  executionsInProgress.inc();
}
export function recordExecutionFinished(workflowId: string, status: string, durationMs?: number) {
  executionsTotal.inc({ status });
  executionsInProgress.dec();
  if (typeof durationMs === 'number') executionDuration.observe({ status }, durationMs);
}
export function recordNodeFinished(type: string, status: 'success'|'failure', durationMs?: number) {
  nodeTotal.inc({ status, type });
  if (typeof durationMs === 'number') nodeDuration.observe({ status, type }, durationMs);
}

export function getPrometheusMetrics(): string {
  return [
    executionsTotal.render(),
    executionsInProgress.render(),
    executionDuration.render(),
    nodeTotal.render(),
    nodeDuration.render(),
    ''
  ].join('\n');
}

