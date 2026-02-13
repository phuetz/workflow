import parser from 'cron-parser';
import { listWorkflows, Workflow } from '../repositories/workflows';
import { executeWorkflowSimple } from './simpleExecutionService';

const lastRun = new Map<string, number>();
let timer: NodeJS.Timer | null = null;

function nextDue(wf: Workflow): number | null {
  // Find schedule nodes with cron expressions
  const sched = wf.nodes.filter(n => n.data?.type === 'schedule' && typeof (n.data?.config as any)?.cron === 'string');
  if (sched.length === 0) return null;
  try {
    const expr = (sched[0].data!.config as any).cron as string;
    const interval = parser.parseExpression(expr);
    return interval.next().getTime();
  } catch {
    return null;
  }
}

async function tick() {
  const now = Date.now();
  for (const wf of listWorkflows().filter(w => w.status === 'active')) {
    const due = nextDue(wf);
    if (!due) continue;
    const lr = lastRun.get(wf.id) || 0;
    if (due <= now && now - lr > 1000) {
      lastRun.set(wf.id, now);
      // Fire and forget
      executeWorkflowSimple(wf, { trigger: 'schedule', at: new Date().toISOString() }).catch(() => void 0);
    }
  }
}

export function startScheduler() {
  if (timer) return;
  timer = setInterval(tick, 1000);
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

