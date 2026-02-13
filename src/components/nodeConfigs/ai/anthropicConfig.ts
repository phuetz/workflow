import { NodeConfigDefinition, validators, commonFields } from '../../../types/nodeConfig';

export const anthropicConfig: NodeConfigDefinition = {
  fields: [
    commonFields.apiKey('Anthropic API Key'),
    {
      label: 'Model',
      field: 'model',
      type: 'select',
      required: true,
      defaultValue: 'claude-3-opus-20240229',
      options: [
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Most Capable)' },
        { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet (Balanced)' },
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Fastest)' },
        { value: 'claude-2.1', label: 'Claude 2.1 (Legacy)' },
        { value: 'claude-2.0', label: 'Claude 2.0 (Legacy)' },
        { value: 'claude-instant-1.2', label: 'Claude Instant 1.2 (Legacy Fast)' }
      ]
    },
    {
      label: 'Max Tokens',
      field: 'maxTokens',
      type: 'number',
      placeholder: '1000',
      defaultValue: 1000,
      required: true,
      description: 'Maximum number of tokens to generate (up to 4096)',
      validation: (value) => {
        const num = Number(value);
        if (isNaN(num) || num < 1) {
          return 'Max tokens must be at least 1';
        }
        if (num > 4096) {
          return 'Max tokens cannot exceed 4096';
        }
        return null;
      }
    },
    {
      label: 'System Prompt',
      field: 'systemPrompt',
      type: 'expression',
      placeholder: 'You are Claude, a helpful AI assistant...',
      description: 'System message to set Claude\'s behavior and context'
    },
    {
      label: 'User Prompt',
      field: 'prompt',
      type: 'expression',
      required: true,
      placeholder: '{{$json.message}}',
      description: 'The message or prompt to send to Claude',
      validation: validators.required('Prompt')
    },
    {
      label: 'Temperature',
      field: 'temperature',
      type: 'number',
      placeholder: '1',
      defaultValue: 1,
      description: 'Controls randomness: 0 = deterministic, 1 = balanced',
      validation: (value) => {
        if (!value && value !== 0) return null;
        const num = Number(value);
        if (isNaN(num) || num < 0 || num > 1) {
          return 'Temperature must be between 0 and 1';
        }
        return null;
      }
    },
    {
      label: 'Top P',
      field: 'topP',
      type: 'number',
      placeholder: '0.999',
      description: 'Nucleus sampling threshold',
      validation: (value) => {
        if (!value) return null;
        const num = Number(value);
        if (isNaN(num) || num < 0 || num > 1) {
          return 'Top P must be between 0 and 1';
        }
        return null;
      }
    },
    {
      label: 'Top K',
      field: 'topK',
      type: 'number',
      placeholder: '0',
      description: 'Only sample from top K tokens (0 = disabled)',
      validation: (value) => {
        if (!value) return null;
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          return 'Top K must be 0 or positive';
        }
        return null;
      }
    },
    {
      label: 'Stop Sequences',
      field: 'stopSequences',
      type: 'text',
      placeholder: 'Human:,Assistant:',
      description: 'Comma-separated sequences that will stop generation'
    },
    {
      label: 'Stream Response',
      field: 'stream',
      type: 'checkbox',
      defaultValue: false,
      description: 'Stream the response as it\'s generated'
    },
    {
      label: 'Include Conversation History',
      field: 'includeHistory',
      type: 'checkbox',
      defaultValue: true,
      description: 'Include previous messages in the conversation'
    },
    {
      label: 'Metadata',
      field: 'metadata',
      type: 'json',
      placeholder: '{"user_id": "123"}',
      description: 'Optional metadata to include with the request',
      validation: (value) => {
        if (!value) return null;
        return validators.json(value as string);
      }
    }
  ],
  
  validate: (config) => {
    const errors: Record<string, string> = {};

    const model = config.model as string | undefined;
    const maxTokens = config.maxTokens as number | undefined;
    const systemPrompt = config.systemPrompt as string | undefined;

    // Model-specific validations
    if (model?.includes('claude-3') && maxTokens && maxTokens > 4096) {
      errors.maxTokens = 'Claude 3 models support up to 4096 output tokens';
    }

    if (model?.includes('claude-2') && maxTokens && maxTokens > 100000) {
      errors.maxTokens = 'Claude 2 models support up to 100K output tokens';
    }

    // Ensure system prompt is appropriate
    if (systemPrompt && systemPrompt.length > 10000) {
      errors.systemPrompt = 'System prompt is too long (max 10,000 characters)';
    }

    return errors;
  },

  transform: (config) => {
    // Transform stop sequences from comma-separated string to array
    if (config.stopSequences && typeof config.stopSequences === 'string') {
      config.stopSequences = config.stopSequences
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
    
    return config;
  },

  examples: [
    {
      label: 'General Assistant',
      config: {
        model: 'claude-3-opus-20240229',
        maxTokens: 1000,
        temperature: 1,
        systemPrompt: 'You are Claude, a helpful AI assistant created by Anthropic.',
        prompt: '{{$json.question}}'
      }
    },
    {
      label: 'Code Review',
      config: {
        model: 'claude-3-opus-20240229',
        maxTokens: 2000,
        temperature: 0.3,
        systemPrompt: 'You are an expert code reviewer. Analyze code for bugs, performance issues, and best practices.',
        prompt: 'Review this code:\n\n{{$json.code}}'
      }
    },
    {
      label: 'Creative Writing',
      config: {
        model: 'claude-3-sonnet-20240229',
        maxTokens: 2000,
        temperature: 0.9,
        topP: 0.95,
        systemPrompt: 'You are a creative writer with a vivid imagination.',
        prompt: 'Write a story about {{$json.topic}}'
      }
    },
    {
      label: 'Data Analysis',
      config: {
        model: 'claude-3-opus-20240229',
        maxTokens: 1500,
        temperature: 0.2,
        systemPrompt: 'You are a data analyst. Provide clear, structured analysis with insights.',
        prompt: 'Analyze this data and provide insights:\n\n{{$json.data}}'
      }
    },
    {
      label: 'Quick Response',
      config: {
        model: 'claude-3-haiku-20240307',
        maxTokens: 500,
        temperature: 0.7,
        prompt: '{{$json.query}}'
      }
    },
    {
      label: 'Document Summarization',
      config: {
        model: 'claude-3-sonnet-20240229',
        maxTokens: 800,
        temperature: 0.3,
        systemPrompt: 'Summarize documents concisely while preserving key information.',
        prompt: 'Summarize this document:\n\n{{$json.document}}'
      }
    }
  ]
};