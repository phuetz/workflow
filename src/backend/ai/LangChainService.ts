/**
 * LangChain Service
 * Core service for AI/LLM operations using LangChain
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { PromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser, StructuredOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { BufferMemory, ConversationSummaryMemory } from 'langchain/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';
import { logger } from '../services/LogService';

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'azure' | 'google';
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

export interface PromptConfig {
  template: string;
  inputVariables: string[];
}

export interface TextSplitterConfig {
  chunkSize: number;
  chunkOverlap: number;
  separator?: string;
}

export interface EmbeddingConfig {
  provider: 'openai' | 'cohere' | 'huggingface';
  model?: string;
  apiKey?: string;
}

export class LangChainService {
  private llmInstances: Map<string, ChatOpenAI | ChatAnthropic> = new Map();
  private memoryInstances: Map<string, BufferMemory> = new Map();

  /**
   * Get or create LLM instance
   */
  async getLLM(config: LLMConfig): Promise<ChatOpenAI | ChatAnthropic> {
    const cacheKey = `${config.provider}-${config.model}`;

    if (this.llmInstances.has(cacheKey)) {
      return this.llmInstances.get(cacheKey)!;
    }

    let llm: ChatOpenAI | ChatAnthropic;

    switch (config.provider) {
      case 'openai':
        llm = new ChatOpenAI({
          modelName: config.model || 'gpt-4',
          temperature: config.temperature ?? 0.7,
          maxTokens: config.maxTokens,
          openAIApiKey: config.apiKey || process.env.OPENAI_API_KEY,
          streaming: config.streaming ?? false,
        });
        break;

      case 'anthropic':
        llm = new ChatAnthropic({
          modelName: config.model || 'claude-3-5-sonnet-20241022',
          temperature: config.temperature ?? 0.7,
          maxTokens: config.maxTokens,
          anthropicApiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
        });
        break;

      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }

    this.llmInstances.set(cacheKey, llm);
    logger.info('LLM instance created', {
      provider: config.provider,
      model: config.model,
    });

    return llm;
  }

  /**
   * Create prompt template
   */
  async createPromptTemplate(config: PromptConfig): Promise<PromptTemplate> {
    const template = PromptTemplate.fromTemplate(config.template);

    logger.info('Prompt template created', {
      variables: config.inputVariables,
    });

    return template;
  }

  /**
   * Create chat prompt template
   */
  async createChatPromptTemplate(
    systemMessage: string,
    humanMessage: string
  ): Promise<ChatPromptTemplate> {
    const chatPrompt = ChatPromptTemplate.fromMessages([
      ['system', systemMessage],
      ['human', humanMessage],
    ]);

    return chatPrompt;
  }

  /**
   * Execute LLM chain with prompt
   */
  async executeChain(
    llmConfig: LLMConfig,
    promptConfig: PromptConfig,
    inputs: Record<string, any>
  ): Promise<string> {
    try {
      const llm = await this.getLLM(llmConfig);
      const prompt = await this.createPromptTemplate(promptConfig);

      const chain = RunnableSequence.from([
        prompt,
        llm,
        new StringOutputParser(),
      ]);

      const result = await chain.invoke(inputs);

      logger.info('LLM chain executed', {
        provider: llmConfig.provider,
        model: llmConfig.model,
        inputKeys: Object.keys(inputs),
      });

      return result;
    } catch (error) {
      logger.error('Failed to execute LLM chain', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute chat chain
   */
  async executeChatChain(
    llmConfig: LLMConfig,
    systemMessage: string,
    humanMessage: string,
    inputs: Record<string, any>
  ): Promise<string> {
    try {
      const llm = await this.getLLM(llmConfig);
      const chatPrompt = await this.createChatPromptTemplate(systemMessage, humanMessage);

      const chain = RunnableSequence.from([
        chatPrompt,
        llm,
        new StringOutputParser(),
      ]);

      const result = await chain.invoke(inputs);

      logger.info('Chat chain executed', {
        provider: llmConfig.provider,
        model: llmConfig.model,
      });

      return result;
    } catch (error) {
      logger.error('Failed to execute chat chain', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Split text into chunks
   */
  async splitText(text: string, config: TextSplitterConfig): Promise<Document[]> {
    try {
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: config.chunkSize,
        chunkOverlap: config.chunkOverlap,
        separators: config.separator ? [config.separator] : undefined,
      });

      const docs = await splitter.createDocuments([text]);

      logger.info('Text split into chunks', {
        originalLength: text.length,
        chunks: docs.length,
        chunkSize: config.chunkSize,
      });

      return docs;
    } catch (error) {
      logger.error('Failed to split text', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create buffer memory for conversation
   */
  async createBufferMemory(conversationId: string): Promise<BufferMemory> {
    if (this.memoryInstances.has(conversationId)) {
      return this.memoryInstances.get(conversationId)!;
    }

    const memory = new BufferMemory({
      returnMessages: true,
      memoryKey: 'chat_history',
    });

    this.memoryInstances.set(conversationId, memory);

    logger.info('Buffer memory created', {
      conversationId,
    });

    return memory;
  }

  /**
   * Save conversation to memory
   */
  async saveConversation(
    conversationId: string,
    input: string,
    output: string
  ): Promise<void> {
    const memory = await this.createBufferMemory(conversationId);

    await memory.saveContext(
      { input },
      { output }
    );

    logger.info('Conversation saved to memory', {
      conversationId,
    });
  }

  /**
   * Load conversation from memory
   */
  async loadConversation(conversationId: string): Promise<any> {
    const memory = await this.createBufferMemory(conversationId);
    const messages = await memory.loadMemoryVariables({});

    return messages;
  }

  /**
   * Summarize text
   */
  async summarizeText(
    llmConfig: LLMConfig,
    text: string,
    maxLength?: number
  ): Promise<string> {
    const promptTemplate = `Summarize the following text${maxLength ? ` in approximately ${maxLength} words` : ''}:

{text}

Summary:`;

    const result = await this.executeChain(
      llmConfig,
      {
        template: promptTemplate,
        inputVariables: ['text'],
      },
      { text }
    );

    return result;
  }

  /**
   * Answer question from context
   */
  async answerQuestion(
    llmConfig: LLMConfig,
    question: string,
    context: string
  ): Promise<string> {
    const promptTemplate = `Answer the question based on the context below.

Context:
{context}

Question: {question}

Answer:`;

    const result = await this.executeChain(
      llmConfig,
      {
        template: promptTemplate,
        inputVariables: ['context', 'question'],
      },
      { context, question }
    );

    return result;
  }

  /**
   * Translate text
   */
  async translateText(
    llmConfig: LLMConfig,
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    const promptTemplate = `Translate the following text ${sourceLanguage ? `from ${sourceLanguage} ` : ''}to ${targetLanguage}:

{text}

Translation:`;

    const result = await this.executeChain(
      llmConfig,
      {
        template: promptTemplate,
        inputVariables: ['text'],
      },
      { text }
    );

    return result;
  }

  /**
   * Parse structured output
   */
  async parseStructuredOutput<T>(
    llmConfig: LLMConfig,
    promptTemplate: string,
    inputs: Record<string, any>,
    schema: any
  ): Promise<T> {
    try {
      const llm = await this.getLLM(llmConfig);
      const prompt = await this.createPromptTemplate({
        template: promptTemplate,
        inputVariables: Object.keys(inputs),
      });

      const parser = StructuredOutputParser.fromNamesAndDescriptions(schema);

      const chain = RunnableSequence.from([
        prompt,
        llm,
        parser,
      ]);

      const result = await chain.invoke(inputs);

      logger.info('Structured output parsed', {
        schema: Object.keys(schema),
      });

      return result as T;
    } catch (error) {
      logger.error('Failed to parse structured output', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for text
   * Note: This is a placeholder - actual implementation would use OpenAIEmbeddings or similar
   */
  async generateEmbeddings(
    text: string,
    config: EmbeddingConfig
  ): Promise<number[]> {
    // Placeholder - in production, use:
    // import { OpenAIEmbeddings } from '@langchain/openai';
    // const embeddings = new OpenAIEmbeddings({ openAIApiKey: config.apiKey });
    // return await embeddings.embedQuery(text);

    logger.info('Embeddings generation placeholder', {
      provider: config.provider,
      textLength: text.length,
    });

    // Return mock embeddings for now
    return new Array(1536).fill(0).map(() => Math.random());
  }

  /**
   * Clear memory
   */
  async clearMemory(conversationId: string): Promise<void> {
    if (this.memoryInstances.has(conversationId)) {
      const memory = this.memoryInstances.get(conversationId)!;
      await memory.clear();
      this.memoryInstances.delete(conversationId);

      logger.info('Memory cleared', {
        conversationId,
      });
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    llmInstances: number;
    memoryInstances: number;
  } {
    return {
      llmInstances: this.llmInstances.size,
      memoryInstances: this.memoryInstances.size,
    };
  }
}

// Singleton instance
let langChainServiceInstance: LangChainService | null = null;

export function getLangChainService(): LangChainService {
  if (!langChainServiceInstance) {
    langChainServiceInstance = new LangChainService();
    logger.info('LangChain service initialized');
  }

  return langChainServiceInstance;
}

export function initializeLangChainService(): LangChainService {
  if (langChainServiceInstance) {
    logger.warn('LangChain service already initialized');
    return langChainServiceInstance;
  }

  langChainServiceInstance = new LangChainService();
  logger.info('LangChain service initialized');
  return langChainServiceInstance;
}
