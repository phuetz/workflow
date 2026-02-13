/**
 * Natural Language Processing Engine
 * Advanced NLP capabilities for workflow automation
 */

import * as natural from 'natural';
import { pipeline, env } from '@xenova/transformers';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EventEmitter } from 'events';

// Configure Transformers.js to use local models
env.localURL = './models/';
env.allowRemoteModels = false;

export interface NLPTask {
  id: string;
  type: 'classification' | 'ner' | 'sentiment' | 'summarization' | 'translation' | 'qa' | 'generation';
  input: string | string[];
  options?: {
    language?: string;
    maxLength?: number;
    temperature?: number;
    topK?: number;
    labels?: string[];
  };
}

export interface NLPResult {
  taskId: string;
  output: string | string[] | Array<{label: string; score: number}> | Record<string, unknown>;
  confidence?: number;
  processingTime: number;
  model: string;
}

export interface EntityResult {
  entity: string;
  label: string;
  confidence: number;
  start: number;
  end: number;
}

export interface EntityGroup {
  entities: Array<{
    entity_group?: string;
    entity?: string;
    word: string;
  }>;
  grouped: Record<string, string[]>;
  locations: string[];
  persons: string[];
  organizations: string[];
  dates: string[];
  misc: string[];
}

export interface SentimentResult {
  label: string;
  score: number;
  sentiment: string;
  confidence: number;
}

export interface TaggedToken {
  0: string; // word
  1: string; // POS tag
}

export interface SummaryResult {
  summary: string;
  method: 'abstractive' | 'extractive';
  compression_ratio?: number;
  sentences?: number;
}

export interface TranslationResult {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  confidence: number;
}

export interface QAResult {
  answer: string;
  confidence: number;
  start: number;
  end: number;
}

export interface GenerationResult {
  text: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class NLPEngine extends EventEmitter {
  private pipelines: Map<string, unknown> = new Map();
  private tokenizers: Map<string, unknown> = new Map();
  private languageDetector: unknown;
  private openai: OpenAI;
  private anthropic: Anthropic;
  private googleAI: GoogleGenerativeAI;
  
  constructor(config?: {
    openaiKey?: string;
    anthropicKey?: string;
    googleKey?: string;
  }) {
    super();
    this.initialize(config);
  }
  
  private async initialize(config?: {
    openaiKey?: string;
    anthropicKey?: string;
    googleKey?: string;
  }): Promise<void> {
    // Initialize language detection
    this.languageDetector = new natural.Language.detect();
    
    // Initialize API clients if keys provided
    if (config?.openaiKey) {
      this.openai = new OpenAI({ apiKey: config.openaiKey });
    }
    if (config?.anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: config.anthropicKey });
    }
    if (config?.googleKey) {
      this.googleAI = new GoogleGenerativeAI(config.googleKey);
    }
    
    // Pre-load common pipelines
    await this.loadPipeline('sentiment', 'sentiment-analysis');
    await this.loadPipeline('ner', 'token-classification');
    await this.loadPipeline('summarization', 'summarization');
    
