/**
 * Machine Learning Pipeline
 * Comprehensive ML pipeline for workflow automation
 */

import * as tf from '@tensorflow/tfjs-node-gpu';
import * as ort from 'onnxruntime-node';
import { PythonShell } from 'python-shell';
import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface MLModel {
  id: string;
  name: string;
  type: 'tensorflow' | 'pytorch' | 'onnx' | 'sklearn' | 'custom';
  version: string;
  framework: string;
  task: string;
  inputShape?: number[];
  outputShape?: number[];
  metadata: {
    accuracy?: number;
    trainedOn?: string;
    parameters?: number;
    size?: number;
  };
}

export interface TrainingConfig {
  modelType: string;
  hyperparameters: {
    learningRate: number;
    batchSize: number;
    epochs: number;
    optimizer: string;
    lossFunction: string;
    metrics: string[];
    validationSplit?: number;
    earlyStopping?: {
      monitor: string;
      patience: number;
      minDelta: number;
    };
  };
  dataAugmentation?: {
    rotation?: number;
    zoom?: number;
    flip?: boolean;
    brightness?: number;
  };
}

export interface PredictionRequest {
  modelId: string;
  input: tf.Tensor | number[] | number[][] | Record<string, unknown>;
  preprocessing?: string[];
  postprocessing?: string[];
  options?: {
    batchSize?: number;
    threshold?: number;
    topK?: number;
  };
}

export class MLPipeline extends EventEmitter {
  private models: Map<string, tf.LayersModel | ort.InferenceSession> = new Map();
  private modelRegistry: Map<string, MLModel> = new Map();
  private preprocessors: Map<string, (data: unknown) => unknown> = new Map();
  private postprocessors: Map<string, (data: unknown) => unknown> = new Map();
  private activeTraining: Map<string, {
    config: TrainingConfig;
    progress: number;
    status: 'training' | 'paused' | 'completed' | 'failed';
    startTime: Date;
  }> = new Map();
  
  constructor() {
    super();
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    // Initialize TensorFlow backend
    await tf.ready();
    console.log(`TensorFlow.js backend: ${tf.getBackend()}`);
    
    // Register default preprocessors
    this.registerPreprocessor('normalize', this.normalizeData);
    this.registerPreprocessor('standardize', this.standardizeData);
    this.registerPreprocessor('resize', this.resizeImage);
    this.registerPreprocessor('tokenize', this.tokenizeText);
    
    // Register default postprocessors
    this.registerPostprocessor('argmax', this.argmax);
    this.registerPostprocessor('softmax', this.softmax);
    this.registerPostprocessor('threshold', this.threshold);
    this.registerPostprocessor('topk', this.topK);
  }
  
  // Model Management
  
  public async loadModel(modelPath: string, modelInfo: MLModel): Promise<void> {
    try {
      let model: tf.LayersModel | ort.InferenceSession;
      
      switch (modelInfo.type) {
        case 'tensorflow':
          model = await tf.loadLayersModel(modelPath);
          break;
          
        case 'onnx':
          model = await ort.InferenceSession.create(modelPath);
          break;
          
        case 'pytorch':
          // Load through Python bridge
          model = await this.loadPyTorchModel(modelPath);
          break;
          
        case 'sklearn':
          // Load through Python bridge
          model = await this.loadSklearnModel(modelPath);
          break;
          
        default:
          throw new Error(`Unsupported model type: ${modelInfo.type}`);
      }
      
      this.models.set(modelInfo.id, model);
      this.modelRegistry.set(modelInfo.id, modelInfo);
      
      this.emit('model:loaded', modelInfo);
      console.log(`Model loaded: ${modelInfo.name} (${modelInfo.id})`);
      
    } catch (error) {
      this.emit('model:error', { modelId: modelInfo.id, error });
      throw error;
    }
  }
  
  public async unloadModel(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }
    
    // Dispose model resources
    if (model.dispose) {
      model.dispose();
    }
    
