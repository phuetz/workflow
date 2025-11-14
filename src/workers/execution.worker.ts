/**
 * Web Worker for workflow execution
 * Offloads heavy computation from main thread
 */

export interface WorkerMessage {
  type: 'execute' | 'cancel' | 'pause' | 'resume';
  payload: any;
}

export interface WorkerResponse {
  type: 'progress' | 'result' | 'error';
  payload: any;
}

let currentExecution: {
  cancelled: boolean;
  paused: boolean;
} | null = null;

// Listen for messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'execute':
      await executeWorkflow(payload);
      break;

    case 'cancel':
      if (currentExecution) {
        currentExecution.cancelled = true;
      }
      break;

    case 'pause':
      if (currentExecution) {
        currentExecution.paused = true;
      }
      break;

    case 'resume':
      if (currentExecution) {
        currentExecution.paused = false;
      }
      break;
  }
};

async function executeWorkflow(workflow: {
  nodes: any[];
  edges: any[];
  startData?: any;
}) {
  currentExecution = {
    cancelled: false,
    paused: false
  };

  const { nodes, edges, startData } = workflow;
  const executionResults = new Map<string, any>();
  const startTime = Date.now();

  try {
    // Find starting nodes (trigger nodes or nodes with no incoming edges)
    const incomingEdges = new Map<string, string[]>();
    edges.forEach((edge: any) => {
      if (!incomingEdges.has(edge.target)) {
        incomingEdges.set(edge.target, []);
      }
      incomingEdges.get(edge.target)!.push(edge.source);
    });

    const startNodes = nodes.filter(node => !incomingEdges.has(node.id));

    // Execute workflow using topological sort
    const executed = new Set<string>();
    const queue = [...startNodes];

    while (queue.length > 0) {
      // Check for cancellation
      if (currentExecution?.cancelled) {
        postMessage({
          type: 'error',
          payload: { message: 'Execution cancelled' }
        } as WorkerResponse);
        return;
      }

      // Check for pause
      while (currentExecution?.paused) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const node = queue.shift()!;

      if (executed.has(node.id)) {
        continue;
      }

      // Check if all dependencies are executed
      const dependencies = incomingEdges.get(node.id) || [];
      if (!dependencies.every(dep => executed.has(dep))) {
        queue.push(node); // Re-queue for later
        continue;
      }

      // Execute node
      try {
        const inputData = collectInputData(node.id, dependencies, executionResults, edges);
        const result = await executeNode(node, inputData);

        executionResults.set(node.id, result);
        executed.add(node.id);

        // Report progress
        postMessage({
          type: 'progress',
          payload: {
            nodeId: node.id,
            result,
            progress: (executed.size / nodes.length) * 100
          }
        } as WorkerResponse);

        // Add next nodes to queue
        const outgoingEdges = edges.filter((e: any) => e.source === node.id);
        outgoingEdges.forEach((edge: any) => {
          const targetNode = nodes.find(n => n.id === edge.target);
          if (targetNode && !queue.includes(targetNode)) {
            queue.push(targetNode);
          }
        });
      } catch (error: any) {
        postMessage({
          type: 'error',
          payload: {
            nodeId: node.id,
            error: error.message,
            stack: error.stack
          }
        } as WorkerResponse);

        if (!node.data?.continueOnFail) {
          throw error;
        }
      }
    }

    // Execution complete
    const duration = Date.now() - startTime;
    postMessage({
      type: 'result',
      payload: {
        success: true,
        results: Object.fromEntries(executionResults),
        duration,
        nodesExecuted: executed.size
      }
    } as WorkerResponse);

  } catch (error: any) {
    postMessage({
      type: 'error',
      payload: {
        message: error.message,
        stack: error.stack
      }
    } as WorkerResponse);
  } finally {
    currentExecution = null;
  }
}

function collectInputData(
  nodeId: string,
  dependencies: string[],
  results: Map<string, any>,
  edges: any[]
): any {
  const inputData: any = {};

  dependencies.forEach(depId => {
    const edge = edges.find(e => e.source === depId && e.target === nodeId);
    const depResult = results.get(depId);

    if (edge?.sourceHandle) {
      inputData[edge.sourceHandle] = depResult;
    } else {
      inputData[depId] = depResult;
    }
  });

  return inputData;
}

async function executeNode(node: any, inputData: any): Promise<any> {
  const { type, data } = node;

  // Simulate node execution based on type
  // In production, this would call actual node implementations

  await simulateDelay(100, 500); // Simulate processing time

  switch (type) {
    case 'httpRequest':
      return await executeHttpRequest(data, inputData);

    case 'code':
      return executeCode(data, inputData);

    case 'transform':
      return transformData(data, inputData);

    case 'filter':
      return filterData(data, inputData);

    case 'merge':
      return mergeData(data, inputData);

    case 'condition':
      return evaluateCondition(data, inputData);

    default:
      return {
        success: true,
        data: inputData,
        nodeType: type
      };
  }
}

async function executeHttpRequest(config: any, inputData: any): Promise<any> {
  const { url, method = 'GET', headers = {}, body } = config;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json();

    return {
      success: true,
      statusCode: response.status,
      data
    };
  } catch (error: any) {
    throw new Error(`HTTP Request failed: ${error.message}`);
  }
}

function executeCode(config: any, inputData: any): any {
  const { code } = config;

  try {
    // Create safe execution context
    const func = new Function('input', 'console', code);
    const result = func(inputData, console);

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    throw new Error(`Code execution failed: ${error.message}`);
  }
}

function transformData(config: any, inputData: any): any {
  const { mapping } = config;

  const result: any = {};

  for (const [key, expression] of Object.entries(mapping || {})) {
    result[key] = evaluateExpression(expression as string, inputData);
  }

  return {
    success: true,
    data: result
  };
}

function filterData(config: any, inputData: any): any {
  const { condition } = config;

  if (!Array.isArray(inputData)) {
    throw new Error('Filter requires array input');
  }

  const filtered = inputData.filter((item: any) => {
    return evaluateCondition({ condition }, { item }).matches;
  });

  return {
    success: true,
    data: filtered
  };
}

function mergeData(config: any, inputData: any): any {
  const merged = Object.values(inputData).reduce((acc: any, curr: any) => {
    if (Array.isArray(curr)) {
      return [...acc, ...curr];
    } else if (typeof curr === 'object') {
      return { ...acc, ...curr };
    }
    return acc;
  }, []);

  return {
    success: true,
    data: merged
  };
}

function evaluateCondition(config: any, inputData: any): any {
  const { condition } = config;

  // Simple condition evaluation
  // In production, use a proper expression evaluator
  const matches = evaluateExpression(condition, inputData);

  return {
    success: true,
    matches: Boolean(matches),
    data: inputData
  };
}

function evaluateExpression(expression: string, data: any): any {
  if (!expression) return data;

  // Replace {{$json.property}} with actual values
  let result = expression;
  const matches = expression.matchAll(/\{\{([^}]+)\}\}/g);

  for (const match of matches) {
    const path = match[1].trim();
    const value = getValueByPath(data, path);
    result = result.replace(match[0], String(value));
  }

  return result;
}

function getValueByPath(obj: any, path: string): any {
  const parts = path.replace(/\$json\.?/, '').split('.');
  return parts.reduce((current, part) => current?.[part], obj);
}

function simulateDelay(min: number, max: number): Promise<void> {
  const delay = Math.random() * (max - min) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Export empty object for TypeScript
export {};
