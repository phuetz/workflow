/**
 * Recommendation Engine
 * Advanced recommendation system using collaborative and content-based filtering
 */

import * as tf from '@tensorflow/tfjs-node';
import { EventEmitter } from 'events';

export interface User {
  id: string;
  features?: Record<string, unknown>;
  preferences?: Record<string, number>;
  history?: string[];
}

export interface Item {
  id: string;
  features: Record<string, unknown>;
  category?: string;
  tags?: string[];
  popularity?: number;
}

export interface Interaction {
  userId: string;
  itemId: string;
  rating?: number;
  timestamp: Date;
  type: 'view' | 'click' | 'purchase' | 'rating' | 'like';
}

export interface RecommendationRequest {
  userId: string;
  numRecommendations?: number;
  excludeItems?: string[];
  category?: string;
  diversityFactor?: number;
  method?: 'collaborative' | 'content' | 'hybrid' | 'popularity';
}

export class RecommendationEngine extends EventEmitter {
  private users: Map<string, User> = new Map();
  private items: Map<string, Item> = new Map();
  private interactions: Interaction[] = [];
  private userItemMatrix: unknown;
  private itemEmbeddings: Map<string, number[]> = new Map();
  private userEmbeddings: Map<string, number[]> = new Map();
  private model: tf.LayersModel | null = null;
  
  constructor() {
    super();
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    // Initialize recommendation model
    this.model = await this.buildRecommendationModel();
    console.log('Recommendation Engine initialized');
  }
  
