import { EventEmitter } from 'events';

export interface VoiceCall {
  id: string;
  type: 'outbound' | 'inbound' | 'conference';
  participants: Array<{
    id: string;
    number: string;
    name?: string;
    role: 'caller' | 'callee' | 'participant';
    status: 'ringing' | 'connected' | 'onhold' | 'disconnected';
    joinedAt?: Date;
    leftAt?: Date;
    isMuted: boolean;
  }>;
  status: 'initiating' | 'ringing' | 'connected' | 'completed' | 'failed';
  direction: 'inbound' | 'outbound';
  startTime?: Date;
  answerTime?: Date;
  endTime?: Date;
  duration?: number;
  recording?: {
    enabled: boolean;
    url?: string;
    transcription?: string;
  };
  metadata: {
    provider: string;
    region: string;
    quality: 'low' | 'medium' | 'high';
    codec: string;
  };
  error?: string;
}

export interface VoiceProvider {
  name: string;
  type: 'twilio' | 'vonage' | 'aws-connect' | 'azure-communication' | 'custom';
  config: {
    apiKey?: string;
    apiSecret?: string;
    accountSid?: string;
    authToken?: string;
    region?: string;
    endpoint?: string;
  };
  capabilities: {
    outboundCalls: boolean;
    inboundCalls: boolean;
    conferences: boolean;
    recording: boolean;
    transcription: boolean;
    sms: boolean;
    numberPurchase: boolean;
  };
  phoneNumbers: Array<{
    number: string;
    country: string;
    type: 'local' | 'mobile' | 'tollfree';
    capabilities: string[];
    monthlyFee: number;
  }>;
  isActive: boolean;
}

export interface IVRFlow {
  id: string;
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    type: 'greeting' | 'menu' | 'input' | 'transfer' | 'voicemail' | 'hangup';
    config: {
      message?: string;
      voice?: 'male' | 'female' | 'alice' | 'custom';
      language?: string;
      options?: Array<{
        digit: string;
        action: string;
        nextNode?: string;
      }>;
      timeout?: number;
      maxAttempts?: number;
    };
    connections: Array<{
      condition: string;
      targetNode: string;
    }>;
  }>;
  entryNode: string;
  variables: { [key: string]: unknown };
  isActive: boolean;
}

export interface CallQueue {
  id: string;
  name: string;
  description: string;
  strategy: 'fifo' | 'lifo' | 'priority' | 'round-robin' | 'least-recent';
  agents: Array<{
    id: string;
    name: string;
    skills: string[];
    status: 'available' | 'busy' | 'offline' | 'break';
    currentCall?: string;
    statistics: {
      callsHandled: number;
      avgHandleTime: number;
      avgWrapTime: number;
    };
  }>;
  settings: {
    maxWaitTime: number;
    maxQueueSize: number;
    announcePosition: boolean;
    announceWaitTime: boolean;
    musicOnHold?: string;
    overflow?: {
      action: 'voicemail' | 'transfer' | 'callback';
      target?: string;
    };
  };
  metrics: {
    currentSize: number;
    avgWaitTime: number;
    longestWait: number;
    abandonRate: number;
    serviceLevel: number;
  };
  isActive: boolean;
}

export interface VoiceServiceConfig {
  providers: VoiceProvider[];
  defaultProvider: string;
  recording: {
    enabled: boolean;
    format: 'mp3' | 'wav' | 'ogg';
    quality: 'low' | 'medium' | 'high';
    storage: {
      provider: 'local' | 's3' | 'azure' | 'gcs';
      config: unknown;
      retention: number; // days
    };
  };
  transcription: {
    enabled: boolean;
    provider: 'aws' | 'google' | 'azure' | 'whisper';
    languages: string[];
    realtime: boolean;
  };
  analytics: {
    trackCalls: boolean;
    trackAgentPerformance: boolean;
    trackCustomerSatisfaction: boolean;
  };
  security: {
    encryption: boolean;
    masking: {
      enabled: boolean;
      patterns: string[];
    };
    compliance: {
      gdpr: boolean;
      hipaa: boolean;
      pci: boolean;
    };
  };
}

export class VoiceService extends EventEmitter {
  private config: VoiceServiceConfig;
  private providers: Map<string, VoiceProvider> = new Map();
  private activeCalls: Map<string, VoiceCall> = new Map();
  private ivrFlows: Map<string, IVRFlow> = new Map();
  private callQueues: Map<string, CallQueue> = new Map();
  private callHistory: Map<string, VoiceCall> = new Map();
  private isInitialized = false;

