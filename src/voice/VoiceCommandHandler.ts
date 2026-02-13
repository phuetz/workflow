/**
 * Voice Command Handler
 * Enable voice-driven workflow creation and management
 */

import { EventEmitter } from 'events';

// Types
export interface VoiceCommand {
  id: string;
  transcript: string;
  confidence: number;
  language: string;
  timestamp: Date;
  intent?: CommandIntent;
  entities?: Record<string, string>;
}

export interface CommandIntent {
  action: 'create' | 'add' | 'remove' | 'connect' | 'execute' | 'stop' | 'undo' | 'redo' | 'save' | 'help' | 'navigate' | 'configure' | 'unknown';
  target?: string;
  parameters?: Record<string, unknown>;
  confidence: number;
}

export interface VoiceRecognitionConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  wakeWord?: string;
  commandTimeout?: number;
}

export interface VoiceFeedback {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  speak?: boolean;
}

export interface VoiceCommandPattern {
  pattern: RegExp;
  action: CommandIntent['action'];
  extractors?: Record<string, RegExp>;
}

export interface VoiceConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  wakeWord?: string;
  commandTimeout?: number;
}

export interface RecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: Array<{ transcript: string; confidence: number }>;
}

export interface VoiceState {
  isListening: boolean;
  isWakeWordActive: boolean;
  isSupported: boolean;
  isTTSSupported: boolean;
  language: string;
  lastCommand: VoiceCommand | null;
}

// Command patterns for intent detection
const COMMAND_PATTERNS: Array<{
  pattern: RegExp;
  action: CommandIntent['action'];
  extractors?: Record<string, RegExp>;
}> = [
  // Create workflow
  {
    pattern: /(?:create|build|make|new)\s+(?:a\s+)?(?:new\s+)?workflow\s*(?:called|named)?\s*(.+)?/i,
    action: 'create',
    extractors: { name: /(?:called|named)\s+(.+)/i },
  },
  // Add node
  {
    pattern: /(?:add|insert|create)\s+(?:a\s+)?(.+?)\s+(?:node|step|action)/i,
    action: 'add',
    extractors: { nodeType: /(?:add|insert|create)\s+(?:a\s+)?(.+?)\s+(?:node|step|action)/i },
  },
  // Remove node
  {
    pattern: /(?:remove|delete|drop)\s+(?:the\s+)?(.+?)\s+(?:node|step|action)/i,
    action: 'remove',
    extractors: { nodeType: /(?:remove|delete|drop)\s+(?:the\s+)?(.+?)\s+(?:node|step|action)/i },
  },
  // Connect nodes
  {
    pattern: /(?:connect|link|wire)\s+(.+?)\s+(?:to|with)\s+(.+)/i,
    action: 'connect',
    extractors: {
      source: /(?:connect|link|wire)\s+(.+?)\s+(?:to|with)/i,
      target: /(?:to|with)\s+(.+)/i,
    },
  },
  // Execute workflow
  {
    pattern: /(?:run|execute|start|trigger)\s+(?:the\s+)?(?:workflow)?/i,
    action: 'execute',
  },
  // Stop execution
  {
    pattern: /(?:stop|cancel|abort|halt)\s+(?:the\s+)?(?:execution|workflow)?/i,
    action: 'stop',
  },
  // Undo
  {
    pattern: /(?:undo|revert|go\s+back)/i,
    action: 'undo',
  },
  // Redo
  {
    pattern: /(?:redo|repeat|do\s+again)/i,
    action: 'redo',
  },
  // Save
  {
    pattern: /(?:save|store|persist)\s+(?:the\s+)?(?:workflow|changes)?/i,
    action: 'save',
  },
  // Help
  {
    pattern: /(?:help|what\s+can|how\s+do|show\s+commands)/i,
    action: 'help',
  },
  // Navigate
  {
    pattern: /(?:go\s+to|open|show|navigate\s+to)\s+(.+)/i,
    action: 'navigate',
    extractors: { destination: /(?:go\s+to|open|show|navigate\s+to)\s+(.+)/i },
  },
  // Configure node
  {
    pattern: /(?:configure|set|change|update)\s+(?:the\s+)?(.+?)\s+(?:to|as|=)\s+(.+)/i,
    action: 'configure',
    extractors: {
      property: /(?:configure|set|change|update)\s+(?:the\s+)?(.+?)\s+(?:to|as|=)/i,
      value: /(?:to|as|=)\s+(.+)/i,
    },
  },
];

