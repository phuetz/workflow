import { NodeConfigDefinition, validators, commonFields } from '../../../types/nodeConfig';

export const openAIConfig: NodeConfigDefinition = {
  fields: [
    commonFields.apiKey('OpenAI API Key'),
    {
      label: 'Model',
      field: 'model',
      type: 'select',
      required: true,
      defaultValue: 'gpt-4-turbo-preview',
      options: [
        { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo (Latest)' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-4-32k', label: 'GPT-4 32K' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K' },
        { value: 'dall-e-3', label: 'DALL-E 3 (Image Generation)' },
        { value: 'dall-e-2', label: 'DALL-E 2 (Image Generation)' },
        { value: 'whisper-1', label: 'Whisper (Audio Transcription)' },
        { value: 'tts-1', label: 'TTS-1 (Text to Speech)' },
        { value: 'tts-1-hd', label: 'TTS-1-HD (High Quality Text to Speech)' }
      ]
    },
    {
      label: 'Operation Type',
      field: 'operationType',
      type: 'select',
      required: true,
      defaultValue: 'chat',
      options: [
        { value: 'chat', label: 'Chat Completion' },
        { value: 'image', label: 'Image Generation' },
        { value: 'audio', label: 'Audio Transcription' },
        { value: 'tts', label: 'Text to Speech' },
        { value: 'embedding', label: 'Create Embedding' },
        { value: 'moderation', label: 'Content Moderation' }
      ]
    },
    {
      label: 'Temperature',
      field: 'temperature',
      type: 'number',
      placeholder: '0.7',
      defaultValue: 0.7,
      description: 'Controls randomness: 0 = deterministic, 2 = very creative',
      validation: (value) => {
        if (!value) return null;
        const num = Number(value);
        if (isNaN(num) || num < 0 || num > 2) {
          return 'Temperature must be between 0 and 2';
        }
        return null;
      }
    },
    {
      label: 'Max Tokens',
      field: 'maxTokens',
      type: 'number',
      placeholder: '1000',
      defaultValue: 1000,
      description: 'Maximum number of tokens to generate',
      validation: validators.positiveNumber
    },
    {
      label: 'System Prompt',
      field: 'systemPrompt',
      type: 'expression',
      placeholder: 'You are a helpful assistant...',
      description: 'System message to set the behavior of the assistant'
    },
    {
      label: 'User Prompt',
      field: 'prompt',
      type: 'expression',
      required: true,
      placeholder: '{{$json.message}}',
      description: 'The prompt or message to send',
      validation: validators.required('Prompt')
    },
    {
      label: 'Response Format',
      field: 'responseFormat',
      type: 'select',
      defaultValue: 'text',
      options: [
        { value: 'text', label: 'Text' },
        { value: 'json_object', label: 'JSON Object' }
      ],
      description: 'Format of the response (GPT-4 Turbo only)'
    },
    {
      label: 'Top P',
      field: 'topP',
      type: 'number',
      placeholder: '1',
      defaultValue: 1,
      description: 'Nucleus sampling: 0.1 = only top 10% probability tokens',
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
      label: 'Frequency Penalty',
      field: 'frequencyPenalty',
      type: 'number',
      placeholder: '0',
      defaultValue: 0,
      description: 'Reduce repetition: -2 to 2',
      validation: (value) => {
        if (!value) return null;
        const num = Number(value);
        if (isNaN(num) || num < -2 || num > 2) {
          return 'Frequency penalty must be between -2 and 2';
        }
        return null;
      }
    },
    {
      label: 'Presence Penalty',
      field: 'presencePenalty',
      type: 'number',
      placeholder: '0',
      defaultValue: 0,
      description: 'Encourage new topics: -2 to 2',
      validation: (value) => {
        if (!value) return null;
        const num = Number(value);
        if (isNaN(num) || num < -2 || num > 2) {
          return 'Presence penalty must be between -2 and 2';
        }
        return null;
      }
    },
    {
      label: 'Stop Sequences',
      field: 'stopSequences',
      type: 'text',
      placeholder: 'Comma-separated stop words',
      description: 'Words that will stop generation when encountered'
    },
    {
      label: 'Image Size (DALL-E)',
      field: 'imageSize',
      type: 'select',
      defaultValue: '1024x1024',
      options: [
        { value: '256x256', label: '256x256' },
        { value: '512x512', label: '512x512' },
        { value: '1024x1024', label: '1024x1024' },
        { value: '1792x1024', label: '1792x1024 (DALL-E 3)' },
        { value: '1024x1792', label: '1024x1792 (DALL-E 3)' }
      ]
    },
    {
      label: 'Image Quality (DALL-E 3)',
      field: 'imageQuality',
      type: 'select',
      defaultValue: 'standard',
      options: [
        { value: 'standard', label: 'Standard' },
        { value: 'hd', label: 'HD' }
      ]
    },
    {
      label: 'Number of Images',
      field: 'numberOfImages',
      type: 'number',
      placeholder: '1',
      defaultValue: 1,
      validation: (value) => {
        if (!value) return null;
        const num = Number(value);
        if (isNaN(num) || num < 1 || num > 10) {
          return 'Number of images must be between 1 and 10';
        }
        return null;
      }
    }
  ],
  
  validate: (config) => {
    const errors: Record<string, string> = {};

    const model = typeof config.model === 'string' ? config.model : '';
    const operationType = typeof config.operationType === 'string' ? config.operationType : '';
    const responseFormat = typeof config.responseFormat === 'string' ? config.responseFormat : '';

    // Model-specific validations
    if (operationType === 'image' && !model.includes('dall-e')) {
      errors.model = 'Please select a DALL-E model for image generation';
    }

    if (operationType === 'audio' && model !== 'whisper-1') {
      errors.model = 'Please select Whisper model for audio transcription';
    }

    if (operationType === 'tts' && !model.includes('tts')) {
      errors.model = 'Please select a TTS model for text to speech';
    }

    if (responseFormat === 'json_object' && !model.includes('gpt-4')) {
      errors.responseFormat = 'JSON response format is only available for GPT-4 models';
    }

    return errors;
  },

  examples: [
    {
      label: 'Chat Assistant',
      config: {
        model: 'gpt-4-turbo-preview',
        operationType: 'chat',
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt: 'You are a helpful assistant that provides clear and concise answers.',
        prompt: '{{$json.question}}'
      }
    },
    {
      label: 'Creative Writing',
      config: {
        model: 'gpt-4',
        operationType: 'chat',
        temperature: 1.2,
        maxTokens: 2000,
        systemPrompt: 'You are a creative writer. Generate engaging and imaginative content.',
        prompt: 'Write a short story about {{$json.topic}}'
      }
    },
    {
      label: 'Code Generation',
      config: {
        model: 'gpt-4-turbo-preview',
        operationType: 'chat',
        temperature: 0.2,
        maxTokens: 1500,
        systemPrompt: 'You are an expert programmer. Generate clean, efficient, and well-commented code.',
        prompt: 'Write a {{$json.language}} function that {{$json.description}}',
        responseFormat: 'text'
      }
    },
    {
      label: 'JSON Data Extraction',
      config: {
        model: 'gpt-4-turbo-preview',
        operationType: 'chat',
        temperature: 0,
        maxTokens: 500,
        systemPrompt: 'Extract structured data from text and return as JSON.',
        prompt: 'Extract key information from: {{$json.text}}',
        responseFormat: 'json_object'
      }
    },
    {
      label: 'Image Generation',
      config: {
        model: 'dall-e-3',
        operationType: 'image',
        prompt: '{{$json.imageDescription}}',
        imageSize: '1024x1024',
        imageQuality: 'standard',
        numberOfImages: 1
      }
    },
    {
      label: 'Audio Transcription',
      config: {
        model: 'whisper-1',
        operationType: 'audio',
        prompt: '{{$binary.audioFile}}'
      }
    }
  ]
};