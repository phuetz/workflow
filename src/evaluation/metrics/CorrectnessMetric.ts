/**
 * Correctness Metric
 * LLM-based evaluation of answer correctness
 */

import type {
  MetricResult,
  CorrectnessMetricConfig,
  EvaluationInput,
  EvaluationContext,
  RegisteredMetric,
  MetricConfig,
} from '../../types/evaluation';

/**
 * LLM Service Interface (minimal definition for type safety)
 */
interface LLMServiceInterface {
  generateText(options: {
    provider: string;
    model: string;
    temperature: number;
    prompt: string;
    responseFormat?: string;
  }): Promise<{
    text: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }>;
}

/**
 * Default correctness evaluation prompt
 */
const DEFAULT_PROMPT = `You are an expert evaluator. Compare the actual output with the expected output and rate the correctness.

Expected Output:
{expected}

Actual Output:
{actual}

Evaluation Criteria:
{criteria}

Rate the correctness on a scale of 0 to 1, where:
- 0 = Completely incorrect
- 0.3 = Mostly incorrect with some correct elements
- 0.5 = Partially correct
- 0.7 = Mostly correct with minor errors
- 1.0 = Completely correct

Respond with a JSON object containing:
{
  "score": <number between 0 and 1>,
  "feedback": "<explanation of the rating>",
  "issues": ["<list of issues found>"]
}`;

/**
 * Execute correctness metric
 */
export async function executeCorrectnessMetric(
  input: EvaluationInput,
  output: unknown,
  config: CorrectnessMetricConfig,
  context?: EvaluationContext
): Promise<MetricResult> {
  const startTime = Date.now();

  try {
    // Check if expected output exists
    if (!input.expectedOutput) {
      return {
        metricId: config.id,
        metricType: 'correctness',
        metricName: config.name,
        score: 0,
        passed: false,
        feedback: 'No expected output provided for comparison',
        timestamp: new Date(),
        executionTime: Date.now() - startTime,
      };
    }

    // Get LLM service from context
    const llmService = context?.services?.llm as LLMServiceInterface | undefined;
    if (!llmService) {
      throw new Error('LLM service not available in context');
    }

    // Prepare evaluation prompt
    const prompt = config.config.prompt || DEFAULT_PROMPT;
    const criteria = config.config.criteria?.join('\n- ') || 'Accuracy, completeness, and relevance';

    const evaluationPrompt = prompt
      .replace('{expected}', JSON.stringify(input.expectedOutput, null, 2))
      .replace('{actual}', JSON.stringify(output, null, 2))
      .replace('{criteria}', criteria);

    // Call LLM for evaluation
    const response = await llmService.generateText({
      provider: config.config.llmProvider,
      model: config.config.model,
      temperature: config.config.temperature,
      prompt: evaluationPrompt,
      responseFormat: 'json',
    });

    // Parse response
    let evaluation: { score: number; feedback: string; issues?: string[] };
    try {
      evaluation = JSON.parse(response.text);
    } catch {
      // Fallback: try to extract score from text
      const scoreMatch = response.text.match(/score["\s:]+(\d+\.?\d*)/i);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0.5;
      evaluation = {
        score: Math.min(1, Math.max(0, score)),
        feedback: response.text,
      };
    }

    // Ensure score is between 0 and 1
    const score = Math.min(1, Math.max(0, evaluation.score));

    // Determine pass/fail
    const threshold = config.threshold ?? 0.7;
    const passed = score >= threshold;

    return {
      metricId: config.id,
      metricType: 'correctness',
      metricName: config.name,
      score,
      passed,
      threshold,
      actualValue: typeof output === 'object' && output !== null ? output as Record<string, unknown> : String(output),
      expectedValue: input.expectedOutput,
      feedback: evaluation.feedback,
      details: {
        issues: evaluation.issues,
        llmProvider: config.config.llmProvider,
        model: config.config.model,
        tokenUsage: response.usage,
      },
      timestamp: new Date(),
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      metricId: config.id,
      metricType: 'correctness',
      metricName: config.name,
      score: 0,
      passed: false,
      feedback: `Correctness evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date(),
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Validate correctness metric config
 */
export function validateCorrectnessConfig(config: MetricConfig): boolean {
  const correctnessConfig = config as CorrectnessMetricConfig;

  if (!correctnessConfig.config) return false;

  const { llmProvider, model, temperature } = correctnessConfig.config;

  // Validate required fields
  if (!llmProvider || !model) return false;

  // Validate temperature
  if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
    return false;
  }

  return true;
}

/**
 * Registered correctness metric
 */
export const CorrectnessMetric: RegisteredMetric = {
  type: 'correctness',
  name: 'Correctness',
  description: 'LLM-based evaluation of output correctness compared to expected output',
  defaultConfig: {
    threshold: 0.7,
    weight: 1,
    config: {
      llmProvider: 'openai',
      model: 'gpt-4',
      temperature: 0.0,
      criteria: ['Accuracy', 'Completeness', 'Relevance'],
    },
  },
  validator: validateCorrectnessConfig,
  executor: executeCorrectnessMetric,
};

export default CorrectnessMetric;