// Voice feedback messages
const FEEDBACK_MESSAGES: Record<string, string> = {
  'create.success': 'Workflow created successfully',
  'create.error': 'Failed to create workflow',
  'add.success': 'Node added successfully',
  'add.error': 'Failed to add node',
  'remove.success': 'Node removed successfully',
  'remove.error': 'Failed to remove node',
  'connect.success': 'Nodes connected successfully',
  'connect.error': 'Failed to connect nodes',
  'execute.success': 'Workflow execution started',
  'execute.error': 'Failed to start execution',
  'stop.success': 'Execution stopped',
  'stop.error': 'Failed to stop execution',
  'undo.success': 'Action undone',
  'undo.error': 'Nothing to undo',
  'redo.success': 'Action redone',
  'redo.error': 'Nothing to redo',
  'save.success': 'Workflow saved',
  'save.error': 'Failed to save workflow',
  'unknown': 'I did not understand that command. Say "help" for available commands.',
};

/**
 * Voice Command Handler
 */
export class VoiceCommandHandler extends EventEmitter {
  private config: VoiceRecognitionConfig;
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private isWakeWordActive: boolean = false;
  private commandHistory: VoiceCommand[] = [];
  private lastCommand: VoiceCommand | null = null;

  constructor(config?: VoiceRecognitionConfig) {
    super();
    this.config = {
      language: config?.language || 'en-US',
      continuous: config?.continuous ?? true,
      interimResults: config?.interimResults ?? true,
      maxAlternatives: config?.maxAlternatives || 3,
      wakeWord: config?.wakeWord || 'hey workflow',
      commandTimeout: config?.commandTimeout || 5000,
    };

    this.initializeSpeechAPIs();
  }

  /**
   * Initialize Web Speech APIs
   */
  private initializeSpeechAPIs(): void {
    // Check for browser support
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionAPI) {
        this.recognition = new SpeechRecognitionAPI();
        this.configureRecognition();
      }

