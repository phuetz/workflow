import { EventEmitter } from 'events';

export interface PeerConnection {
  id: string;
  localPeerId: string;
  remotePeerId: string;
  roomId: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  streams: {
    local: MediaStream[];
    remote: MediaStream[];
  };
  stats: {
    bytesReceived: number;
    bytesSent: number;
    packetsLost: number;
    jitter: number;
    roundTripTime: number;
    audioLevel: number;
    videoFrameRate: number;
  };
  iceConnectionState: RTCIceConnectionState;
  signalingState: RTCSignalingState;
  createdAt: Date;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'candidate' | 'bye' | 'renegotiate';
  from: string;
  to: string;
  roomId: string;
  payload: unknown;
  timestamp: Date;
}

export interface MediaConstraints {
  video: boolean | {
    width?: { min?: number; ideal?: number; max?: number };
    height?: { min?: number; ideal?: number; max?: number };
    frameRate?: { min?: number; ideal?: number; max?: number };
    facingMode?: 'user' | 'environment';
    deviceId?: string;
  };
  audio: boolean | {
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
    deviceId?: string;
    sampleRate?: number;
    channelCount?: number;
  };
}

export interface NetworkQuality {
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'very-poor';
  audio: {
    bitrate: number;
    packetLoss: number;
    jitter: number;
  };
  video: {
    bitrate: number;
    packetLoss: number;
    frameRate: number;
    resolution: { width: number; height: number };
  };
  latency: number;
  score: number; // 0-100
}

export interface WebRTCManagerConfig {
  signalingServer: {
    url: string;
    protocol: 'ws' | 'wss';
    reconnectInterval: number;
    heartbeatInterval: number;
  };
  iceServers: RTCIceServer[];
  mediaConstraints: {
    default: MediaConstraints;
    screenshare: MediaConstraints;
  };
  codec: {
    video: {
      preferred: 'VP8' | 'VP9' | 'H264' | 'AV1';
      profile?: string;
      scalabilityMode?: string;
    };
    audio: {
      preferred: 'opus' | 'PCMU' | 'PCMA';
      bitrate?: number;
      channels?: number;
    };
  };
  simulcast: {
    enabled: boolean;
    encodings: Array<{
      rid: string;
      maxBitrate: number;
      scaleResolutionDownBy?: number;
    }>;
  };
  bandwidth: {
    video: { min: number; max: number };
    audio: { min: number; max: number };
  };
  statistics: {
    interval: number;
    detailed: boolean;
  };
  reconnection: {
    enabled: boolean;
    maxAttempts: number;
    backoffMultiplier: number;
  };
}

export class WebRTCManager extends EventEmitter {
  private config: WebRTCManagerConfig;
  private connections: Map<string, PeerConnection> = new Map();
  private localStreams: Map<string, MediaStream> = new Map();
  private signalingSocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private statsInterval: NodeJS.Timeout | null = null;
  private mediaDevices: Map<string, MediaDeviceInfo> = new Map();
  private isInitialized = false;

  constructor(config: WebRTCManagerConfig) {
    super();
    this.config = config;
  }