  private async buildRecommendationModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          inputShape: [100] // Combined user and item features
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid'
        })
      ]
    });
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    return model;
  }
  
  // Data Management
  
  public async addUser(user: User): Promise<void> {
    this.users.set(user.id, user);
    await this.updateUserEmbedding(user.id);
    this.emit('user:added', user.id);
  }
  
  public async addItem(item: Item): Promise<void> {
    this.items.set(item.id, item);
    await this.updateItemEmbedding(item.id);
    this.emit('item:added', item.id);
  }
  
  public async recordInteraction(interaction: Interaction): Promise<void> {
    this.interactions.push(interaction);
    
    // Update user history
    const user = this.users.get(interaction.userId);
    if (user) {
      if (!user.history) user.history = [];
      user.history.push(interaction.itemId);
    }
    
    // Update matrices if needed
    if (this.interactions.length % 100 === 0) {
      await this.updateMatrices();
    }
    
    this.emit('interaction:recorded', interaction);
  }
  
  // Recommendation Methods
  
  public async recommend(request: RecommendationRequest): Promise<Array<{itemId: string, score: number}>> {
    const method = request.method || 'hybrid';
    let recommendations: Array<{itemId: string, score: number}> = [];
    
    switch (method) {
      case 'collaborative':
        recommendations = await this.collaborativeFiltering(request);
        break;
        
      case 'content':
        recommendations = await this.contentBasedFiltering(request);
        break;
        
      case 'hybrid':
        recommendations = await this.hybridRecommendation(request);
        break;
        
      case 'popularity':
        recommendations = await this.popularityBasedRecommendation(request);
        break;
    }
    
    // Apply diversity if requested
    if (request.diversityFactor && request.diversityFactor > 0) {
      recommendations = this.diversifyRecommendations(recommendations, request.diversityFactor);
    }
    
    // Filter out excluded items and already interacted items
    const user = this.users.get(request.userId);
    const excludeSet = new Set([
      ...(request.excludeItems || []),
      ...(user?.history || [])
    ]);
    
    recommendations = recommendations.filter(rec => !excludeSet.has(rec.itemId));
    
    // Limit to requested number
    const numRecs = request.numRecommendations || 10;
    recommendations = recommendations.slice(0, numRecs);
    
    this.emit('recommendations:generated', {
      userId: request.userId,
      count: recommendations.length,
      method
    });
    
    return recommendations;
  }
  
  // Collaborative Filtering
  
  private async collaborativeFiltering(request: RecommendationRequest): Promise<Array<{itemId: string, score: number}>> {
    const userId = request.userId;
    
    // Build or update user-item matrix
    if (!this.userItemMatrix) {
      await this.buildUserItemMatrix();
    }
    
    // Find similar users
    const similarUsers = await this.findSimilarUsers(userId, 50);
    
    // Get items liked by similar users
    const itemScores: Map<string, number> = new Map();
    
    for (const { userId: similarUserId, similarity } of similarUsers) {
      const userInteractions = this.interactions.filter(i => i.userId === similarUserId);
      
      for (const interaction of userInteractions) {
        const currentScore = itemScores.get(interaction.itemId) || 0;
        const weight = similarity * (interaction.rating || 1);
        itemScores.set(interaction.itemId, currentScore + weight);
      }
    }
    
    // Sort by score
    const recommendations = Array.from(itemScores.entries())
      .map(([itemId, score]) => ({ itemId, score }))
      .sort((a, b) => b.score - a.score);
    
    return recommendations;
  }
  
  // Content-Based Filtering
  
  private async contentBasedFiltering(request: RecommendationRequest): Promise<Array<{itemId: string, score: number}>> {
    const user = this.users.get(request.userId);
    if (!user || !user.history || user.history.length === 0) {
      // Fallback to popularity if no history
      return this.popularityBasedRecommendation(request);
    }
    
    // Get user profile from interaction history
    const userProfile = await this.buildUserProfile(request.userId);
    
    // Calculate similarity with all items
    const itemScores: Array<{itemId: string, score: number}> = [];
    
    for (const [itemId, item] of this.items) {
      if (request.category && item.category !== request.category) {
        continue;
      }
      
      const itemEmbedding = this.itemEmbeddings.get(itemId);
      if (!itemEmbedding) continue;
      
      const similarity = this.cosineSimilarity(userProfile, itemEmbedding);
      itemScores.push({ itemId, score: similarity });
    }
    
    // Sort by similarity
    itemScores.sort((a, b) => b.score - a.score);
    
    return itemScores;
  }
  
  // Hybrid Recommendation
  
  private async hybridRecommendation(request: RecommendationRequest): Promise<Array<{itemId: string, score: number}>> {
    // Combine collaborative and content-based approaches
    const [collaborative, contentBased] = await Promise.all([
      this.collaborativeFiltering(request),
      this.contentBasedFiltering(request)
    ]);
    
    // Merge scores with weights
    const collaborativeWeight = 0.6;
    const contentWeight = 0.4;
    
    const scoreMap: Map<string, number> = new Map();
    
    // Add collaborative scores
    for (const rec of collaborative) {
      scoreMap.set(rec.itemId, rec.score * collaborativeWeight);
    }
    
    // Add content-based scores
    for (const rec of contentBased) {
      const currentScore = scoreMap.get(rec.itemId) || 0;
      scoreMap.set(rec.itemId, currentScore + rec.score * contentWeight);
    }
    
    // Convert to array and sort
    const recommendations = Array.from(scoreMap.entries())
      .map(([itemId, score]) => ({ itemId, score }))
      .sort((a, b) => b.score - a.score);
    
    return recommendations;
  }
  
  // Popularity-Based Recommendation
  
  private async popularityBasedRecommendation(request: RecommendationRequest): Promise<Array<{itemId: string, score: number}>> {
    // Calculate item popularity scores
    const itemPopularity: Map<string, number> = new Map();
    
    for (const interaction of this.interactions) {
      const currentScore = itemPopularity.get(interaction.itemId) || 0;
      const weight = interaction.type === 'purchase' ? 5 : 
                    interaction.type === 'rating' ? interaction.rating || 1 :
                    interaction.type === 'like' ? 3 : 1;
      
      itemPopularity.set(interaction.itemId, currentScore + weight);
    }
    
    // Add time decay
    const now = new Date();
    for (const [itemId, item] of this.items) {
      const score = itemPopularity.get(itemId) || 0;
      const popularity = item.popularity || 1;
      
      // Recent interactions get higher weight
      const recentInteractions = this.interactions.filter(i => 
        i.itemId === itemId && 
        (now.getTime() - i.timestamp.getTime()) < 7 * 24 * 60 * 60 * 1000 // 7 days
      );
      
      const recencyBoost = recentInteractions.length * 2;
      itemPopularity.set(itemId, score * popularity + recencyBoost);
    }
    
    // Filter by category if specified
    let recommendations = Array.from(itemPopularity.entries())
      .map(([itemId, score]) => ({ itemId, score }));
    
    if (request.category) {
      recommendations = recommendations.filter(rec => {
        const item = this.items.get(rec.itemId);
        return item?.category === request.category;
      });
    }
    
    recommendations.sort((a, b) => b.score - a.score);
    
    return recommendations;
  }
  
  // Matrix Factorization
  
  private async buildUserItemMatrix(): Promise<void> {
    const userIds = Array.from(this.users.keys());
    const itemIds = Array.from(this.items.keys());
    
    // Create sparse matrix
    const matrix: number[][] = Array(userIds.length)
      .fill(null)
      .map(() => Array(itemIds.length).fill(0));
    
    // Fill matrix with interactions
    for (const interaction of this.interactions) {
      const userIndex = userIds.indexOf(interaction.userId);
      const itemIndex = itemIds.indexOf(interaction.itemId);
      
      if (userIndex !== -1 && itemIndex !== -1) {
        matrix[userIndex][itemIndex] = interaction.rating || 1;
      }
    }
    
    this.userItemMatrix = {
      matrix,
      userIds,
      itemIds
    };
    
    // Perform matrix factorization
    await this.factorizeMatrix();
  }
  
  private async factorizeMatrix(): Promise<void> {
    if (!this.userItemMatrix) return;
    
    const { matrix, userIds, itemIds } = this.userItemMatrix;
    const numFactors = 50;
    
    // Simple SVD using TensorFlow.js
    const matrixTensor = tf.tensor2d(matrix);
    const { u, s, v } = tf.linalg.svd(matrixTensor);
    
    // Keep top k factors
    const topK = Math.min(numFactors, s.shape[0]);
    const uReduced = u.slice([0, 0], [-1, topK]);
    const sReduced = s.slice([0], [topK]);
    const vReduced = v.slice([0, 0], [-1, topK]);
    
    // Update user embeddings
    const userEmbeddings = await uReduced.array();
    userIds.forEach((userId, i) => {
      this.userEmbeddings.set(userId, userEmbeddings[i]);
    });
    
    // Update item embeddings
    const itemEmbeddings = await vReduced.array();
    itemIds.forEach((itemId, i) => {
      this.itemEmbeddings.set(itemId, itemEmbeddings[i]);
    });
    
    // Clean up tensors
    matrixTensor.dispose();
    u.dispose();
    s.dispose();
    v.dispose();
    uReduced.dispose();
    sReduced.dispose();
    vReduced.dispose();
  }
  
  // User and Item Profiling
  
  private async buildUserProfile(userId: string): Promise<number[]> {
    const user = this.users.get(userId);
    if (!user || !user.history) {
      return Array(50).fill(0);
    }
    
    // Average embeddings of interacted items
    const embeddings: number[][] = [];
    
    for (const itemId of user.history) {
      const embedding = this.itemEmbeddings.get(itemId);
      if (embedding) {
        embeddings.embeddings.push(embedding);
      }
    }
    
    if (embeddings.length === 0) {
      return Array(50).fill(0);
    }
    
    // Calculate average
    const avgEmbedding = embeddings[0].map((_, i) => {
      const sum = embeddings.reduce((acc, emb) => acc + emb[i], 0);
      return sum / embeddings.length;
    });
    
    return avgEmbedding;
  }
  
  private async updateUserEmbedding(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;
    
    // Generate embedding from user features
    const features = this.extractUserFeatures(user);
    const embedding = await this.generateEmbedding(features);
    
    this.userEmbeddings.set(userId, embedding);
  }
  
  private async updateItemEmbedding(itemId: string): Promise<void> {
    const item = this.items.get(itemId);
    if (!item) return;
    
    // Generate embedding from item features
    const features = this.extractItemFeatures(item);
    const embedding = await this.generateEmbedding(features);
    
    this.itemEmbeddings.set(itemId, embedding);
  }
  
  private extractUserFeatures(user: User): number[] {
    const features: number[] = [];
    
    // Add user preferences
    if (user.preferences) {
      for (const [_key, value] of Object.entries(user.preferences)) { // eslint-disable-line @typescript-eslint/no-unused-vars
        features.push(value);
      }
    }
    
    // Add user features
    if (user.features) {
      for (const [_key, value] of Object.entries(user.features)) { // eslint-disable-line @typescript-eslint/no-unused-vars
        if (typeof value === 'number') {
          features.push(value);
        } else if (typeof value === 'boolean') {
          features.push(value ? 1 : 0);
        }
      }
    }
    
    // Pad or truncate to fixed size
    while (features.length < 50) features.push(0);
    return features.slice(0, 50);
  }
  
  private extractItemFeatures(item: Item): number[] {
    const features: number[] = [];
    
    // Add item features
    for (const [_key, value] of Object.entries(item.features)) { // eslint-disable-line @typescript-eslint/no-unused-vars
      if (typeof value === 'number') {
        features.push(value);
      } else if (typeof value === 'boolean') {
        features.push(value ? 1 : 0);
      }
    }
    
    // Add popularity
    features.push(item.popularity || 0);
    
    // Add tag features (one-hot encoding)
    const allTags = new Set<string>();
    for (const [_key, i] of this.items) { // eslint-disable-line @typescript-eslint/no-unused-vars
      if (i.tags) i.tags.forEach(tag => allTags.add(tag));
    }
    
    const tagArray = Array.from(allTags);
    for (const tag of tagArray.slice(0, 20)) {
      features.push(item.tags?.includes(tag) ? 1 : 0);
    }
    
    // Pad or truncate to fixed size
    while (features.length < 50) features.push(0);
    return features.slice(0, 50);
  }
  
  private async generateEmbedding(features: number[]): Promise<number[]> {
    if (!this.model) {
      return features;
    }
    
    const input = tf.tensor2d([features]);
    const embedding = this.model.predict(input) as tf.Tensor;
    const result = await embedding.array();
    
    input.dispose();
    embedding.dispose();
    
    return result[0];
  }
  
  // Similarity and Diversity
  
  private async findSimilarUsers(userId: string, k: number): Promise<Array<{userId: string, similarity: number}>> {
    const userEmbedding = this.userEmbeddings.get(userId);
    if (!userEmbedding) {
      return [];
    }
    
    const similarities: Array<{userId: string, similarity: number}> = [];
    
    for (const [otherUserId, otherEmbedding] of this.userEmbeddings) {
      if (otherUserId !== userId) {
        const similarity = this.cosineSimilarity(userEmbedding, otherEmbedding);
        similarities.push({ userId: otherUserId, similarity });
      }
    }
    
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, k);
  }
  
  private diversifyRecommendations(
    recommendations: Array<{itemId: string, score: number}>,
    diversityFactor: number
  ): Array<{itemId: string, score: number}> {
    const diverse: Array<{itemId: string, score: number}> = [];
    const selected: Set<string> = new Set();
    
    while (diverse.length < recommendations.length && recommendations.length > 0) {
      let bestIndex = -1;
      let bestScore = -Infinity;
      
      for (let i = 0; i < recommendations.length; i++) {
        if (selected.has(recommendations[i].itemId)) continue;
        
        let score = recommendations[i].score;
        
        // Apply diversity penalty
        if (diverse.length > 0) {
          const itemEmbedding = this.itemEmbeddings.get(recommendations[i].itemId);
          if (itemEmbedding) {
            let maxSimilarity = 0;
            
            for (const selected of diverse) {
              const selectedEmbedding = this.itemEmbeddings.get(selected.itemId);
              if (selectedEmbedding) {
                const similarity = this.cosineSimilarity(itemEmbedding, selectedEmbedding);
                maxSimilarity = Math.max(maxSimilarity, similarity);
              }
            }
            
            score *= (1 - diversityFactor * maxSimilarity);
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
        }
      }
      
      if (bestIndex !== -1) {
        diverse.push(recommendations[bestIndex]);
        selected.add(recommendations[bestIndex].itemId);
      } else {
        break;
      }
    }
    
    return diverse;
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    
    return dotProduct / (magnitudeA * magnitudeB);
  }
  
  // Training and Evaluation
  
  public async trainModel(epochs: number = 10): Promise<void> {
    if (!this.model) return;
    
    // Prepare training data
    const { inputs, labels } = await this.prepareTrainingData();
    
    // Train model
    await this.model.fit(inputs, labels, {
      epochs,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          this.emit('training:epoch', { epoch, logs });
        }
      }
    });
    
    // Clean up
    inputs.dispose();
    labels.dispose();
    
    this.emit('training:complete');
  }
  
  private async prepareTrainingData(): Promise<{inputs: tf.Tensor, labels: tf.Tensor}> {
    const inputs: number[][] = [];
    const labels: number[] = [];
    
    for (const interaction of this.interactions) {
      const userFeatures = this.extractUserFeatures(this.users.get(interaction.userId)!);
      const itemFeatures = this.extractItemFeatures(this.items.get(interaction.itemId)!);
      
      inputs.push([...userFeatures, ...itemFeatures]);
      labels.push(interaction.rating ? interaction.rating / 5 : 1);
    }
    
    return {
      inputs: tf.tensor2d(inputs),
      labels: tf.tensor1d(labels)
    };
  }
  
  // Metrics and Evaluation
  
  public async evaluateRecommendations(testInteractions: Interaction[]): Promise<unknown> {
    let hits = 0;
    let totalPredictions = 0;
    
    for (const interaction of testInteractions) {
      const recommendations = await this.recommend({
        userId: interaction.userId,
        numRecommendations: 10
      });
      
      const recommendedItems = recommendations.map(r => r.itemId);
      if (recommendedItems.includes(interaction.itemId)) {
        hits++;
      }
      totalPredictions++;
    }
    
    const hitRate = hits / totalPredictions;
    
    return {
      hitRate,
      hits,
      totalPredictions
    };
  }
  
  private async updateMatrices(): Promise<void> {
    await this.buildUserItemMatrix();
  }
}