    this.models.delete(modelId);
    this.modelRegistry.delete(modelId);
    
    this.emit('model:unloaded', modelId);
  }
  
  // Prediction
  
  public async predict(request: PredictionRequest): Promise<{
    predictions: tf.Tensor | number[] | Record<string, unknown>;
    confidence?: number[];
    processingTime: number;
    modelId: string;
  }> {
    const startTime = Date.now();
    const model = this.models.get(request.modelId);
    const modelInfo = this.modelRegistry.get(request.modelId);
    
    if (!model || !modelInfo) {
      throw new Error(`Model ${request.modelId} not found`);
    }
    
    try {
      // Preprocess input
      let processedInput = request.input;
      if (request.preprocessing) {
        for (const step of request.preprocessing) {
          const preprocessor = this.preprocessors.get(step);
          if (preprocessor) {
            processedInput = await preprocessor(processedInput);
          }
        }
      }
      
      // Run inference
      let output: tf.Tensor | Record<string, unknown>;
      switch (modelInfo.type) {
        case 'tensorflow':
          output = await this.predictTensorFlow(model, processedInput);
          break;
          
        case 'onnx':
          output = await this.predictONNX(model, processedInput);
          break;
          
        case 'pytorch':
        case 'sklearn':
          output = await this.predictPython(model, processedInput);
          break;
      }
      
      // Postprocess output
      if (request.postprocessing) {
        for (const step of request.postprocessing) {
          const postprocessor = this.postprocessors.get(step);
          if (postprocessor) {
            output = await postprocessor(output);
          }
        }
      }
      
      const inferenceTime = Date.now() - startTime;
      
      this.emit('prediction:complete', {
        modelId: request.modelId,
        inferenceTime,
        outputShape: Array.isArray(output) ? output.length : undefined
      });
      
      return {
        modelId: request.modelId,
        output,
        inferenceTime,
        timestamp: new Date()
      };
      
    } catch (error) {
      this.emit('prediction:error', { modelId: request.modelId, error });
      throw error;
    }
  }
  
  private async predictTensorFlow(model: tf.LayersModel, input: tf.Tensor | number[] | number[][]): Promise<tf.Tensor> {
    const inputTensor = tf.tensor(input);
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const output = await prediction.array();
    
    // Clean up tensors
    inputTensor.dispose();
    prediction.dispose();
    
    return output;
  }
  
  private async predictONNX(session: ort.InferenceSession, input: number[] | number[][]): Promise<ort.Tensor.DataType> {
    const feeds: Record<string, ort.Tensor> = {};
    
    // Get input names from model
    const inputNames = session.inputNames;
    feeds[inputNames[0]] = new ort.Tensor('float32', input.flat(), input.shape || [1, input.length]);
    
    const results = await session.run(feeds);
    const outputName = session.outputNames[0];
    
    return results[outputName].data;
  }
  
  private async predictPython(model: { scriptPath: string; modelPath: string }, input: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      PythonShell.run('predict.py', {
        mode: 'json',
        pythonPath: 'python3',
        args: [model.path, JSON.stringify(input)]
      }, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results[0]);
        }
      });
    });
  }
  
  // Training
  
  public async trainModel(
    datasetPath: string,
    config: TrainingConfig,
    callbacks?: {
      onEpochEnd?: (epoch: number, metrics: Record<string, number>) => void;
      onBatchEnd?: (batch: number, metrics: Record<string, number>) => void;
    }
  ): Promise<string> {
    const trainingId = `training_${Date.now()}`;
    
    try {
      this.emit('training:started', { trainingId, config });
      
      // Create model architecture
      const model = await this.createModel(config.modelType);
      
      // Compile model
      model.compile({
        optimizer: config.hyperparameters.optimizer,
        loss: config.hyperparameters.lossFunction,
        metrics: config.hyperparameters.metrics
      });
      
      // Load and prepare dataset
      const { training, validation } = await this.loadDataset(datasetPath, config);
      
      // Training callbacks
      const trainCallbacks: tf.CustomCallbackArgs = {
        onEpochEnd: async (epoch, logs) => {
          this.emit('training:epoch', { trainingId, epoch, metrics: logs });
          if (callbacks?.onEpochEnd) {
            callbacks.onEpochEnd(epoch, logs);
          }
        },
        onBatchEnd: async (batch, logs) => {
          if (callbacks?.onBatchEnd) {
            callbacks.onBatchEnd(batch, logs);
          }
        }
      };
      
      // Add early stopping if configured
      const callbackList = [trainCallbacks];
      if (config.hyperparameters.earlyStopping) {
        callbackList.push(tf.callbacks.earlyStopping(config.hyperparameters.earlyStopping));
      }
      
      // Train model
      const history = await model.fit(training.x, training.y, {
        batchSize: config.hyperparameters.batchSize,
        epochs: config.hyperparameters.epochs,
        validationData: validation ? [validation.x, validation.y] : undefined,
        callbacks: callbackList
      });
      
      // Save model
      const modelPath = path.join('models', trainingId);
      await model.save(`file://${modelPath}`);
      
      // Register trained model
      const modelInfo: MLModel = {
        id: trainingId,
        name: `Trained Model ${trainingId}`,
        type: 'tensorflow',
        version: '1.0.0',
        framework: 'tensorflow.js',
        task: config.modelType,
        metadata: {
          accuracy: history.history.acc?.[history.history.acc.length - 1],
          trainedOn: datasetPath,
          parameters: model.countParams()
        }
      };
      
      await this.loadModel(modelPath, modelInfo);
      
      this.emit('training:completed', {
        trainingId,
        modelPath,
        history: history.history,
        modelInfo
      });
      
      return trainingId;
      
    } catch (error) {
      this.emit('training:error', { trainingId, error });
      throw error;
    } finally {
      this.activeTraining.delete(trainingId);
    }
  }
  
  private async createModel(modelType: string): Promise<tf.LayersModel> {
    const model = tf.sequential();
    
    switch (modelType) {
      case 'classification':
        model.add(tf.layers.dense({ units: 128, activation: 'relu', inputShape: [10] }));
        model.add(tf.layers.dropout({ rate: 0.2 }));
        model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
        model.add(tf.layers.dropout({ rate: 0.2 }));
        model.add(tf.layers.dense({ units: 10, activation: 'softmax' }));
        break;
        
      case 'regression':
        model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [10] }));
        model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1 }));
        break;
        
      case 'timeseries':
        model.add(tf.layers.lstm({ units: 50, returnSequences: true, inputShape: [10, 1] }));
        model.add(tf.layers.lstm({ units: 50 }));
        model.add(tf.layers.dense({ units: 1 }));
        break;
        
      case 'autoencoder':
        // Encoder
        model.add(tf.layers.dense({ units: 128, activation: 'relu', inputShape: [784] }));
        model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
        // Decoder
        model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 784, activation: 'sigmoid' }));
        break;
        
      default:
        throw new Error(`Unknown model type: ${modelType}`);
    }
    
    return model;
  }
  
  // Model Optimization
  
  public async optimizeModel(modelId: string, optimization: {
    quantization?: boolean;
    pruning?: number;
    distillation?: string;
  }): Promise<string> {
    const model = this.models.get(modelId);
    const modelInfo = this.modelRegistry.get(modelId);
    
    if (!model || !modelInfo) {
      throw new Error(`Model ${modelId} not found`);
    }
    
    let optimizedModel = model;
    
    // Quantization
    if (optimization.quantization) {
      optimizedModel = await this.quantizeModel(model);
    }
    
    // Pruning
    if (optimization.pruning) {
      optimizedModel = await this.pruneModel(optimizedModel, optimization.pruning);
    }
    
    // Knowledge Distillation
    if (optimization.distillation) {
      const teacherModel = this.models.get(optimization.distillation);
      if (teacherModel) {
        optimizedModel = await this.distillModel(teacherModel, optimizedModel);
      }
    }
    
    // Save optimized model
    const optimizedId = `${modelId}_optimized`;
    const optimizedPath = path.join('models', optimizedId);
    await optimizedModel.save(`file://${optimizedPath}`);
    
    // Register optimized model
    const optimizedInfo: MLModel = {
      ...modelInfo,
      id: optimizedId,
      name: `${modelInfo.name} (Optimized)`,
      metadata: {
        ...modelInfo.metadata,
        optimizations: optimization
      }
    };
    
    await this.loadModel(optimizedPath, optimizedInfo);
    
    return optimizedId;
  }
  
  private async quantizeModel(model: tf.LayersModel): Promise<tf.LayersModel> {
    // Implement INT8 quantization
    const quantizedModel = await tf.quantization.quantize(model);
    return quantizedModel;
  }
  
  private async pruneModel(model: tf.LayersModel, sparsity: number): Promise<tf.LayersModel> {
    // Implement magnitude-based pruning
    const weights = model.getWeights();
    const prunedWeights = weights.map(weight => {
      const values = weight.arraySync() as number[];
      const threshold = this.getPercentile(values.flat(), sparsity);
      
      return tf.tensor(
        values.map(v => Math.abs(v) < threshold ? 0 : v),
        weight.shape
      );
    });
    
    model.setWeights(prunedWeights);
    return model;
  }
  
  private async distillModel(teacher: tf.LayersModel, student: tf.LayersModel): Promise<tf.LayersModel> {
    // Implement knowledge distillation
    // This is a simplified version
    return student;
  }
  
  // Explainability
  
  public async explainPrediction(modelId: string, input: tf.Tensor | number[] | number[][], method: 'lime' | 'shap' | 'gradcam' = 'lime'): Promise<{
    method: string;
    importance: number[];
    visualization?: string;
    explanations: Record<string, number>;
  }> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }
    
    switch (method) {
      case 'lime':
        return await this.explainWithLIME();
      case 'shap':
        return await this.explainWithSHAP();
      case 'gradcam':
        return await this.explainWithGradCAM();
      default:
        throw new Error(`Unknown explanation method: ${method}`);
    }
  }
  
  private async explainWithLIME(): Promise<{
    method: string;
    importance: number[];
    visualization?: string;
    explanations: Record<string, number>;
  }> {
    // Implement LIME (Local Interpretable Model-agnostic Explanations)
    return {
      method: 'lime',
      importance: [],
      visualization: null
    };
  }
  
  private async explainWithSHAP(): Promise<{
    method: string;
    importance: number[];
    visualization?: string;
    explanations: Record<string, number>;
  }> {
    // Implement SHAP (SHapley Additive exPlanations)
    return {
      method: 'shap',
      importance: [],
      explanations: {},
      visualization: 'shap_plot'
    };
  }
  
  private async explainWithGradCAM(): Promise<{
    method: string;
    importance: number[];
    visualization?: string;
    explanations: Record<string, number>;
  }> {
    // Implement Grad-CAM for CNNs
    return {
      method: 'gradcam',
      importance: [],
      explanations: { layerName: 1.0 },
      visualization: 'gradcam_heatmap'
    };
  }
  
  // Preprocessing functions
  
  private normalizeData(data: number[] | number[][]): number[] | number[][] {
    // Min-max normalization
    const flat = Array.isArray(data[0]) ? (data as number[][]).flat() : data as number[];
    const min = Math.min(...flat);
    const max = Math.max(...flat);
    
    if (Array.isArray(data[0])) {
      return (data as number[][]).map(row => row.map(v => (v - min) / (max - min)));
    } else {
      return (data as number[]).map(v => (v - min) / (max - min));
    }
  }
  
  private standardizeData(data: number[] | number[][]): number[] | number[][] {
    // Z-score standardization
    const flat = Array.isArray(data[0]) ? (data as number[][]).flat() : data as number[];
    const mean = flat.reduce((a, b) => a + b, 0) / flat.length;
    const std = Math.sqrt(flat.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / flat.length);
    
    if (Array.isArray(data[0])) {
      return (data as number[][]).map(row => row.map(v => (v - mean) / std));
    } else {
      return (data as number[]).map(v => (v - mean) / std);
    }
  }
  
  private resizeImage(data: tf.Tensor, modelInfo: MLModel): tf.Tensor {
    // Resize image to model input shape
    const inputShape = modelInfo.inputShape || [224, 224, 3];
    return tf.image.resizeBilinear(data, [inputShape[0], inputShape[1]]);
  }
  
  private tokenizeText(data: string): number[] {
    // Simple tokenization (would use proper tokenizer in production)
    return data.toLowerCase().split(' ').map(word => word.charCodeAt(0));
  }
  
  // Postprocessing functions
  
  private argmax(output: number[] | tf.Tensor): number {
    const arr = Array.isArray(output) ? output : (output as tf.Tensor).arraySync() as number[];
    return arr.indexOf(Math.max(...arr));
  }
  
  private softmax(output: number[] | tf.Tensor): number[] {
    const arr = Array.isArray(output) ? output : (output as tf.Tensor).arraySync() as number[];
    const max = Math.max(...arr);
    const exp = arr.map(v => Math.exp(v - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(v => v / sum);
  }
  
  private threshold(output: number[] | tf.Tensor, options?: { threshold?: number }): boolean[] {
    const thresholdValue = options?.threshold || 0.5;
    const arr = Array.isArray(output) ? output : (output as tf.Tensor).arraySync() as number[];
    return arr.map(v => v > thresholdValue);
  }
  
  private topK(output: number[] | tf.Tensor, options?: { topK?: number }): Array<{index: number, value: number}> {
    const k = options?.topK || 5;
    const arr = Array.isArray(output) ? output : (output as tf.Tensor).arraySync() as number[];
    
    return arr
      .map((value: number, index: number) => ({ index, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, k);
  }
  
  // Helper methods
  
  public registerPreprocessor(name: string, fn: (data: unknown, modelInfo?: MLModel) => unknown): void {
    this.preprocessors.set(name, fn);
  }
  
  public registerPostprocessor(name: string, fn: (data: unknown) => unknown): void {
    this.postprocessors.set(name, fn);
  }
  
  private async loadDataset(datasetPath: string, config: TrainingConfig): Promise<{
    training: { x: tf.Tensor; y: tf.Tensor };
    validation: { x: tf.Tensor; y: tf.Tensor };
  }> {
    // Load dataset (simplified)
    const data = await fs.readJSON(datasetPath);
    
    const splitIndex = Math.floor(data.x.length * (1 - (config.hyperparameters.validationSplit || 0.2)));
    
    return {
      training: {
        x: tf.tensor(data.x.slice(0, splitIndex)),
        y: tf.tensor(data.y.slice(0, splitIndex))
      },
      validation: {
        x: tf.tensor(data.x.slice(splitIndex)),
        y: tf.tensor(data.y.slice(splitIndex))
      }
    };
  }
  
  private async loadPyTorchModel(modelPath: string): Promise<{ type: string; path: string }> {
    // Load PyTorch model through Python bridge
    return { type: 'pytorch', path: modelPath };
  }
  
  private async loadSklearnModel(modelPath: string): Promise<{ type: string; path: string }> {
    // Load scikit-learn model through Python bridge
    return { type: 'sklearn', path: modelPath };
  }
  
  private getPercentile(arr: number[], percentile: number): number {
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile / 100) - 1;
    return sorted[index];
  }
  
  public getModelInfo(modelId: string): MLModel | undefined {
    return this.modelRegistry.get(modelId);
  }
  
  public listModels(): MLModel[] {
    return Array.from(this.modelRegistry.values());
  }
}