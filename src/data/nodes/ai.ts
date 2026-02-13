import { NodeType } from '../../types/workflow';

export const AI_NODES: Record<string, NodeType> = {
  openai: {
      type: 'openai',
      label: 'OpenAI / ChatGPT',
      icon: 'Bot',
      color: 'bg-gray-700',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'OpenAI GPT models'
    },
  anthropic: {
      type: 'anthropic',
      label: 'Claude AI',
      icon: 'Brain',
      color: 'bg-amber-600',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Anthropic Claude AI'
    },
  pinecone: {
      type: 'pinecone',
      label: 'Pinecone',
      icon: 'Cpu',
      color: 'bg-green-600',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Pinecone vector database'
    },
  weaviate: {
      type: 'weaviate',
      label: 'Weaviate',
      icon: 'Network',
      color: 'bg-orange-600',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Weaviate vector search'
    },
  chroma: {
      type: 'chroma',
      label: 'Chroma',
      icon: 'Database',
      color: 'bg-purple-600',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Chroma vector store'
    },
  langchain: {
      type: 'langchain',
      label: 'LangChain',
      icon: 'Link',
      color: 'bg-blue-700',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'LangChain AI orchestration'
    },
  vertexAI: {
      type: 'vertexAI',
      label: 'Google Vertex AI',
      icon: 'Brain',
      color: 'bg-blue-600',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Google Vertex AI platform'
    },
  bedrock: {
      type: 'bedrock',
      label: 'Amazon Bedrock',
      icon: 'Bot',
      color: 'bg-orange-700',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Amazon Bedrock AI models'
    },
  huggingface: {
      type: 'huggingface',
      label: 'Hugging Face',
      icon: 'Smile',
      color: 'bg-yellow-600',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Hugging Face AI models'
    },
  cohere: {
      type: 'cohere',
      label: 'Cohere',
      icon: 'MessageSquare',
      color: 'bg-purple-700',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Cohere AI language models'
    },
  multiModelAI: {
      type: 'multiModelAI',
      label: 'Multi-Model AI',
      icon: 'Brain',
      color: 'bg-purple-600',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'AI with multiple providers (GPT, Claude, Gemini)'
    },
  llmChain: {
      type: 'llmChain',
      label: 'LLM Chain',
      icon: 'Link',
      color: 'bg-indigo-600',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'LangChain LLM chain for text generation'
    },
  promptTemplate: {
      type: 'promptTemplate',
      label: 'Prompt Template',
      icon: 'FileText',
      color: 'bg-blue-600',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Dynamic prompt template with variables'
    },
  chatPromptTemplate: {
      type: 'chatPromptTemplate',
      label: 'Chat Prompt Template',
      icon: 'MessageSquare',
      color: 'bg-green-600',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Chat-based prompt template'
    },
  documentLoader: {
      type: 'documentLoader',
      label: 'Document Loader',
      icon: 'FileInput',
      color: 'bg-purple-600',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Load documents from various sources (PDF, txt, web)'
    },
  textSplitter: {
      type: 'textSplitter',
      label: 'Text Splitter',
      icon: 'Split',
      color: 'bg-yellow-600',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Split text into chunks for processing'
    },
  documentTransformer: {
      type: 'documentTransformer',
      label: 'Document Transformer',
      icon: 'Shuffle',
      color: 'bg-orange-600',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Transform and enrich documents'
    },
  embeddings: {
      type: 'embeddings',
      label: 'Text Embeddings',
      icon: 'Binary',
      color: 'bg-cyan-600',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Generate text embeddings (OpenAI, Cohere, HuggingFace)'
    },
  vectorStore: {
      type: 'vectorStore',
      label: 'Vector Store',
      icon: 'Database',
      color: 'bg-teal-600',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Store and query vector embeddings'
    },
  vectorStoreRetriever: {
      type: 'vectorStoreRetriever',
      label: 'Vector Retriever',
      icon: 'Search',
      color: 'bg-emerald-600',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Retrieve relevant documents from vector store'
    },
  conversationMemory: {
      type: 'conversationMemory',
      label: 'Conversation Memory',
      icon: 'Brain',
      color: 'bg-pink-600',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Maintain conversation history'
    },
  bufferMemory: {
      type: 'bufferMemory',
      label: 'Buffer Memory',
      icon: 'History',
      color: 'bg-rose-600',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Simple conversation buffer memory'
    },
  summaryMemory: {
      type: 'summaryMemory',
      label: 'Summary Memory',
      icon: 'FileText',
      color: 'bg-fuchsia-600',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Summarize conversation history'
    },
  aiAgent: {
      type: 'aiAgent',
      label: 'AI Agent',
      icon: 'Bot',
      color: 'bg-violet-600',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'LangChain agent with tool usage'
    },
  agentExecutor: {
      type: 'agentExecutor',
      label: 'Agent Executor',
      icon: 'Play',
      color: 'bg-purple-700',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Execute agent with tools'
    },
  customTool: {
      type: 'customTool',
      label: 'Custom Tool',
      icon: 'Wrench',
      color: 'bg-gray-700',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Define custom tool for agent'
    },
  ragChain: {
      type: 'ragChain',
      label: 'RAG Chain',
      icon: 'GitMerge',
      color: 'bg-indigo-700',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Retrieval Augmented Generation chain'
    },
  stuffDocumentsChain: {
      type: 'stuffDocumentsChain',
      label: 'Stuff Documents Chain',
      icon: 'Files',
      color: 'bg-blue-700',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Chain to stuff documents into prompt'
    },
  mapReduceChain: {
      type: 'mapReduceChain',
      label: 'Map Reduce Chain',
      icon: 'GitBranch',
      color: 'bg-green-700',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Map-reduce over documents'
    },
  refineChain: {
      type: 'refineChain',
      label: 'Refine Chain',
      icon: 'RefreshCcw',
      color: 'bg-yellow-700',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Iteratively refine output'
    },
  structuredOutputParser: {
      type: 'structuredOutputParser',
      label: 'Structured Output Parser',
      icon: 'Braces',
      color: 'bg-amber-600',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Parse LLM output into structured format'
    },
  jsonOutputParser: {
      type: 'jsonOutputParser',
      label: 'JSON Output Parser',
      icon: 'Code',
      color: 'bg-orange-700',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Parse LLM output as JSON'
    },
  summarizationChain: {
      type: 'summarizationChain',
      label: 'Summarization Chain',
      icon: 'FileText',
      color: 'bg-teal-700',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Summarize long documents'
    },
  qaChain: {
      type: 'qaChain',
      label: 'Q&A Chain',
      icon: 'HelpCircle',
      color: 'bg-cyan-700',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Question answering over documents'
    },
  conversationalChain: {
      type: 'conversationalChain',
      label: 'Conversational Chain',
      icon: 'MessageCircle',
      color: 'bg-sky-700',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Conversational chain with memory'
    },
  translationChain: {
      type: 'translationChain',
      label: 'Translation Chain',
      icon: 'Languages',
      color: 'bg-blue-800',
      category: 'langchain',
      inputs: 1,
      outputs: 1,
      description: 'Translate text between languages'
    },
  pineconeVectorStore: {
      type: 'pineconeVectorStore',
      label: 'Pinecone Vector Store',
      icon: 'Database',
      color: 'bg-green-700',
      category: 'vectordb',
      inputs: 1,
      outputs: 1,
      description: 'Pinecone vector database operations'
    },
  chromaVectorStore: {
      type: 'chromaVectorStore',
      label: 'Chroma Vector Store',
      icon: 'Database',
      color: 'bg-purple-700',
      category: 'vectordb',
      inputs: 1,
      outputs: 1,
      description: 'Chroma vector database operations'
    },
  weaviateVectorStore: {
      type: 'weaviateVectorStore',
      label: 'Weaviate Vector Store',
      icon: 'Network',
      color: 'bg-orange-700',
      category: 'vectordb',
      inputs: 1,
      outputs: 1,
      description: 'Weaviate vector search operations'
    },
  qdrantVectorStore: {
      type: 'qdrantVectorStore',
      label: 'Qdrant Vector Store',
      icon: 'Database',
      color: 'bg-red-700',
      category: 'vectordb',
      inputs: 1,
      outputs: 1,
      description: 'Qdrant vector database'
    },
  faissVectorStore: {
      type: 'faissVectorStore',
      label: 'FAISS Vector Store',
      icon: 'Cpu',
      color: 'bg-blue-800',
      category: 'vectordb',
      inputs: 1,
      outputs: 1,
      description: 'Facebook AI Similarity Search (FAISS)'
    },
  stabilityAI: {
      type: 'stabilityAI',
      label: 'Stability AI',
      icon: 'Image',
      color: 'bg-purple-600',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Stability AI image generation (Stable Diffusion)'
    },
  replicate: {
      type: 'replicate',
      label: 'Replicate',
      icon: 'Zap',
      color: 'bg-green-600',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Run ML models via Replicate API'
    },
  claudeVision: {
      type: 'claudeVision',
      label: 'Claude Vision',
      icon: 'Eye',
      color: 'bg-amber-700',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Anthropic Claude vision capabilities'
    },
  gpt4Vision: {
      type: 'gpt4Vision',
      label: 'GPT-4 Vision',
      icon: 'Camera',
      color: 'bg-gray-800',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'OpenAI GPT-4 Vision image understanding'
    },
  googleAI: {
      type: 'googleAI',
      label: 'Google AI (PaLM/Gemini)',
      icon: 'Brain',
      color: 'bg-blue-500',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Google AI models (PaLM, Gemini)'
    },
  ai21Labs: {
      type: 'ai21Labs',
      label: 'AI21 Labs',
      icon: 'MessageSquare',
      color: 'bg-indigo-600',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'AI21 Jurassic language models'
    },
  midjourney: {
      type: 'midjourney',
      label: 'Midjourney',
      icon: 'Palette',
      color: 'bg-pink-600',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Midjourney AI image generation'
    },
  dalle: {
      type: 'dalle',
      label: 'DALL-E',
      icon: 'Image',
      color: 'bg-green-700',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'OpenAI DALL-E image generation'
    },
  whisper: {
      type: 'whisper',
      label: 'Whisper AI',
      icon: 'Mic',
      color: 'bg-blue-700',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'OpenAI Whisper audio transcription'
    },
  elevenlabs: {
      type: 'elevenlabs',
      label: 'ElevenLabs',
      icon: 'Volume2',
      color: 'bg-purple-700',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'ElevenLabs text-to-speech'
    },
  azureOpenAI: {
      type: 'azureOpenAI',
      label: 'Azure OpenAI',
      icon: 'Brain',
      color: 'bg-blue-800',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Azure OpenAI Service (GPT-4, embeddings)'
    },
  googleGemini: {
      type: 'googleGemini',
      label: 'Google Gemini',
      icon: 'Sparkles',
      color: 'bg-blue-600',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Google Gemini multimodal AI'
    },
  anthropicClaude3: {
      type: 'anthropicClaude3',
      label: 'Claude 3',
      icon: 'Cpu',
      color: 'bg-orange-600',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Anthropic Claude 3 (Opus/Sonnet/Haiku)'
    },
  openaiEmbeddings: {
      type: 'openaiEmbeddings',
      label: 'OpenAI Embeddings',
      icon: 'Binary',
      color: 'bg-teal-600',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Generate text embeddings with OpenAI'
    },
  cohereEmbed: {
      type: 'cohereEmbed',
      label: 'Cohere Embeddings',
      icon: 'Binary',
      color: 'bg-purple-800',
      category: 'ai',
      inputs: 1,
      outputs: 1,
      description: 'Cohere text embeddings'
    },
  vectorstore: { type: 'vectorstore', label: 'Vector Store', icon: 'Brain', color: 'bg-purple-600', category: 'vectordb', inputs: 1, outputs: 1, description: 'Vector embeddings' },
    graphqldatabase: { type: 'graphqldatabase', label: 'GraphQL DB', icon: 'Share2', color: 'bg-pink-600', category: 'database', inputs: 1, outputs: 1, description: 'GraphQL database' },

  // n8n AI Core Nodes (2024-2025)
  aiTransform: {
    type: 'aiTransform',
    label: 'AI Transform',
    icon: 'Wand2',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Transform data using AI - extract, format, categorize, or enrich data with AI'
  },
  aiGuardrails: {
    type: 'aiGuardrails',
    label: 'AI Guardrails',
    icon: 'ShieldCheck',
    color: 'bg-red-600',
    category: 'ai',
    inputs: 1,
    outputs: 2,
    description: 'Apply safety checks and content filtering to AI outputs',
    errorHandle: true
  },
  mcpClient: {
    type: 'mcpClient',
    label: 'MCP Client',
    icon: 'Plug',
    color: 'bg-blue-700',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Connect to Model Context Protocol (MCP) servers for AI tools and resources'
  },
  mcpServerTrigger: {
    type: 'mcpServerTrigger',
    label: 'MCP Server Trigger',
    icon: 'Server',
    color: 'bg-indigo-700',
    category: 'trigger',
    inputs: 0,
    outputs: 1,
    description: 'Receive events from MCP protocol connections'
  },
  respondToChat: {
    type: 'respondToChat',
    label: 'Respond to Chat',
    icon: 'MessageSquareReply',
    color: 'bg-green-600',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Send AI-generated response back to chat interface'
  },
  aiTextClassifier: {
    type: 'aiTextClassifier',
    label: 'AI Text Classifier',
    icon: 'Tags',
    color: 'bg-amber-600',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Classify text into categories using AI'
  },
  aiSentimentAnalysis: {
    type: 'aiSentimentAnalysis',
    label: 'AI Sentiment Analysis',
    icon: 'Heart',
    color: 'bg-pink-500',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Analyze sentiment (positive/negative/neutral) of text'
  },
  aiEntityExtractor: {
    type: 'aiEntityExtractor',
    label: 'AI Entity Extractor',
    icon: 'Scan',
    color: 'bg-cyan-600',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Extract named entities (people, places, organizations) from text'
  },
  aiContentModerator: {
    type: 'aiContentModerator',
    label: 'AI Content Moderator',
    icon: 'AlertOctagon',
    color: 'bg-red-700',
    category: 'ai',
    inputs: 1,
    outputs: 2,
    description: 'Detect and filter inappropriate or harmful content'
  },
  aiCodeGenerator: {
    type: 'aiCodeGenerator',
    label: 'AI Code Generator',
    icon: 'Code2',
    color: 'bg-emerald-600',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Generate code from natural language descriptions'
  },
  aiDataExtractor: {
    type: 'aiDataExtractor',
    label: 'AI Data Extractor',
    icon: 'FileSearch',
    color: 'bg-violet-600',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Extract structured data from unstructured text using AI'
  },
  groq: {
    type: 'groq',
    label: 'Groq',
    icon: 'Zap',
    color: 'bg-orange-600',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Ultra-fast inference with Groq LPUs (Llama, Mixtral)'
  },
  ollama: {
    type: 'ollama',
    label: 'Ollama',
    icon: 'Server',
    color: 'bg-gray-600',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Run local LLMs with Ollama (Llama, Mistral, etc.)'
  },
  mistral: {
    type: 'mistral',
    label: 'Mistral AI',
    icon: 'Wind',
    color: 'bg-orange-500',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Mistral AI models (Mistral 7B, Mixtral)'
  },
  perplexity: {
    type: 'perplexity',
    label: 'Perplexity AI',
    icon: 'Search',
    color: 'bg-teal-500',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Perplexity AI search and chat models'
  },
  togetherAI: {
    type: 'togetherAI',
    label: 'Together AI',
    icon: 'Users',
    color: 'bg-blue-600',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Access open-source models via Together AI'
  },
  fireworksAI: {
    type: 'fireworksAI',
    label: 'Fireworks AI',
    icon: 'Sparkles',
    color: 'bg-orange-700',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Fast inference for open-source models'
  },
  anyscale: {
    type: 'anyscale',
    label: 'Anyscale',
    icon: 'Scale',
    color: 'bg-blue-800',
    category: 'ai',
    inputs: 1,
    outputs: 1,
    description: 'Scalable AI endpoints via Anyscale'
  }
};
