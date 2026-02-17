import { CronExpressionParser } from 'cron-parser';
import { listWorkflows, Workflow } from '../repositories/workflows';
import { getWorkflow } from '../repositories/adapters';
import { logger } from '../../../services/SimpleLogger';

const lastRun = new Map<string, number>();
let timer: NodeJS.Timeout | null = null;
let scheduledWorkflowCount = 0;

function nextDue(wf: Workflow): number | null {
  // Find schedule nodes with cron expressions
  const sched = wf.nodes.filter(n => n.data?.type === 'schedule' && typeof (n.data?.config as any)?.cron === 'string');
  if (sched.length === 0) return null;
  try {
    const expr = (sched[0].data!.config as any).cron as string;
    const interval = CronExpressionParser.parse(expr);
    return interval.next().getTime();
  } catch (err) {
    logger.warn('Failed to parse cron expression', {
      workflowId: wf.id,
      workflowName: wf.name,
      error: err instanceof Error ? err.message : String(err)
    });
    return null;
  }
}

/** Execute via the unified executionService (53+ node types) */
async function executeViaUnifiedEngine(workflowId: string): Promise<void> {
  const { executionService } = await import('../../../backend/services/executionService');
  const wf = await getWorkflow(workflowId);
  if (!wf) {
    logger.warn('Workflow not found for scheduled execution', { workflowId });
    return;
  }

  const workflow = {
    id: wf.id,
    name: wf.name,
    nodes: wf.nodes || [],
    edges: wf.edges || [],
    settings: (wf.settings as Record<string, any>) || {},
  };

  await executionService.startExecution(
    workflow as any,
    { trigger: 'schedule', at: new Date().toISOString() },
    'scheduler'
  );
}

async function tick() {
  const now = Date.now();
  for (const wf of listWorkflows().filter(w => w.status === 'active')) {
    const due = nextDue(wf);
    if (!due) continue;
    const lr = lastRun.get(wf.id) || 0;
    if (due <= now && now - lr > 1000) {
      lastRun.set(wf.id, now);
      scheduledWorkflowCount++;

      logger.info('Scheduler triggering workflow', {
        workflowId: wf.id,
        workflowName: wf.name,
        trigger: 'schedule',
        totalScheduledExecutions: scheduledWorkflowCount
      });

      executeViaUnifiedEngine(wf.id)
        .then(() => {
          logger.debug('Scheduled workflow execution completed', {
            workflowId: wf.id,
            workflowName: wf.name
          });
        })
        .catch((err) => {
          logger.error('Scheduled workflow execution failed', {
            workflowId: wf.id,
            workflowName: wf.name,
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined
          });
        });
    }
  }
}

export function startScheduler() {
  if (timer) {
    logger.debug('Scheduler already running');
    return;
  }

  timer = setInterval(tick, 1000);

  const activeWorkflows = listWorkflows().filter(w => w.status === 'active');
  const scheduledWorkflows = activeWorkflows.filter(wf => nextDue(wf) !== null);

  logger.info('Scheduler started', {
    intervalMs: 1000,
    activeWorkflows: activeWorkflows.length,
    scheduledWorkflows: scheduledWorkflows.length
  });
}

export function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    logger.info('Scheduler stopped', {
      totalExecutionsTriggered: scheduledWorkflowCount
    });
  } else {
    logger.debug('Scheduler was not running');
  }
  timer = null;
}