      if ('speechSynthesis' in window) {
        this.synthesis = window.speechSynthesis;
      }
    }
  }

  /**
   * Configure speech recognition
   */
  private configureRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = this.config.continuous!;
    this.recognition.interimResults = this.config.interimResults!;
    this.recognition.maxAlternatives = this.config.maxAlternatives!;
    this.recognition.lang = this.config.language!;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      this.handleRecognitionResult(event);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.handleRecognitionError(event);
    };

    this.recognition.onend = () => {
      if (this.isListening && this.config.continuous) {
        // Restart if continuous mode
        this.recognition?.start();
      } else {
        this.isListening = false;
        this.emit('listening:stopped');
      }
    };

    this.recognition.onstart = () => {
      this.emit('listening:started');
    };
  }

  /**
   * Handle speech recognition result
   */
  private handleRecognitionResult(event: SpeechRecognitionEvent): void {
    const results = event.results;
    const lastResult = results[results.length - 1];

    if (!lastResult.isFinal && !this.config.interimResults) {
      return;
    }

    const transcript = lastResult[0].transcript.trim();
    const confidence = lastResult[0].confidence;

    // Check for wake word if configured
    if (this.config.wakeWord && !this.isWakeWordActive) {
      if (transcript.toLowerCase().includes(this.config.wakeWord.toLowerCase())) {
        this.isWakeWordActive = true;
        this.speak('Listening...');
        this.emit('wakeword:detected');

        // Auto-deactivate wake word after timeout
        setTimeout(() => {
          this.isWakeWordActive = false;
        }, this.config.commandTimeout);

        return;
      }
      return;
    }

    // Process command
    const command: VoiceCommand = {
      id: this.generateId(),
      transcript,
      confidence,
      language: this.config.language!,
      timestamp: new Date(),
    };

    // Parse intent
    command.intent = this.parseIntent(transcript);
    command.entities = this.extractEntities(transcript, command.intent);

    // Store in history
    this.commandHistory.push(command);
    this.lastCommand = command;

    // Emit events
    this.emit('command:received', command);

    if (lastResult.isFinal) {
      this.emit('command:final', command);
      this.processCommand(command);
    } else {
      this.emit('command:interim', command);
    }

    // Reset wake word
    this.isWakeWordActive = false;
  }

  /**
   * Handle recognition error
   */
  private handleRecognitionError(event: SpeechRecognitionErrorEvent): void {
    this.emit('error', {
      error: event.error,
      message: event.message || 'Speech recognition error',
    });
  }

  /**
   * Parse intent from transcript
   */
  private parseIntent(transcript: string): CommandIntent {
    for (const { pattern, action, extractors } of COMMAND_PATTERNS) {
      if (pattern.test(transcript)) {
        return {
          action,
          confidence: 0.9,
          parameters: extractors ? this.extractParameters(transcript, extractors) : undefined,
        };
      }
    }

    return {
      action: 'unknown',
      confidence: 0.3,
    };
  }

  /**
   * Extract parameters using extractors
   */
  private extractParameters(transcript: string, extractors: Record<string, RegExp>): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    for (const [key, pattern] of Object.entries(extractors)) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        params[key] = match[1].trim();
      }
    }

    return params;
  }

  /**
   * Extract entities from transcript
   */
  private extractEntities(transcript: string, intent?: CommandIntent): Record<string, string> {
    const entities: Record<string, string> = {};
    const lowerTranscript = transcript.toLowerCase();

    // Extract node types
    const nodeTypes = [
      'webhook', 'schedule', 'http request', 'email', 'slack', 'filter',
      'transform', 'code', 'database', 'condition', 'loop', 'merge', 'delay',
    ];

    for (const nodeType of nodeTypes) {
      if (lowerTranscript.includes(nodeType)) {
        entities.nodeType = nodeType.replace(' ', '_');
        break;
      }
    }

    // Extract workflow names (quoted strings)
    const nameMatch = transcript.match(/["'](.+?)["']/);
    if (nameMatch) {
      entities.name = nameMatch[1];
    }

    // Extract numbers
    const numberMatch = transcript.match(/\b(\d+)\b/);
    if (numberMatch) {
      entities.number = numberMatch[1];
    }

    return entities;
  }

  /**
   * Process command and emit appropriate event
   */
  private processCommand(command: VoiceCommand): void {
    if (!command.intent) return;

    const action = command.intent.action;
    const params = {
      ...command.entities,
      ...command.intent.parameters,
    };

    switch (action) {
      case 'create':
        this.emit('action:create', params);
        break;
      case 'add':
        this.emit('action:add', params);
        break;
      case 'remove':
        this.emit('action:remove', params);
        break;
      case 'connect':
        this.emit('action:connect', params);
        break;
      case 'execute':
        this.emit('action:execute', params);
        break;
      case 'stop':
        this.emit('action:stop', params);
        break;
      case 'undo':
        this.emit('action:undo', params);
        break;
      case 'redo':
        this.emit('action:redo', params);
        break;
      case 'save':
        this.emit('action:save', params);
        break;
      case 'help':
        this.showHelp();
        break;
      case 'navigate':
        this.emit('action:navigate', params);
        break;
      case 'configure':
        this.emit('action:configure', params);
        break;
      default:
        this.provideFeedback({
          type: 'warning',
          message: FEEDBACK_MESSAGES.unknown,
          speak: true,
        });
    }
  }

  /**
   * Start listening for voice commands
   */
  start(): boolean {
    if (!this.recognition) {
      this.emit('error', { error: 'not-supported', message: 'Speech recognition not supported' });
      return false;
    }

    if (this.isListening) {
      return true;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      this.emit('error', { error: 'start-failed', message: 'Failed to start speech recognition' });
      return false;
    }
  }

  /**
   * Stop listening
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      this.recognition.stop();
    }
  }

  /**
   * Speak text using text-to-speech
   */
  speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }): void {
    if (!this.synthesis) {
      this.emit('error', { error: 'tts-not-supported', message: 'Text-to-speech not supported' });
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 1;
    utterance.pitch = options?.pitch ?? 1;
    utterance.volume = options?.volume ?? 1;
    utterance.lang = this.config.language!;

    utterance.onend = () => {
      this.emit('speech:ended', text);
    };

    utterance.onerror = (event) => {
      this.emit('error', { error: 'speech-error', message: event.error });
    };

    this.synthesis.speak(utterance);
    this.emit('speech:started', text);
  }

  /**
   * Provide feedback to user
   */
  provideFeedback(feedback: VoiceFeedback): void {
    this.emit('feedback', feedback);

    if (feedback.speak && this.synthesis) {
      this.speak(feedback.message);
    }
  }

  /**
   * Show available commands
   */
  private showHelp(): void {
    const helpText = `
      Available voice commands:
      - Create a new workflow
      - Add a [node type] node
      - Remove the [node type] node
      - Connect [source] to [target]
      - Run the workflow
      - Stop execution
      - Undo / Redo
      - Save the workflow
      - Go to [location]
      - Configure [property] to [value]
    `;

    this.provideFeedback({
      type: 'info',
      message: helpText,
      speak: true,
    });

    this.emit('help:shown');
  }

  /**
   * Get command history
   */
  getCommandHistory(): VoiceCommand[] {
    return [...this.commandHistory];
  }

  /**
   * Get last command
   */
  getLastCommand(): VoiceCommand | null {
    return this.lastCommand;
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Check if speech recognition is supported
   */
  isSupported(): boolean {
    return this.recognition !== null;
  }

  /**
   * Check if text-to-speech is supported
   */
  isTTSSupported(): boolean {
    return this.synthesis !== null;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `voice_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Set language
   */
  setLanguage(language: string): void {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  /**
   * Set wake word
   */
  setWakeWord(wakeWord: string | null): void {
    this.config.wakeWord = wakeWord || undefined;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop();
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    this.removeAllListeners();
  }
}

// Type declarations for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

// Export factory function
export function createVoiceCommandHandler(config?: VoiceRecognitionConfig): VoiceCommandHandler {
  return new VoiceCommandHandler(config);
}

export default VoiceCommandHandler;