  public async initialize(): Promise<void> {
    try {
      // Connect to signaling server
      await this.connectSignaling();

      // Enumerate media devices
      await this.enumerateDevices();

      // Start statistics collection
      this.startStatsCollection();

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  public async createConnection(
    localPeerId: string,
    remotePeerId: string,
    roomId: string,
    isInitiator: boolean = true
  ): Promise<string> {
    const connectionId = `${localPeerId}_${remotePeerId}_${Date.now()}`;
    
    const pc = new RTCPeerConnection({
      iceServers: this.config.iceServers,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    const connection: PeerConnection = {
      id: connectionId,
      localPeerId,
      remotePeerId,
      roomId,
      connection: pc,
      streams: {
        local: [],
        remote: []
      },
      stats: {
        bytesReceived: 0,
        bytesSent: 0,
        packetsLost: 0,
        jitter: 0,
        roundTripTime: 0,
        audioLevel: 0,
        videoFrameRate: 0
      },
      iceConnectionState: pc.iceConnectionState,
      signalingState: pc.signalingState,
      createdAt: new Date()
    };

    // Set up event handlers
    this.setupConnectionHandlers(connection);

    // Create data channel
    if (isInitiator) {
      connection.dataChannel = pc.createDataChannel('data', {
        ordered: true,
        maxRetransmits: 3
      });
      this.setupDataChannelHandlers(connection.dataChannel, connectionId);
    }

    this.connections.set(connectionId, connection);
    this.emit('connectionCreated', { connectionId, localPeerId, remotePeerId });

    // Apply codec preferences
    await this.applyCodecPreferences(pc);

    // If initiator, create offer
    if (isInitiator) {
      await this.createOffer(connectionId);
    }

    return connectionId;
  }

  public async addStream(
    connectionId: string,
    stream: MediaStream,
    options: {
      simulcast?: boolean;
      replaceTrack?: string; // Track ID to replace
    } = {}
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    connection.streams.local.push(stream);

    for (const track of stream.getTracks()) {
      if (options.replaceTrack) {
        // Replace existing track
        const sender = connection.connection.getSenders().find(
          s => s.track?.id === options.replaceTrack
        );
        if (sender) {
          await sender.replaceTrack(track);
          continue;
        }
      }

      // Add new track
      const transceiver = connection.connection.addTransceiver(track, {
        direction: 'sendrecv',
        streams: [stream]
      });

      // Apply simulcast if enabled
      if (options.simulcast && track.kind === 'video' && this.config.simulcast.enabled) {
        const params = transceiver.sender.getParameters();
        params.encodings = this.config.simulcast.encodings;
        await transceiver.sender.setParameters(params);
      }
    }

    // Apply bandwidth constraints
    await this.applyBandwidthConstraints(connection.connection);

    this.emit('streamAdded', { connectionId, streamId: stream.id });
  }

  public async removeStream(connectionId: string, streamId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    const streamIndex = connection.streams.local.findIndex(s => s.id === streamId);
    if (streamIndex < 0) {
      throw new Error(`Stream not found: ${streamId}`);
    }

    const stream = connection.streams.local[streamIndex];
    
    // Remove tracks from peer connection
    for (const track of stream.getTracks()) {
      const sender = connection.connection.getSenders().find(s => s.track === track);
      if (sender) {
        connection.connection.removeTrack(sender);
      }
    }

    // Stop tracks
    stream.getTracks().forEach(track => track.stop());
    
    connection.streams.local.splice(streamIndex, 1);
    this.emit('streamRemoved', { connectionId, streamId });
  }

  public async getUserMedia(constraints: MediaConstraints = this.config.mediaConstraints.default): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints as MediaStreamConstraints);
      
      const streamId = stream.id;
      this.localStreams.set(streamId, stream);
      
      // Apply audio processing
      if (constraints.audio) {
        await this.applyAudioProcessing(stream);
      }

      // Apply video processing
      if (constraints.video) {
        await this.applyVideoProcessing(stream);
      }

      this.emit('localStreamCreated', { streamId, constraints });
      return stream;
    } catch (error) {
      this.emit('error', { type: 'getUserMedia', error });
      throw error;
    }
  }

  public async getDisplayMedia(constraints: MediaConstraints = this.config.mediaConstraints.screenshare): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: constraints.video as boolean | MediaTrackConstraints,
        audio: constraints.audio as boolean | MediaTrackConstraints
      });
      
      const streamId = stream.id;
      this.localStreams.set(streamId, stream);
      
      // Handle screen share ended
      stream.getVideoTracks()[0].onended = () => {
        this.localStreams.delete(streamId);
        this.emit('screenShareEnded', { streamId });
      };

      this.emit('screenShareStarted', { streamId });
      return stream;
    } catch (error) {
      this.emit('error', { type: 'getDisplayMedia', error });
      throw error;
    }
  }

  public async handleSignalingMessage(message: SignalingMessage): Promise<void> {
    const { type, from, to, roomId, payload } = message;

    switch (type) {
      case 'offer':
        await this.handleOffer(from, to, roomId, payload);
        break;
      
      case 'answer':
        await this.handleAnswer(from, to, payload);
        break;
      
      case 'candidate':
        await this.handleCandidate(from, to, payload);
        break;
      
      case 'bye':
        await this.handleBye(from, to);
        break;
      
      case 'renegotiate':
        await this.handleRenegotiate(from, to);
        break;
    }
  }

  public async getNetworkQuality(connectionId: string): Promise<NetworkQuality> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    const stats = await this.getConnectionStats(connection);
    
    // Calculate quality score
    const score = this.calculateQualityScore(stats);
    const level = this.getQualityLevel(score);

    return {
      level,
      audio: {
        bitrate: stats.audio?.bitrate || 0,
        packetLoss: stats.audio?.packetLoss || 0,
        jitter: stats.audio?.jitter || 0
      },
      video: {
        bitrate: stats.video?.bitrate || 0,
        packetLoss: stats.video?.packetLoss || 0,
        frameRate: stats.video?.frameRate || 0,
        resolution: stats.video?.resolution || { width: 0, height: 0 }
      },
      latency: stats.roundTripTime || 0,
      score
    };
  }

  public async updateBandwidth(
    connectionId: string,
    bandwidth: { video?: number; audio?: number }
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    const senders = connection.connection.getSenders();
    
    for (const sender of senders) {
      if (!sender.track) continue;
      
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }

      if (sender.track.kind === 'video' && bandwidth.video !== undefined) {
        params.encodings[0].maxBitrate = bandwidth.video;
      } else if (sender.track.kind === 'audio' && bandwidth.audio !== undefined) {
        params.encodings[0].maxBitrate = bandwidth.audio;
      }

      await sender.setParameters(params);
    }

    this.emit('bandwidthUpdated', { connectionId, bandwidth });
  }

  public async toggleTrack(
    connectionId: string,
    trackKind: 'audio' | 'video',
    enabled: boolean
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    for (const stream of connection.streams.local) {
      const tracks = trackKind === 'audio' ? stream.getAudioTracks() : stream.getVideoTracks();
      tracks.forEach(track => {
        track.enabled = enabled;
      });
    }

    this.emit('trackToggled', { connectionId, trackKind, enabled });
  }

  public async closeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    // Close data channel
    if (connection.dataChannel) {
      connection.dataChannel.close();
    }

    // Close peer connection
    connection.connection.close();

    // Stop local streams
    for (const stream of connection.streams.local) {
      stream.getTracks().forEach(track => track.stop());
    }

    this.connections.delete(connectionId);
    
    // Send bye message
    this.sendSignalingMessage({
      type: 'bye',
      from: connection.localPeerId,
      to: connection.remotePeerId,
      roomId: connection.roomId,
      payload: null,
      timestamp: new Date()
    });

    this.emit('connectionClosed', { connectionId });
  }

  public getMediaDevices(): MediaDeviceInfo[] {
    return Array.from(this.mediaDevices.values());
  }

  public getConnection(id: string): PeerConnection | undefined {
    return this.connections.get(id);
  }

  public getConnections(): PeerConnection[] {
    return Array.from(this.connections.values());
  }

  public async shutdown(): Promise<void> {
    // Close all connections
    for (const connectionId of this.connections.keys()) {
      await this.closeConnection(connectionId);
    }

    // Stop all local streams
    for (const stream of this.localStreams.values()) {
      stream.getTracks().forEach(track => track.stop());
    }
    this.localStreams.clear();

    // Close signaling connection
    if (this.signalingSocket) {
      this.signalingSocket.close();
      this.signalingSocket = null;
    }

    // Stop stats collection
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    this.isInitialized = false;
    this.emit('shutdown');
  }

  private async connectSignaling(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { url, protocol } = this.config.signalingServer;
      this.signalingSocket = new WebSocket(`${protocol}://${url}`);

      this.signalingSocket.onopen = () => {
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        resolve();
      };

      this.signalingSocket.onerror = (error) => {
        reject(error);
      };

      this.signalingSocket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          await this.handleSignalingMessage(message);
        } catch (error) {
          this.emit('error', { type: 'signaling', error });
        }
      };

      this.signalingSocket.onclose = () => {
        if (this.config.reconnection.enabled && this.reconnectAttempts < this.config.reconnection.maxAttempts) {
          this.reconnectSignaling();
        }
      };
    });
  }

  private reconnectSignaling(): void {
    this.reconnectAttempts++;
    const delay = this.config.signalingServer.reconnectInterval * 
      Math.pow(this.config.reconnection.backoffMultiplier, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      this.connectSignaling().catch(() => {
        // Error handled in connectSignaling
      });
    }, delay);
  }

  private startHeartbeat(): void {
    setInterval(() => {
      if (this.signalingSocket?.readyState === WebSocket.OPEN) {
        this.signalingSocket.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.config.signalingServer.heartbeatInterval);
  }

  private sendSignalingMessage(message: SignalingMessage): void {
    if (this.signalingSocket?.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify(message));
    }
  }

  private async enumerateDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      this.mediaDevices.clear();
      devices.forEach(device => {
        this.mediaDevices.set(device.deviceId, device);
      });

      this.emit('devicesEnumerated', { devices });
    } catch (error) {
      this.emit('error', { type: 'enumerateDevices', error });
    }
  }

  private setupConnectionHandlers(connection: PeerConnection): void {
    const pc = connection.connection;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'candidate',
          from: connection.localPeerId,
          to: connection.remotePeerId,
          roomId: connection.roomId,
          payload: event.candidate,
          timestamp: new Date()
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      connection.iceConnectionState = pc.iceConnectionState;
      this.emit('iceConnectionStateChange', { 
        connectionId: connection.id, 
        state: pc.iceConnectionState 
      });

      if (pc.iceConnectionState === 'failed') {
        this.handleConnectionFailure(connection);
      }
    };

    pc.onsignalingstatechange = () => {
      connection.signalingState = pc.signalingState;
      this.emit('signalingStateChange', { 
        connectionId: connection.id, 
        state: pc.signalingState 
      });
    };

    pc.ontrack = (event) => {
      connection.streams.remote.push(...event.streams);
      this.emit('remoteTrackAdded', { 
        connectionId: connection.id, 
        track: event.track,
        streams: event.streams 
      });
    };

    pc.ondatachannel = (event) => {
      connection.dataChannel = event.channel;
      this.setupDataChannelHandlers(event.channel, connection.id);
    };
  }

  private setupDataChannelHandlers(channel: RTCDataChannel, connectionId: string): void {
    channel.onopen = () => {
      this.emit('dataChannelOpen', { connectionId });
    };

    channel.onmessage = (event) => {
      this.emit('dataChannelMessage', { connectionId, data: event.data });
    };

    channel.onerror = (error) => {
      this.emit('error', { type: 'dataChannel', connectionId, error });
    };

    channel.onclose = () => {
      this.emit('dataChannelClosed', { connectionId });
    };
  }

  private async createOffer(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const offer = await connection.connection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await connection.connection.setLocalDescription(offer);

      this.sendSignalingMessage({
        type: 'offer',
        from: connection.localPeerId,
        to: connection.remotePeerId,
        roomId: connection.roomId,
        payload: offer,
        timestamp: new Date()
      });
    } catch (error) {
      this.emit('error', { type: 'createOffer', connectionId, error });
    }
  }

  private async handleOffer(from: string, to: string, roomId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    // Find existing connection or create new one
    let connection = Array.from(this.connections.values()).find(
      c => c.localPeerId === to && c.remotePeerId === from
    );

    if (!connection) {
      const connectionId = await this.createConnection(to, from, roomId, false);
      connection = this.connections.get(connectionId);
    }

    if (!connection) return;

    try {
      await connection.connection.setRemoteDescription(offer);
      
      const answer = await connection.connection.createAnswer();
      await connection.connection.setLocalDescription(answer);

      this.sendSignalingMessage({
        type: 'answer',
        from: to,
        to: from,
        roomId,
        payload: answer,
        timestamp: new Date()
      });
    } catch (error) {
      this.emit('error', { type: 'handleOffer', error });
    }
  }

  private async handleAnswer(from: string, to: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const connection = Array.from(this.connections.values()).find(
      c => c.localPeerId === to && c.remotePeerId === from
    );

    if (!connection) return;

    try {
      await connection.connection.setRemoteDescription(answer);
    } catch (error) {
      this.emit('error', { type: 'handleAnswer', error });
    }
  }

  private async handleCandidate(from: string, to: string, candidate: RTCIceCandidateInit): Promise<void> {
    const connection = Array.from(this.connections.values()).find(
      c => c.localPeerId === to && c.remotePeerId === from
    );

    if (!connection) return;

    try {
      await connection.connection.addIceCandidate(candidate);
    } catch (error) {
      this.emit('error', { type: 'handleCandidate', error });
    }
  }

  private async handleBye(from: string, to: string): Promise<void> {
    const connection = Array.from(this.connections.values()).find(
      c => c.localPeerId === to && c.remotePeerId === from
    );

    if (connection) {
      await this.closeConnection(connection.id);
    }
  }

  private async handleRenegotiate(from: string, to: string): Promise<void> {
    const connection = Array.from(this.connections.values()).find(
      c => c.localPeerId === to && c.remotePeerId === from
    );

    if (connection) {
      await this.createOffer(connection.id);
    }
  }

  private async applyCodecPreferences(pc: RTCPeerConnection): Promise<void> {
    const transceivers = pc.getTransceivers();
    
    for (const transceiver of transceivers) {
      const kind = transceiver.sender.track?.kind;
      if (!kind) continue;

      const codecs = RTCRtpSender.getCapabilities(kind)?.codecs || [];
      const preferredCodec = kind === 'video' ? 
        this.config.codec.video.preferred : 
        this.config.codec.audio.preferred;

      const preferred = codecs.filter(codec => 
        codec.mimeType.toLowerCase().includes(preferredCodec.toLowerCase())
      );
      
      const others = codecs.filter(codec => 
        !codec.mimeType.toLowerCase().includes(preferredCodec.toLowerCase())
      );

      transceiver.setCodecPreferences([...preferred, ...others]);
    }
  }

  private async applyBandwidthConstraints(pc: RTCPeerConnection): Promise<void> {
    const senders = pc.getSenders();
    
    for (const sender of senders) {
      if (!sender.track) continue;
      
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }

      const bandwidth = sender.track.kind === 'video' ? 
        this.config.bandwidth.video : 
        this.config.bandwidth.audio;

      params.encodings[0].maxBitrate = bandwidth.max;
      params.encodings[0].minBitrate = bandwidth.min;

      await sender.setParameters(params);
    }
  }

  private async applyAudioProcessing(_stream: MediaStream): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // In a real implementation, would apply audio processing
    // like echo cancellation, noise suppression, etc.
  }

  private async applyVideoProcessing(_stream: MediaStream): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // In a real implementation, would apply video processing
    // like virtual backgrounds, beautification, etc.
  }

  private startStatsCollection(): void {
    this.statsInterval = setInterval(() => {
      for (const connection of this.connections.values()) {
        this.collectConnectionStats(connection);
      }
    }, this.config.statistics.interval);
  }

  private async collectConnectionStats(connection: PeerConnection): Promise<void> {
    try {
      const stats = await connection.connection.getStats();
      
      stats.forEach(stat => {
        if (stat.type === 'inbound-rtp') {
          connection.stats.bytesReceived = stat.bytesReceived || 0;
          connection.stats.packetsLost = stat.packetsLost || 0;
          connection.stats.jitter = stat.jitter || 0;
          
          if (stat.kind === 'video') {
            connection.stats.videoFrameRate = stat.framesPerSecond || 0;
          }
        } else if (stat.type === 'outbound-rtp') {
          connection.stats.bytesSent = stat.bytesSent || 0;
        } else if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
          connection.stats.roundTripTime = stat.currentRoundTripTime || 0;
        }
      });

      this.emit('statsUpdated', { connectionId: connection.id, stats: connection.stats });
    } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Ignore stats collection errors
    }
  }

  private async getConnectionStats(connection: PeerConnection): Promise<unknown> {
    const stats = await connection.connection.getStats();
    const result: unknown = {};

    stats.forEach(stat => {
      if (stat.type === 'inbound-rtp') {
        const mediaType = stat.kind || stat.mediaType;
        result[mediaType] = {
          bitrate: this.calculateBitrate(stat),
          packetLoss: this.calculatePacketLoss(stat),
          jitter: stat.jitter,
          ...(mediaType === 'video' && {
            frameRate: stat.framesPerSecond,
            resolution: {
              width: stat.frameWidth,
              height: stat.frameHeight
            }
          })
        };
      } else if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
        result.roundTripTime = stat.currentRoundTripTime;
      }
    });

    return result;
  }

  private calculateBitrate(stat: unknown): number {
    // Simple bitrate calculation - in real implementation would track over time
    return stat.bytesReceived ? stat.bytesReceived * 8 / 1000 : 0;
  }

  private calculatePacketLoss(stat: unknown): number {
    const totalPackets = (stat.packetsReceived || 0) + (stat.packetsLost || 0);
    return totalPackets > 0 ? (stat.packetsLost || 0) / totalPackets : 0;
  }

  private calculateQualityScore(stats: unknown): number {
    let score = 100;

    // Deduct for packet loss
    if (stats.video?.packetLoss > 0.01) score -= 10;
    if (stats.video?.packetLoss > 0.05) score -= 20;
    if (stats.audio?.packetLoss > 0.02) score -= 15;

    // Deduct for low frame rate
    if (stats.video?.frameRate < 24) score -= 10;
    if (stats.video?.frameRate < 15) score -= 20;

    // Deduct for high latency
    if (stats.roundTripTime > 150) score -= 10;
    if (stats.roundTripTime > 300) score -= 20;

    // Deduct for low bitrate
    if (stats.video?.bitrate < 500) score -= 15;
    if (stats.audio?.bitrate < 32) score -= 10;

    return Math.max(0, score);
  }

  private getQualityLevel(score: number): NetworkQuality['level'] {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 25) return 'poor';
    return 'very-poor';
  }

  private handleConnectionFailure(connection: PeerConnection): void {
    this.emit('connectionFailed', { connectionId: connection.id });
    
    // Attempt to restart ICE
    if (this.config.reconnection.enabled) {
      this.restartIce(connection);
    }
  }

  private async restartIce(connection: PeerConnection): Promise<void> {
    try {
      const offer = await connection.connection.createOffer({ iceRestart: true });
      await connection.connection.setLocalDescription(offer);

      this.sendSignalingMessage({
        type: 'offer',
        from: connection.localPeerId,
        to: connection.remotePeerId,
        roomId: connection.roomId,
        payload: offer,
        timestamp: new Date()
      });

      this.emit('iceRestarted', { connectionId: connection.id });
    } catch (error) {
      this.emit('error', { type: 'iceRestart', connectionId: connection.id, error });
    }
  }
}