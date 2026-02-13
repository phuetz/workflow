/**
 * Lazy-loaded TensorFlow.js wrapper
 * Prevents TensorFlow from being included in the main bundle
 * Only loads when actually needed for predictions
 */

let tfInstance: typeof import('@tensorflow/tfjs') | null = null;
let loadingPromise: Promise<typeof import('@tensorflow/tfjs')> | null = null;

/**
 * Lazy load TensorFlow.js only when needed
 * Uses singleton pattern to avoid multiple loads
 */
export async function loadTensorFlow(): Promise<typeof import('@tensorflow/tfjs')> {
  // Return cached instance if already loaded
  if (tfInstance) {
    return tfInstance;
  }

  // Return existing loading promise if currently loading
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading TensorFlow
  loadingPromise = import('@tensorflow/tfjs').then(tf => {
    tfInstance = tf;
    loadingPromise = null;
    console.log('TensorFlow.js loaded successfully');
    return tf;
  }).catch(error => {
    loadingPromise = null;
    console.error('Failed to load TensorFlow.js:', error);
    throw error;
  });

  return loadingPromise;
}

/**
 * Check if TensorFlow is already loaded
 */
export function isTensorFlowLoaded(): boolean {
  return tfInstance !== null;
}

/**
 * Get TensorFlow instance (synchronous)
 * Throws if not loaded yet
 */
export function getTensorFlow(): typeof import('@tensorflow/tfjs') {
  if (!tfInstance) {
    throw new Error('TensorFlow.js not loaded yet. Call loadTensorFlow() first.');
  }
  return tfInstance;
}

/**
 * Unload TensorFlow to free memory
 */
export function unloadTensorFlow(): void {
  if (tfInstance) {
    // Dispose all tensors and models
    tfInstance.disposeVariables();
    tfInstance = null;
    console.log('TensorFlow.js unloaded');
  }
}
