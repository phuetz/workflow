import { AgentBase } from '../agents/AgentBase';
import { AgentInput, AgentOutput, ClassificationResult, Entity, Sentiment } from '../../types/agents';
import { LLMMessage } from '../../types/llm';
import { logger } from '../../services/SimpleLogger';

/**
 * Classifier Agent - Specialized agent for intent classification and entity extraction
 * Uses LLM to understand user inputs and classify them into actionable intents
 */
export class ClassifierAgent extends AgentBase {
  private intents: Map<string, IntentDefinition> = new Map();
  private entityExtractors: Map<string, EntityExtractor> = new Map();

  constructor(config: {
    id?: string;
    llmModel?: string;
    temperature?: number;
    intents?: IntentDefinition[];
  } = {}) {
    super({
      id: config.id || 'classifier-agent',
      name: 'Classification Agent',
      description: 'Classifies user inputs and extracts entities',
      type: 'classifier',
      capabilities: ['classification', 'text-generation', 'reasoning'],
      config: {
        llmModel: config.llmModel || 'gpt-4',
        temperature: config.temperature || 0.3,
        maxTokens: 1000,
      },
    });

    // Register default intents
    if (config.intents) {
      config.intents.forEach(intent => this.registerIntent(intent));
    } else {
      this.registerDefaultIntents();
    }

    // Register default entity extractors
    this.registerDefaultExtractors();
  }

  /**
   * Execute classification
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    const userMessage = this.extractUserMessage(input);
    if (!userMessage) {
      throw new Error('No user message found in input');
    }

    logger.debug(`Classifying: "${userMessage}"`);

    // Perform classification
    const classification = await this.classify(userMessage);

    return {
      result: classification,
      confidence: classification.confidence,
      reasoning: `Classified as intent: ${classification.intent}`,
      metadata: {
        entities: classification.entities,
        sentiment: classification.sentiment,
        topics: classification.topics,
      },
    };
  }

  /**
   * Classify user input
   */
  async classify(text: string): Promise<ClassificationResult> {
    const startTime = Date.now();

    try {
      // Build classification prompt
      const prompt = this.buildClassificationPrompt(text);

      // Call LLM
      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: 'You are an expert at classifying user intents and extracting structured information. Respond only with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      const response = await this.callLLM(messages);

      // Parse LLM response
      const result = this.parseClassificationResponse(response);

      logger.debug(`Classification complete in ${Date.now() - startTime}ms: ${result.intent}`);

      return result;
    } catch (error) {
      logger.error('Classification failed:', error);
      throw error;
    }
  }

  /**
   * Register a new intent
   */
  registerIntent(intent: IntentDefinition): void {
    this.intents.set(intent.name, intent);
    logger.debug(`Registered intent: ${intent.name}`);
  }

  /**
   * Register entity extractor
   */
  registerExtractor(name: string, extractor: EntityExtractor): void {
    this.entityExtractors.set(name, extractor);
  }

  /**
   * Extract entities from text
   */
  async extractEntities(text: string): Promise<Entity[]> {
    const entities: Entity[] = [];

    for (const [name, extractor] of this.entityExtractors.entries()) {
      try {
        const extracted = await extractor(text);
        entities.push(...extracted);
      } catch (error) {
        logger.error(`Entity extractor ${name} failed:`, error);
      }
    }

    return entities;
  }

  // Private methods

  private buildClassificationPrompt(text: string): string {
    const intentList = Array.from(this.intents.values())
      .map(intent => `- ${intent.name}: ${intent.description}`)
      .join('\n');

    return `
Classify the following user input and extract relevant information.

Available intents:
${intentList}

User input: "${text}"

Respond with a JSON object containing:
{
  "intent": "the best matching intent name",
  "confidence": 0.0-1.0,
  "entities": [
    {
      "type": "entity type",
      "value": "extracted value",
      "confidence": 0.0-1.0
    }
  ],
  "sentiment": {
    "label": "positive|negative|neutral",
    "score": 0.0-1.0
  },
  "topics": [
    {
      "name": "topic name",
      "relevance": 0.0-1.0
    }
  ],
  "keywords": ["keyword1", "keyword2"]
}
`;
  }

  private parseClassificationResponse(response: string): ClassificationResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        intent: parsed.intent || 'unknown',
        confidence: parsed.confidence || 0.5,
        entities: parsed.entities || [],
        sentiment: parsed.sentiment,
        language: parsed.language,
        topics: parsed.topics || [],
        keywords: parsed.keywords || [],
      };
    } catch (error) {
      logger.error('Failed to parse classification response:', error);
      return {
        intent: 'unknown',
        confidence: 0.3,
        entities: [],
      };
    }
  }

  private extractUserMessage(input: AgentInput): string | null {
    if (input.messages && input.messages.length > 0) {
      const userMessage = input.messages.find(m => m.role === 'user');
      return userMessage?.content as string || null;
    }

    if (typeof input.data === 'string') {
      return input.data;
    }

    if (input.data && typeof input.data === 'object' && 'text' in input.data) {
      return (input.data as { text: string }).text;
    }

    return null;
  }

  private registerDefaultIntents(): void {
    const defaultIntents: IntentDefinition[] = [
      {
        name: 'workflow.create',
        description: 'User wants to create a new workflow',
        examples: ['create a workflow', 'build a new automation', 'make a workflow'],
      },
      {
        name: 'workflow.execute',
        description: 'User wants to run/execute a workflow',
        examples: ['run workflow', 'execute this', 'start the automation'],
      },
      {
        name: 'workflow.edit',
        description: 'User wants to edit/modify a workflow',
        examples: ['edit workflow', 'modify this', 'change the automation'],
      },
      {
        name: 'data.query',
        description: 'User wants to query or search data',
        examples: ['find records', 'search for', 'show me data'],
      },
      {
        name: 'data.transform',
        description: 'User wants to transform or process data',
        examples: ['convert data', 'transform this', 'process the records'],
      },
      {
        name: 'help',
        description: 'User needs help or information',
        examples: ['how do I', 'help me', 'what is', 'explain'],
      },
      {
        name: 'unknown',
        description: 'Intent cannot be determined',
        examples: [],
      },
    ];

    defaultIntents.forEach(intent => this.registerIntent(intent));
  }

  private registerDefaultExtractors(): void {
    // Email extractor
    this.registerExtractor('email', async (text: string) => {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const matches = text.match(emailRegex) || [];
      return matches.map(email => ({
        type: 'email',
        value: email,
        confidence: 0.9,
      }));
    });

    // URL extractor
    this.registerExtractor('url', async (text: string) => {
      const urlRegex = /https?:\/\/[^\s]+/g;
      const matches = text.match(urlRegex) || [];
      return matches.map(url => ({
        type: 'url',
        value: url,
        confidence: 0.9,
      }));
    });

    // Number extractor
    this.registerExtractor('number', async (text: string) => {
      const numberRegex = /\b\d+(?:\.\d+)?\b/g;
      const matches = text.match(numberRegex) || [];
      return matches.map(num => ({
        type: 'number',
        value: num,
        confidence: 0.8,
      }));
    });

    // Date extractor (simple version)
    this.registerExtractor('date', async (text: string) => {
      const dateRegex = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b/g;
      const matches = text.match(dateRegex) || [];
      return matches.map(date => ({
        type: 'date',
        value: date,
        confidence: 0.85,
      }));
    });
  }
}

// Types
interface IntentDefinition {
  name: string;
  description: string;
  examples: string[];
  confidence?: number;
}

type EntityExtractor = (text: string) => Promise<Entity[]>;