  constructor(config: VoiceServiceConfig) {
    super();
    this.config = config;
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize providers
      for (const provider of this.config.providers) {
        await this.initializeProvider(provider);
        this.providers.set(provider.name, provider);
      }

      // Set up webhooks for incoming calls
      await this.setupWebhooks();

      // Initialize call analytics
      this.initializeAnalytics();

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  public async makeCall(
    to: string,
    options: {
      from?: string;
      callerId?: string;
      provider?: string;
      record?: boolean;
      machineDetection?: boolean;
      timeout?: number;
      metadata?: { [key: string]: unknown };
    } = {}
  ): Promise<string> {
    const provider = this.getProvider(options.provider);
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const call: VoiceCall = {
      id: callId,
      type: 'outbound',
      participants: [
        {
          id: 'system',
          number: options.from || provider.phoneNumbers[0]?.number,
          role: 'caller',
          status: 'connected',
          isMuted: false
        },
        {
          id: `participant_${Date.now()}`,
          number: to,
          role: 'callee',
          status: 'ringing',
          isMuted: false
        }
      ],
      status: 'initiating',
      direction: 'outbound',
      recording: {
        enabled: options.record ?? this.config.recording.enabled
      },
      metadata: {
        provider: provider.name,
        region: provider.config.region || 'default',
        quality: 'high',
        codec: 'opus',
        ...options.metadata
      }
    };

    this.activeCalls.set(callId, call);
    this.emit('callInitiated', { call });

    try {
      // Initiate call with provider
      await this.initiateCallWithProvider(provider, call, options);
      
      call.status = 'ringing';
      call.startTime = new Date();
      
      this.emit('callRinging', { callId });
      
      // Simulate call connection
      setTimeout(() => {
        if (call.status === 'ringing') {
          this.handleCallAnswer(callId);
        }
      }, 3000);
      
      return callId;
    } catch (error) {
      call.status = 'failed';
      call.error = error.message;
      call.endTime = new Date();
      
      this.moveToHistory(callId);
      this.emit('error', { type: 'call', callId, error });
      throw error;
    }
  }

  public async endCall(callId: string): Promise<void> {
    const call = this.activeCalls.get(callId);
    if (!call) {
      throw new Error(`Call not found: ${callId}`);
    }

    call.status = 'completed';
    call.endTime = new Date();
    
    if (call.answerTime) {
      call.duration = Math.floor((call.endTime.getTime() - call.answerTime.getTime()) / 1000);
    }

    // Update participant statuses
    call.participants.forEach(p => {
      if (p.status === 'connected') {
        p.status = 'disconnected';
        p.leftAt = new Date();
      }
    });

    // Stop recording if active
    if (call.recording?.enabled) {
      await this.stopRecording(callId);
    }

    this.moveToHistory(callId);
    this.emit('callEnded', { callId, duration: call.duration });
  }

  public async transferCall(
    callId: string,
    to: string,
    options: {
      type?: 'blind' | 'attended' | 'conference';
      announcement?: string;
    } = {}
  ): Promise<void> {
    const call = this.activeCalls.get(callId);
    if (!call) {
      throw new Error(`Call not found: ${callId}`);
    }

    this.emit('callTransferStarted', { callId, to, type: options.type });

    try {
      if (options.type === 'conference') {
        // Convert to conference call
        call.type = 'conference';
        call.participants.push({
          id: `participant_${Date.now()}`,
          number: to,
          role: 'participant',
          status: 'ringing',
          isMuted: false
        });
      } else {
        // Perform transfer
        const callerIndex = call.participants.findIndex(p => p.role === 'caller');
        if (callerIndex >= 0) {
          call.participants[callerIndex] = {
            ...call.participants[callerIndex],
            number: to,
            status: 'ringing'
          };
        }
      }

      this.emit('callTransferred', { callId, to });
    } catch (error) {
      this.emit('error', { type: 'transfer', callId, error });
      throw error;
    }
  }

  public async holdCall(callId: string, hold: boolean = true): Promise<void> {
    const call = this.activeCalls.get(callId);
    if (!call) {
      throw new Error(`Call not found: ${callId}`);
    }

    const participant = call.participants.find(p => p.role === 'caller');
    if (participant) {
      participant.status = hold ? 'onhold' : 'connected';
    }

    this.emit('callHoldChanged', { callId, hold });
  }

  public async muteParticipant(callId: string, participantId: string, mute: boolean = true): Promise<void> {
    const call = this.activeCalls.get(callId);
    if (!call) {
      throw new Error(`Call not found: ${callId}`);
    }

    const participant = call.participants.find(p => p.id === participantId);
    if (!participant) {
      throw new Error(`Participant not found: ${participantId}`);
    }

    participant.isMuted = mute;
    this.emit('participantMuteChanged', { callId, participantId, muted: mute });
  }

  public async createIVRFlow(flowSpec: Omit<IVRFlow, 'id'>): Promise<string> {
    const id = `ivr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const flow: IVRFlow = {
      ...flowSpec,
      id
    };

    // Validate flow
    this.validateIVRFlow(flow);

    this.ivrFlows.set(id, flow);
    this.emit('ivrFlowCreated', { flow });
    
    return id;
  }

  public async createCallQueue(queueSpec: Omit<CallQueue, 'id' | 'metrics'>): Promise<string> {
    const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queue: CallQueue = {
      ...queueSpec,
      id,
      metrics: {
        currentSize: 0,
        avgWaitTime: 0,
        longestWait: 0,
        abandonRate: 0,
        serviceLevel: 100
      }
    };

    this.callQueues.set(id, queue);
    this.emit('callQueueCreated', { queue });
    
    return id;
  }

  public async addToQueue(callId: string, queueId: string): Promise<number> {
    const call = this.activeCalls.get(callId);
    if (!call) {
      throw new Error(`Call not found: ${callId}`);
    }

    const queue = this.callQueues.get(queueId);
    if (!queue) {
      throw new Error(`Queue not found: ${queueId}`);
    }

    // Add call to queue
    const position = queue.metrics.currentSize + 1;
    queue.metrics.currentSize++;

    this.emit('callQueued', { callId, queueId, position });

    // Try to assign to available agent
    this.assignCallToAgent(callId, queueId);

    return position;
  }

  public async setAgentStatus(
    queueId: string,
    agentId: string,
    status: 'available' | 'busy' | 'offline' | 'break'
  ): Promise<void> {
    const queue = this.callQueues.get(queueId);
    if (!queue) {
      throw new Error(`Queue not found: ${queueId}`);
    }

    const agent = queue.agents.find(a => a.id === agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const previousStatus = agent.status;
    agent.status = status;

    this.emit('agentStatusChanged', { queueId, agentId, status, previousStatus });

    // If agent became available, try to assign waiting calls
    if (status === 'available' && previousStatus !== 'available') {
      this.processQueuedCalls(queueId);
    }
  }

  public async startRecording(callId: string): Promise<void> {
    const call = this.activeCalls.get(callId);
    if (!call) {
      throw new Error(`Call not found: ${callId}`);
    }

    if (call.recording?.enabled) {
      return; // Already recording
    }

    call.recording = {
      enabled: true
    };

    this.emit('recordingStarted', { callId });
  }

  public async stopRecording(callId: string): Promise<string> {
    const call = this.activeCalls.get(callId) || this.callHistory.get(callId);
    if (!call) {
      throw new Error(`Call not found: ${callId}`);
    }

    if (!call.recording?.enabled) {
      throw new Error(`Call is not being recorded: ${callId}`);
    }

    // Mock recording URL
    const recordingUrl = `https://storage.example.com/recordings/${callId}.${this.config.recording.format}`;
    call.recording.url = recordingUrl;
    call.recording.enabled = false;

    this.emit('recordingStopped', { callId, url: recordingUrl });

    // Start transcription if enabled
    if (this.config.transcription.enabled) {
      this.transcribeRecording(callId, recordingUrl);
    }

    return recordingUrl;
  }

  public async getCallAnalytics(
    filter?: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
      direction?: string;
    }
  ): Promise<{
    totalCalls: number;
    avgDuration: number;
    successRate: number;
    peakHour: number;
    topDestinations: Array<{ number: string; count: number }>;
    costEstimate: number;
  }> {
    const calls = Array.from(this.callHistory.values()).filter(call => {
      if (filter?.startDate && call.startTime && call.startTime < filter.startDate) return false;
      if (filter?.endDate && call.startTime && call.startTime > filter.endDate) return false;
      if (filter?.status && call.status !== filter.status) return false;
      if (filter?.direction && call.direction !== filter.direction) return false;
      return true;
    });

    const analytics = {
      totalCalls: calls.length,
      avgDuration: calls.reduce((sum, c) => sum + (c.duration || 0), 0) / calls.length || 0,
      successRate: calls.filter(c => c.status === 'completed').length / calls.length || 0,
      peakHour: 14, // Mock peak hour
      topDestinations: this.getTopDestinations(calls),
      costEstimate: calls.length * 0.05 // Mock cost calculation
    };

    return analytics;
  }