    console.log('NLP Engine initialized');
  }
  
  private async loadPipeline(name: string, task: string): Promise<void> {
    try {
      const pipe = await pipeline(task);
      this.pipelines.set(name, pipe);
    } catch (error) {
      console.warn(`Failed to load pipeline ${name}: ${error}`);
    }
  }
  
  // Core NLP Tasks
  
  public async process(task: NLPTask): Promise<NLPResult> {
    const startTime = Date.now();
    
    try {
      let result: string | string[] | Array<{label: string; score: number}> | Record<string, unknown>;
      let model = 'transformers';
      
      switch (task.type) {
        case 'classification':
          result = await this.classify(task.input as string, task.options);
          break;
          
        case 'ner':
          result = await this.extractEntities(task.input as string, task.options);
          break;
          
        case 'sentiment':
          result = await this.analyzeSentiment(task.input as string, task.options);
          break;
          
        case 'summarization':
          result = await this.summarize(task.input as string, task.options);
          break;
          
        case 'translation':
          result = await this.translate(task.input as string, task.options);
          break;
          
        case 'qa':
          result = await this.answerQuestion(task.input as string[], task.options);
          break;
          
        case 'generation':
          result = await this.generateText(task.input as string, task.options);
          model = 'llm';
          break;
          
        default:
          throw new Error(`Unsupported NLP task: ${task.type}`);
      }
      
      const processingTime = Date.now() - startTime;
      
      this.emit('task:complete', {
        taskId: task.id,
        type: task.type,
        processingTime
      });
      
      return {
        taskId: task.id,
        output: result,
        processingTime,
        model
      };
      
    } catch (error) {
      this.emit('task:error', { taskId: task.id, error });
      throw error;
    }
  }
  
  // Text Classification
  
  private async classify(text: string, options?: { labels?: string[] }): Promise<{
    labels: string[];
    scores: number[];
  }> {
    const classifier = this.pipelines.get('classification') || 
                      await pipeline('text-classification');
    
    const results = await classifier(text, {
      candidate_labels: options?.labels || ['positive', 'negative', 'neutral'],
      multi_class: true
    });
    
    return {
      labels: results.map((r: { label: string; score: number }) => r.label),
      scores: results.map((r: { label: string; score: number }) => r.score)
    };
  }
  
  // Named Entity Recognition
  
  private async extractEntities(
    text: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: Record<string, unknown>
  ): Promise<Array<{
    entity: string;
    label: string;
    confidence: number;
    start: number;
    end: number;
  }>> {
    const ner = this.pipelines.get('ner');
    if (!ner) {
      // Fallback to natural NER
      return this.extractEntitiesNatural(text);
    }
    
    const entities = await ner(text);
    
    // Group entities by type
    const grouped: Record<string, string[]> = {};
    for (const entity of entities) {
      const type = entity.entity_group || entity.entity;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(entity.word);
    }
    
    return {
      entities: entities,
      grouped,
      locations: grouped['LOC'] || [],
      persons: grouped['PER'] || [],
      organizations: grouped['ORG'] || [],
      dates: grouped['DATE'] || [],
      misc: grouped['MISC'] || []
    };
  }
  
  private extractEntitiesNatural(text: string): EntityGroup {
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text);
    const tagged = new natural.BrillPOSTagger().tag(tokens);
    
    const entities = {
      persons: [],
      locations: [],
      organizations: [],
      dates: []
    };
    
    // Simple rule-based NER
    tagged.forEach((token: TaggedToken, i: number) => {
      if (token[1] === 'NNP' || token[1] === 'NNPS') {
        // Proper nouns - could be person, place, or organization
        if (i > 0 && (tagged[i-1][0].toLowerCase() === 'mr' || 
            tagged[i-1][0].toLowerCase() === 'mrs' || 
            tagged[i-1][0].toLowerCase() === 'ms')) {
          entities.persons.push(token[0]);
        }
      }
    });
    
    return entities;
  }
  
  // Sentiment Analysis
  
  private async analyzeSentiment(
    text: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: Record<string, unknown>
  ): Promise<SentimentResult> {
    const sentiment = this.pipelines.get('sentiment');
    if (!sentiment) {
      // Fallback to natural sentiment
      return this.analyzeSentimentNatural(text);
    }
    
    const results = await sentiment(text);
    
    return {
      label: results[0].label,
      score: results[0].score,
      sentiment: this.mapSentimentLabel(results[0].label),
      confidence: results[0].score
    };
  }
  
  private analyzeSentimentNatural(text: string): SentimentResult {
    const analyzer = new natural.SentimentAnalyzer('English', 
      natural.PorterStemmer, 'afinn');
    
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text);
    const score = analyzer.getSentiment(tokens);
    
    return {
      score,
      sentiment: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
      confidence: Math.abs(score)
    };
  }
  
  private mapSentimentLabel(label: string): string {
    const mapping: Record<string, string> = {
      'POSITIVE': 'positive',
      'NEGATIVE': 'negative',
      'NEUTRAL': 'neutral',
      '5 stars': 'very_positive',
      '4 stars': 'positive',
      '3 stars': 'neutral',
      '2 stars': 'negative',
      '1 star': 'very_negative'
    };
    
    return mapping[label] || label.toLowerCase();
  }
  
  // Text Summarization
  
  private async summarize(
    text: string,
    options?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const summarizer = this.pipelines.get('summarization');
    if (!summarizer) {
      // Fallback to extractive summarization
      return this.summarizeExtractive(text, options || {});
    }
    
    const summary = await summarizer(text, {
      max_length: options?.maxLength || 150,
      min_length: 30,
      do_sample: false
    });
    
    return {
      summary: summary[0].summary_text,
      method: 'abstractive',
      compression_ratio: summary[0].summary_text.length / text.length
    };
  }
  
  private summarizeExtractive(text: string, options?: Record<string, unknown>): Record<string, unknown> {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const tfidf = new natural.TfIdf();
    
    sentences.forEach(sentence => {
      tfidf.addDocument(sentence);
    });
    
    // Score sentences
    const scores: Array<{sentence: string, score: number}> = [];
    sentences.forEach((sentence, i) => {
      let score = 0;
      tfidf.listTerms(i).forEach((term: { term: string; tfidf: number }) => {
        score += term.tfidf;
      });
      scores.push({ sentence, score });
    });
    
    // Sort by score and take top sentences
    const numSentences = Math.min(
      options?.maxSentences || 3,
      Math.ceil(sentences.length * 0.3)
    );
    
    const topSentences = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, numSentences)
      .map(s => s.sentence);
    
    return {
      summary: topSentences.join(' '),
      method: 'extractive',
      sentences: topSentences.length
    };
  }
  
  // Translation
  
  private async translate(text: string, options?: Record<string, unknown>): Promise<TranslationResult> {
    const sourceLang = options?.sourceLang || 'auto';
    const targetLang = options?.targetLang || 'en';
    
    // Use translation pipeline if available
    const translator = await pipeline('translation', {
      model: `Helsinki-NLP/opus-mt-${sourceLang}-${targetLang}`
    });
    
    const result = await translator(text);
    
    return {
      translatedText: result[0].translation_text,
      sourceLang,
      targetLang,
      confidence: result[0].score || 1.0
    };
  }
  
  // Question Answering
  
  private async answerQuestion(
    input: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: Record<string, unknown>
  ): Promise<QAResult> {
    const [question, context] = input;
    
    const qa = await pipeline('question-answering');
    const result = await qa({
      question,
      context
    });
    
    return {
      answer: result.answer,
      confidence: result.score,
      start: result.start,
      end: result.end
    };
  }
  
  // Text Generation (using LLMs)
  
  private async generateText(prompt: string, options?: Record<string, unknown>): Promise<GenerationResult> {
    const provider = options?.provider || 'openai';
    const model = options?.model || 'gpt-3.5-turbo';
    
    switch (provider) {
      case 'openai':
        return await this.generateWithOpenAI(prompt, model, options);
        
      case 'anthropic':
        return await this.generateWithAnthropic(prompt, model, options);
        
      case 'google':
        return await this.generateWithGoogle(prompt, model, options);
        
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
  
  private async generateWithOpenAI(prompt: string, model: string, options?: Record<string, unknown>): Promise<GenerationResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }
    
    const completion = await this.openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxLength || 500,
      top_p: options?.topP || 1.0
    });
    
    return {
      text: completion.choices[0].message.content,
      model,
      usage: completion.usage
    };
  }
  
  private async generateWithAnthropic(prompt: string, model: string, options?: Record<string, unknown>): Promise<GenerationResult> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }
    
    const message = await this.anthropic.messages.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxLength || 500,
      temperature: options?.temperature || 0.7
    });
    
    return {
      text: message.content[0].text,
      model,
      usage: message.usage
    };
  }
  
  private async generateWithGoogle(
    prompt: string,
    model: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: Record<string, unknown>
  ): Promise<GenerationResult> {
    if (!this.googleAI) {
      throw new Error('Google AI client not initialized');
    }
    
    const genModel = this.googleAI.getGenerativeModel({ model });
    const result = await genModel.generateContent(prompt);
    
    return {
      text: result.response.text(),
      model
    };
  }
  
  // Advanced NLP Features
  
  public async detectLanguage(text: string): Promise<string> {
    const languages = this.languageDetector.detect(text);
    return languages[0][0]; // Return top detected language
  }
  
  public async extractKeywords(text: string, numKeywords: number = 10): Promise<string[]> {
    const tfidf = new natural.TfIdf();
    tfidf.addDocument(text);
    
    const terms: Array<{term: string, tfidf: number}> = [];
    tfidf.listTerms(0).forEach((item: { term: string; tfidf: number }) => {
      terms.push({ term: item.term, tfidf: item.tfidf });
    });
    
    return terms
      .sort((a, b) => b.tfidf - a.tfidf)
      .slice(0, numKeywords)
      .map(t => t.term);
  }
  
  public async analyzeToxicity(text: string): Promise<Record<string, number>> {
    // Use a toxicity detection model
    const classifier = await pipeline('text-classification', {
      model: 'unitary/toxic-bert'
    });
    
    const results = await classifier(text);
    
    return {
      toxic: results.find((r: { label: string; score: number }) => r.label === 'TOXIC')?.score || 0,
      severe_toxic: results.find((r: { label: string; score: number }) => r.label === 'SEVERE_TOXIC')?.score || 0,
      obscene: results.find((r: { label: string; score: number }) => r.label === 'OBSCENE')?.score || 0,
      threat: results.find((r: { label: string; score: number }) => r.label === 'THREAT')?.score || 0,
      insult: results.find((r: { label: string; score: number }) => r.label === 'INSULT')?.score || 0,
      identity_hate: results.find((r: { label: string; score: number }) => r.label === 'IDENTITY_HATE')?.score || 0
    };
  }
  
  public async generateEmbeddings(texts: string[], model: string = 'sentence-transformers/all-MiniLM-L6-v2'): Promise<number[][]> {
    const embedder = await pipeline('feature-extraction', { model });
    const embeddings = await embedder(texts);
    
    return embeddings;
  }
  
  public async clusterTexts(texts: string[], numClusters: number = 5): Promise<number[]> {
    const embeddings = await this.generateEmbeddings(texts);
    
    // Simple k-means clustering
    const kmeans = new natural.KMeans();
    const clusters = kmeans.cluster(embeddings, numClusters);
    
    return clusters;
  }
  
  public async findSimilarTexts(query: string, corpus: string[], topK: number = 5): Promise<Array<{text: string, score: number}>> {
    const queryEmbedding = await this.generateEmbeddings([query]);
    const corpusEmbeddings = await this.generateEmbeddings(corpus);
    
    // Calculate cosine similarity
    const similarities = corpusEmbeddings.map((embedding, i) => ({
      text: corpus[i],
      score: this.cosineSimilarity(queryEmbedding[0], embedding)
    }));
    
    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    return dotProduct / (magnitudeA * magnitudeB);
  }
}