  public getActiveCall(id: string): VoiceCall | undefined {
    return this.activeCalls.get(id);
  }

  public getActiveCalls(): VoiceCall[] {
    return Array.from(this.activeCalls.values());
  }

  public getCallHistory(): VoiceCall[] {
    return Array.from(this.callHistory.values());
  }

  public async shutdown(): Promise<void> {
    // End all active calls
    for (const callId of this.activeCalls.keys()) {
      await this.endCall(callId);
    }

    this.isInitialized = false;
    this.emit('shutdown');
  }

  private async initializeProvider(_provider: VoiceProvider): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Mock provider initialization
    // In real implementation would set up SDK/API clients
  }

  private async setupWebhooks(): Promise<void> {
    // Mock webhook setup
    // In real implementation would register webhook endpoints with providers
  }

  private initializeAnalytics(): void {
    // Mock analytics initialization
  }

  private getProvider(name?: string): VoiceProvider {
    const providerName = name || this.config.defaultProvider;
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }
    
    if (!provider.isActive) {
      throw new Error(`Provider is not active: ${providerName}`);
    }
    
    return provider;
  }

  private async initiateCallWithProvider(_provider: VoiceProvider, _call: VoiceCall, _options: unknown): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Mock provider call initiation
    // In real implementation would use provider SDK
  }

  private handleCallAnswer(callId: string): void {
    const call = this.activeCalls.get(callId);
    if (!call || call.status !== 'ringing') return;

    call.status = 'connected';
    call.answerTime = new Date();
    
    const callee = call.participants.find(p => p.role === 'callee');
    if (callee) {
      callee.status = 'connected';
      callee.joinedAt = new Date();
    }

    this.emit('callAnswered', { callId });
  }

  private moveToHistory(callId: string): void {
    const call = this.activeCalls.get(callId);
    if (call) {
      this.callHistory.set(callId, call);
      this.activeCalls.delete(callId);
    }
  }

  private validateIVRFlow(flow: IVRFlow): void {
    // Validate entry node exists
    if (!flow.nodes.find(n => n.id === flow.entryNode)) {
      throw new Error('Entry node not found in flow');
    }

    // Validate all connections
    for (const node of flow.nodes) {
      for (const connection of node.connections) {
        if (!flow.nodes.find(n => n.id === connection.targetNode)) {
          throw new Error(`Target node ${connection.targetNode} not found`);
        }
      }
    }
  }

  private assignCallToAgent(callId: string, queueId: string): void {
    const queue = this.callQueues.get(queueId);
    if (!queue) return;

    // Find available agent based on strategy
    const availableAgent = this.findAvailableAgent(queue);
    if (!availableAgent) return;

    // Assign call to agent
    availableAgent.status = 'busy';
    availableAgent.currentCall = callId;

    queue.metrics.currentSize--;
    
    this.emit('callAssigned', { callId, queueId, agentId: availableAgent.id });
  }

  private findAvailableAgent(queue: CallQueue): unknown {
    const availableAgents = queue.agents.filter(a => a.status === 'available');
    
    if (availableAgents.length === 0) return null;

    // Simple selection based on strategy
    switch (queue.strategy) {
      case 'round-robin':
      case 'fifo':
        return availableAgents[0];
      
      case 'least-recent':
        return availableAgents.sort((a, b) => 
          a.statistics.callsHandled - b.statistics.callsHandled
        )[0];
      
      default:
        return availableAgents[0];
    }
  }

  private processQueuedCalls(_queueId: string): void { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Mock processing queued calls
    // In real implementation would check for waiting calls and assign them
  }

  private async transcribeRecording(callId: string, _recordingUrl: string): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Mock transcription
    setTimeout(() => {
      const call = this.callHistory.get(callId);
      if (call && call.recording) {
        call.recording.transcription = 'Mock transcription of the call...';
        this.emit('transcriptionCompleted', { callId });
      }
    }, 5000);
  }

  private getTopDestinations(calls: VoiceCall[]): Array<{ number: string; count: number }> {
    const destinations = new Map<string, number>();
    
    for (const call of calls) {
      const callee = call.participants.find(p => p.role === 'callee');
      if (callee) {
        destinations.set(callee.number, (destinations.get(callee.number) || 0) + 1);
      }
    }

    return Array.from(destinations.entries())
      .map(([number, count]) => ({ number, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
}