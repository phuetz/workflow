/* eslint-disable @typescript-eslint/no-unused-vars */

import { EventEmitter } from 'events';

export interface QuantumCircuit {
  id: string;
  name: string;
  description: string;
  qubits: number;
  depth: number;
  gates: Array<{
    type: 'X' | 'Y' | 'Z' | 'H' | 'CNOT' | 'RX' | 'RY' | 'RZ' | 'T' | 'S' | 'SWAP' | 'CZ' | 'U' | 'custom';
    targets: number[];
    controls?: number[];
    parameters?: number[];
    angle?: number;
    customMatrix?: number[][];
  }>;
  measurements: Array<{
    qubit: number;
    classicalBit: number;
  }>;
  metadata: {
    creator: string;
    algorithm: string;
    purpose: string;
    complexity: 'low' | 'medium' | 'high' | 'exponential';
    tags: string[];
  };
  optimization: {
    level: 'none' | 'basic' | 'advanced' | 'aggressive';
    preserveStructure: boolean;
    targetBackend?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface QuantumJob {
  id: string;
  circuitId: string;
  name: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  backend: {
    type: 'simulator' | 'quantum' | 'hybrid';
    provider: 'ibm' | 'google' | 'amazon' | 'rigetti' | 'local';
    device: string;
    capabilities: {
      qubits: number;
      connectivity: string;
      gateSet: string[];
      errorRate: number;
      coherenceTime: number;
    };
  };
  execution: {
    shots: number;
    maxRuntime?: number;
    errorMitigation: boolean;
    noiseModel?: string;
    calibration?: {
      enabled: boolean;
      frequency: 'before-job' | 'periodic' | 'adaptive';
    };
  };
  results?: {
    counts: { [state: string]: number };
    probability: { [state: string]: number };
    statevector?: number[][];
    unitary?: number[][];
    fidelity?: number;
    executionTime: number;
    quantumTime: number;
    gateErrors: number[];
    readoutErrors: number[];
  };
  cost: {
    estimated: number;
    actual?: number;
    currency: string;
    breakdown: {
      computation: number;
      queue: number;
      calibration: number;
    };
  };
  timeline: {
    submitted: Date;
    queued: Date;
    started?: Date;
    completed?: Date;
    cancelled?: Date;
  };
  submittedBy: string;
  errorMessage?: string;
}

export interface QuantumAlgorithm {
  id: string;
  name: string;
  category: 'optimization' | 'simulation' | 'ml' | 'cryptography' | 'search' | 'factoring' | 'custom';
  description: string;
  parameters: Array<{
    name: string;
    type: 'number' | 'array' | 'string' | 'boolean' | 'complex';
    required: boolean;
    default?: unknown;
    constraints?: {
      min?: number;
      max?: number;
      length?: number;
      pattern?: string;
    };
    description: string;
  }>;
  implementation: {
    circuitGenerator: string; // Function code or reference
    classical: string; // Classical preprocessing/postprocessing
    hybrid: boolean;
    variational: boolean;
  };
  complexity: {
    quantum: string; // Big O notation
    classical: string;
    space: string;
    depth: string;
  };
  advantages: {
    classical: string;
    conditions: string[];
    limitations: string[];
  };
  applications: string[];
  references: Array<{
    title: string;
    authors: string[];
    journal?: string;
    arxiv?: string;
    doi?: string;
    year: number;
  }>;
  examples: Array<{
    name: string;
    description: string;
    parameters: unknown;
    expectedOutput: string;
  }>;
  createdAt: Date;
  createdBy: string;
}

export interface QuantumSimulation {
  id: string;
  name: string;
  type: 'molecular' | 'material' | 'financial' | 'optimization' | 'physics' | 'chemistry' | 'custom';
  problem: {
    description: string;
    hamiltonian?: {
      terms: Array<{
        coefficient: number;
        pauliString: string;
        qubits: number[];
      }>;
      eigenvalues?: number[];
      groundState?: number[];
    };
    variables: Array<{
      name: string;
      type: string;
      range: [number, number];
      encoding: string;
    }>;
    constraints: Array<{
      type: 'equality' | 'inequality';
      expression: string;
      penalty?: number;
    }>;
    objective: {
      type: 'minimize' | 'maximize';
      function: string;
    };
  };
  algorithm: {
    name: string;
    variant?: string;
    parameters: unknown;
    ansatz?: {
      type: string;
      depth: number;
      entanglement: string;
    };
    optimizer: {
      type: 'cobyla' | 'bfgs' | 'nelder-mead' | 'spsa' | 'adam' | 'quantum-natural-gradient';
      maxIterations: number;
      tolerance: number;
      learningRate?: number;
    };
  };
  resources: {
    qubits: number;
    gates: number;
    depth: number;
    shots: number;
    runtime: number; // estimated minutes
  };
  results?: {
    energy?: number;
    groundState?: number[];
    convergence: Array<{
      iteration: number;
      energy: number;
      gradient: number;
      parameters: number[];
    }>;
    fidelity?: number;
    success: boolean;
    errorBars?: number[];
  };
  validation?: {
    classicalBenchmark?: number;
    exactSolution?: number;
    literature?: number;
    errorAnalysis: string;
  };
  status: 'draft' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface QuantumProcessorConfig {
  backends: {
    simulators: Array<{
      name: string;
      type: 'statevector' | 'qasm' | 'unitary' | 'stabilizer' | 'matrix-product-state';
      maxQubits: number;
      noiseModel?: boolean;
      gpu: boolean;
      distributed: boolean;
    }>;
    quantum: Array<{
      provider: string;
      credentials: unknown;
      devices: string[];
      queuePriority: number;
      costTracking: boolean;
    }>;
  };
  optimization: {
    enabled: boolean;
    transpiler: {
      optimization_level: 0 | 1 | 2 | 3;
      basis_gates: string[];
      coupling_map?: number[][];
      backend_properties?: unknown;
    };
    errorMitigation: {
      readout: boolean;
      zne: boolean; // Zero-noise extrapolation
      cdr: boolean; // Clifford data regression
      symmetryVerification: boolean;
    };
  };
  monitoring: {
    performance: boolean;
    errors: boolean;
    costs: boolean;
    utilization: boolean;
    alerts: Array<{
      condition: string;
      threshold: unknown;
      action: string;
    }>;
  };
  security: {
    encryption: {
      circuits: boolean;
      results: boolean;
      algorithm: string;
    };
    access: {
      rbac: boolean;
      quantumSafe: boolean;
      auditLog: boolean;
    };
  };
  limits: {
    maxQubits: number;
    maxDepth: number;
    maxShots: number;
    maxJobs: number;
    timeoutMinutes: number;
    costLimit: number;
  };
}

export class QuantumProcessor extends EventEmitter {
  private config: QuantumProcessorConfig;
  private circuits: Map<string, QuantumCircuit> = new Map();
  private jobs: Map<string, QuantumJob> = new Map();
  private algorithms: Map<string, QuantumAlgorithm> = new Map();
  private simulations: Map<string, QuantumSimulation> = new Map();
  private backends: Map<string, unknown> = new Map();
  private jobQueue: string[] = [];
  private activeJobs: Set<string> = new Set();
  private metrics: Map<string, unknown> = new Map();
  private isInitialized = false;

  constructor(config: QuantumProcessorConfig) {
    super();
    this.config = config;
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize simulators
      await this.initializeSimulators();

      // Initialize quantum backends
      await this.initializeQuantumBackends();

      // Load quantum algorithms
      await this.loadQuantumAlgorithms();

      // Start job processor
      this.startJobProcessor();

      // Initialize monitoring
      if (this.config.monitoring.performance) {
        this.startMonitoring();
      }

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  public async createCircuit(
    circuitSpec: Omit<QuantumCircuit, 'id' | 'createdAt' | 'updatedAt'>,
    creatorId: string
  ): Promise<string> {
    const circuitId = `circuit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const circuit: QuantumCircuit = {
      ...circuitSpec,
      id: circuitId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate circuit
    this.validateCircuit(circuit);

    // Optimize circuit if requested
    if (circuit.optimization.level !== 'none') {
      circuit.gates = await this.optimizeCircuit(circuit);
      circuit.depth = this.calculateCircuitDepth(circuit.gates);
    }

    this.circuits.set(circuitId, circuit);
    this.emit('circuitCreated', { circuit });
    
    return circuitId;
  }

  public async submitJob(
    jobSpec: Omit<QuantumJob, 'id' | 'status' | 'results' | 'timeline'>,
    submitterId: string
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: QuantumJob = {
      ...jobSpec,
      id: jobId,
      status: 'queued',
      timeline: {
        submitted: new Date(),
        queued: new Date()
      },
      submittedBy: submitterId
    };

    // Validate job
    await this.validateJob(job);

    // Estimate cost
    job.cost.estimated = await this.estimateJobCost(job);

    this.jobs.set(jobId, job);

    // Add to queue based on priority
    this.addJobToQueue(jobId);

    this.emit('jobSubmitted', { job });
    return jobId;
  }

  public async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const circuit = this.circuits.get(job.circuitId);
    if (!circuit) {
      throw new Error(`Circuit not found: ${job.circuitId}`);
    }

    try {
      job.status = 'running';
      job.timeline.started = new Date();
      this.activeJobs.add(jobId);

      this.emit('jobStarted', { jobId });

      // Select backend
      const backend = await this.selectBackend(job);
      
      // Execute circuit
      const results = await this.executeCircuit(circuit, job, backend);
      
      // Apply error mitigation if enabled
      if (job.execution.errorMitigation) {
        results.counts = await this.applyErrorMitigation(results.counts, job, backend);
      }

      // Calculate final metrics
      results.fidelity = await this.calculateFidelity(results, circuit);
      
      job.results = results;
      job.status = 'completed';
      job.timeline.completed = new Date();
      job.cost.actual = await this.calculateActualCost(job, results);

      this.activeJobs.delete(jobId);
      this.emit('jobCompleted', { jobId, results });

    } catch (error) {
      job.status = 'failed';
      job.errorMessage = error.message;
      job.timeline.completed = new Date();
      this.activeJobs.delete(jobId);
      this.emit('jobFailed', { jobId, error });
      throw error;
    }
  }

  public async runAlgorithm(
    algorithmId: string,
    parameters: unknown,
    backend?: {
      type: 'simulator' | 'quantum';
      device?: string;
    }
  ): Promise<{
    circuitId: string;
    jobId: string;
    results?: unknown;
  }> {
    const algorithm = this.algorithms.get(algorithmId);
    if (!algorithm) {
      throw new Error(`Algorithm not found: ${algorithmId}`);
    }

    // Validate parameters
    this.validateAlgorithmParameters(algorithm, parameters);

    // Generate circuit
    const circuit = await this.generateAlgorithmCircuit(algorithm, parameters);
    const circuitId = await this.createCircuit(circuit, 'algorithm-runner');

    // Create and submit job
    const jobSpec: Omit<QuantumJob, 'id' | 'status' | 'results' | 'timeline'> = {
      circuitId,
      name: `${algorithm.name} execution`,
      priority: 'normal',
      backend: backend || {
        type: 'simulator',
        provider: 'local',
        device: 'qasm_simulator',
        capabilities: {
          qubits: circuit.qubits,
          connectivity: 'all-to-all',
          gateSet: ['u', 'cx'],
          errorRate: 0,
          coherenceTime: Infinity
        }
      },
      execution: {
        shots: parameters.shots || 1024,
        errorMitigation: algorithm.implementation.variational
      },
      cost: { estimated: 0, currency: 'USD', breakdown: { computation: 0, queue: 0, calibration: 0 } },
      submittedBy: 'algorithm-runner'
    };

    const jobId = await this.submitJob(jobSpec, 'algorithm-runner');

    // Execute if using simulator
    if (backend?.type !== 'quantum') {
      await this.executeJob(jobId);
      const job = this.jobs.get(jobId);
      return { circuitId, jobId, results: job?.results };
    }

    return { circuitId, jobId };
  }

  public async createSimulation(
    simulationSpec: Omit<QuantumSimulation, 'id' | 'status' | 'results' | 'createdAt' | 'updatedAt'>,
    creatorId: string
  ): Promise<string> {
    const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const simulation: QuantumSimulation = {
      ...simulationSpec,
      id: simulationId,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: creatorId
    };

    // Validate simulation
    this.validateSimulation(simulation);

    // Estimate resources
    simulation.resources = await this.estimateSimulationResources(simulation);

    this.simulations.set(simulationId, simulation);
    this.emit('simulationCreated', { simulation });
    
    return simulationId;
  }

  public async runSimulation(simulationId: string): Promise<void> {
    const simulation = this.simulations.get(simulationId);
    if (!simulation) {
      throw new Error(`Simulation not found: ${simulationId}`);
    }

    try {
      simulation.status = 'running';
      simulation.updatedAt = new Date();

      // Build quantum circuit for simulation
      const circuit = await this.buildSimulationCircuit(simulation);
      const circuitId = await this.createCircuit(circuit, simulation.createdBy);

      // Run variational algorithm if applicable
      if (simulation.algorithm.name.includes('VQE') || simulation.algorithm.name.includes('QAOA')) {
        const results = await this.runVariationalSimulation(simulation, circuitId);
        simulation.results = results;
      } else {
        // Run direct simulation
        const jobId = await this.submitJob({
          circuitId,
          name: `Simulation: ${simulation.name}`,
          priority: 'normal',
          backend: {
            type: 'simulator',
            provider: 'local',
            device: 'statevector_simulator',
            capabilities: {
              qubits: simulation.resources.qubits,
              connectivity: 'all-to-all',
              gateSet: ['u', 'cx', 'rz'],
              errorRate: 0,
              coherenceTime: Infinity
            }
          },
          execution: {
            shots: simulation.resources.shots,
            errorMitigation: false
          },
          cost: { estimated: 0, currency: 'USD', breakdown: { computation: 0, queue: 0, calibration: 0 } },
          submittedBy: simulation.createdBy
        }, simulation.createdBy);

        await this.executeJob(jobId);
        const job = this.jobs.get(jobId);
        simulation.results = this.processSimulationResults(job?.results, simulation);
      }

      // Validate results
      if (simulation.validation) {
        await this.validateSimulationResults(simulation);
      }

      simulation.status = 'completed';
      simulation.updatedAt = new Date();

      this.emit('simulationCompleted', { simulationId, results: simulation.results });

    } catch (error) {
      simulation.status = 'failed';
      simulation.updatedAt = new Date();
      this.emit('simulationFailed', { simulationId, error });
      throw error;
    }
  }

  public async optimizeCircuit(circuit: QuantumCircuit): Promise<QuantumCircuit['gates']> {
    const gates = [...circuit.gates];
    
    switch (circuit.optimization.level) {
      case 'basic':
        return this.applyBasicOptimizations(gates);
      case 'advanced':
        return this.applyAdvancedOptimizations(gates);
      case 'aggressive':
        return this.applyAggressiveOptimizations(gates);
      default:
        return gates;
    }
  }

  public async getQuantumMetrics(period: {
    start: Date;
    end: Date;
  }): Promise<{
    jobs: {
      total: number;
      completed: number;
      failed: number;
      averageWaitTime: number;
      averageExecutionTime: number;
    };
    resources: {
      qubitHours: number;
      gateOperations: number;
      circuitsExecuted: number;
    };
    costs: {
      total: number;
      byProvider: { [provider: string]: number };
      byBackend: { [backend: string]: number };
    };
    algorithms: {
      mostUsed: string[];
      successRate: { [algorithm: string]: number };
    };
    backends: {
      utilization: { [backend: string]: number };
      availability: { [backend: string]: number };
      averageQueueTime: { [backend: string]: number };
    };
  }> {
    const jobs = Array.from(this.jobs.values()).filter(job =>
      job.timeline.submitted >= period.start && job.timeline.submitted <= period.end
    );

    const completedJobs = jobs.filter(job => job.status === 'completed');
    const failedJobs = jobs.filter(job => job.status === 'failed');

    const averageWaitTime = completedJobs.length > 0 ?
      completedJobs.reduce((sum, job) => {
        const wait = job.timeline.started ? 
          job.timeline.started.getTime() - job.timeline.queued.getTime() : 0;
        return sum + wait;
      }, 0) / completedJobs.length / 1000 / 60 : 0; // minutes

    const averageExecutionTime = completedJobs.length > 0 ?
      completedJobs.reduce((sum, job) => sum + (job.results?.executionTime || 0), 0) / completedJobs.length : 0;

    return {
      jobs: {
        total: jobs.length,
        completed: completedJobs.length,
        failed: failedJobs.length,
        averageWaitTime,
        averageExecutionTime
      },
      resources: {
        qubitHours: this.calculateQubitHours(completedJobs),
        gateOperations: this.calculateGateOperations(completedJobs),
        circuitsExecuted: completedJobs.length
      },
      costs: {
        total: completedJobs.reduce((sum, job) => sum + (job.cost.actual || 0), 0),
        byProvider: this.groupCostsByProvider(completedJobs),
        byBackend: this.groupCostsByBackend(completedJobs)
      },
      algorithms: {
        mostUsed: this.getMostUsedAlgorithms(jobs),
        successRate: this.calculateAlgorithmSuccessRates(jobs)
      },
      backends: {
        utilization: this.calculateBackendUtilization(jobs),
        availability: this.calculateBackendAvailability(),
        averageQueueTime: this.calculateAverageQueueTimes(jobs)
      }
    };
  }

  public getCircuit(id: string): QuantumCircuit | undefined {
    return this.circuits.get(id);
  }

  public getJob(id: string): QuantumJob | undefined {
    return this.jobs.get(id);
  }

  public getAlgorithm(id: string): QuantumAlgorithm | undefined {
    return this.algorithms.get(id);
  }

  public getSimulation(id: string): QuantumSimulation | undefined {
    return this.simulations.get(id);
  }

  public getJobs(filters?: {
    status?: QuantumJob['status'];
    backend?: string;
    submitter?: string;
  }): QuantumJob[] {
    let jobs = Array.from(this.jobs.values());

    if (filters?.status) {
      jobs = jobs.filter(job => job.status === filters.status);
    }

    if (filters?.backend) {
      jobs = jobs.filter(job => job.backend.device === filters.backend);
    }

    if (filters?.submitter) {
      jobs = jobs.filter(job => job.submittedBy === filters.submitter);
    }

    return jobs.sort((a, b) => b.timeline.submitted.getTime() - a.timeline.submitted.getTime());
  }

  public async shutdown(): Promise<void> {
    // Cancel active jobs
    for (const jobId of this.activeJobs) {
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'cancelled';
        job.timeline.cancelled = new Date();
      }
    }

    // Cleanup backends
    for (const backend of this.backends.values()) {
      if (backend.cleanup) {
        await backend.cleanup();
      }
    }

    this.isInitialized = false;
    this.emit('shutdown');
  }

  private async initializeSimulators(): Promise<void> {
    for (const sim of this.config.backends.simulators) {
      const backend = {
        name: sim.name,
        type: sim.type,
        maxQubits: sim.maxQubits,
        execute: async (circuit: QuantumCircuit, shots: number) => {
          return this.executeOnSimulator(circuit, shots, sim);
        },
        cleanup: async () => {}
      };
      
      this.backends.set(sim.name, backend);
    }
  }

  private async initializeQuantumBackends(): Promise<void> {
    for (const provider of this.config.backends.quantum) {
      // Mock quantum backend initialization
      for (const device of provider.devices) {
        const backend = {
          name: device,
          provider: provider.provider,
          type: 'quantum',
          execute: async (circuit: QuantumCircuit, shots: number) => {
            return this.executeOnQuantumDevice(circuit, shots, device);
          },
          getStatus: async () => ({ available: true, queue: Math.floor(Math.random() * 10) }),
          cleanup: async () => {}
        };
        
        this.backends.set(device, backend);
      }
    }
  }

  private async loadQuantumAlgorithms(): Promise<void> {
    const defaultAlgorithms = [
      {
        name: 'Quantum Fourier Transform',
        category: 'search' as const,
        description: 'Quantum implementation of the discrete Fourier transform',
        parameters: [
          {
            name: 'n_qubits',
            type: 'number' as const,
            required: true,
            constraints: { min: 1, max: 20 },
            description: 'Number of qubits for the QFT'
          }
        ],
        implementation: {
          circuitGenerator: 'generateQFTCircuit',
          classical: 'processQFTResults',
          hybrid: false,
          variational: false
        },
        complexity: {
          quantum: 'O(n²)',
          classical: 'O(n log n)',
          space: 'O(n)',
          depth: 'O(n²)'
        },
        advantages: {
          classical: 'Exponential speedup for certain applications',
          conditions: ['Input can be efficiently prepared', 'Output can be efficiently measured'],
          limitations: ['Requires coherent quantum system', 'Limited by decoherence']
        },
        applications: ['Shor\'s algorithm', 'Period finding', 'Phase estimation'],
        references: [],
        examples: []
      },
      {
        name: 'Variational Quantum Eigensolver',
        category: 'simulation' as const,
        description: 'Hybrid quantum-classical algorithm for finding ground state energies',
        parameters: [
          {
            name: 'hamiltonian',
            type: 'array' as const,
            required: true,
            description: 'Hamiltonian terms as Pauli strings'
          },
          {
            name: 'ansatz_depth',
            type: 'number' as const,
            required: false,
            default: 3,
            constraints: { min: 1, max: 10 },
            description: 'Depth of the variational ansatz'
          }
        ],
        implementation: {
          circuitGenerator: 'generateVQECircuit',
          classical: 'optimizeVQEParameters',
          hybrid: true,
          variational: true
        },
        complexity: {
          quantum: 'O(poly(n))',
          classical: 'O(poly(n))',
          space: 'O(n)',
          depth: 'O(d)'
        },
        advantages: {
          classical: 'Exponential reduction in space complexity',
          conditions: ['Good initial parameter guess', 'Efficient ansatz'],
          limitations: ['Local minima in optimization', 'Barren plateaus']
        },
        applications: ['Quantum chemistry', 'Materials science', 'Optimization'],
        references: [],
        examples: []
      }
    ];

    for (const alg of defaultAlgorithms) {
      const algId = `alg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.algorithms.set(algId, {
        ...alg,
        id: algId,
        createdAt: new Date(),
        createdBy: 'system'
      });
    }
  }

  private startJobProcessor(): void {
    setInterval(() => {
      this.processJobQueue();
    }, 5000); // Process queue every 5 seconds
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.collectMetrics();
    }, 60000); // Collect metrics every minute
  }

  private validateCircuit(circuit: QuantumCircuit): void {
    if (circuit.qubits <= 0 || circuit.qubits > this.config.limits.maxQubits) {
      throw new Error(`Invalid number of qubits: ${circuit.qubits}`);
    }

    if (circuit.depth > this.config.limits.maxDepth) {
      throw new Error(`Circuit depth exceeds limit: ${circuit.depth}`);
    }

    // Validate gates
    for (const gate of circuit.gates) {
      if (gate.targets.some(t => t >= circuit.qubits)) {
        throw new Error('Gate target exceeds circuit qubits');
      }
      
      if (gate.controls && gate.controls.some(c => c >= circuit.qubits)) {
        throw new Error('Gate control exceeds circuit qubits');
      }
    }
  }

  private async validateJob(job: QuantumJob): Promise<void> {
    const circuit = this.circuits.get(job.circuitId);
    if (!circuit) {
      throw new Error(`Circuit not found: ${job.circuitId}`);
    }

    if (job.execution.shots > this.config.limits.maxShots) {
      throw new Error(`Shots exceed limit: ${job.execution.shots}`);
    }

    // Validate backend compatibility
    if (circuit.qubits > job.backend.capabilities.qubits) {
      throw new Error('Circuit requires more qubits than backend provides');
    }
  }

  private addJobToQueue(jobId: string): void {
    const job = this.jobs.get(jobId)!;
    
    // Insert based on priority
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const insertIndex = this.jobQueue.findIndex(queuedJobId => {
      const queuedJob = this.jobs.get(queuedJobId)!;
      return priorityOrder[job.priority] < priorityOrder[queuedJob.priority];
    });

    if (insertIndex === -1) {
      this.jobQueue.push(jobId);
    } else {
      this.jobQueue.splice(insertIndex, 0, jobId);
    }
  }

  private async processJobQueue(): Promise<void> {
    if (this.jobQueue.length === 0 || this.activeJobs.size >= this.config.limits.maxJobs) {
      return;
    }

    const jobId = this.jobQueue.shift()!;
    const job = this.jobs.get(jobId);
    
    if (job && job.status === 'queued') {
      try {
        await this.executeJob(jobId);
      } catch (error) {
        this.emit('jobProcessingError', { jobId, error });
      }
    }
  }

  private async selectBackend(job: QuantumJob): Promise<unknown> {
    if (job.backend.type === 'simulator') {
      return this.backends.get(job.backend.device) || this.backends.values().next().value;
    }

    // For quantum backends, check availability
    const backend = this.backends.get(job.backend.device);
    if (backend) {
      const status = await backend.getStatus();
      if (status.available) {
        return backend;
      }
    }

    throw new Error(`Backend not available: ${job.backend.device}`);
  }

  private async executeCircuit(
    circuit: QuantumCircuit,
    job: QuantumJob,
    backend: unknown
  ): Promise<QuantumJob['results']> {
    const startTime = Date.now();
    
    // Execute on backend
    const rawResults = await backend.execute(circuit, job.execution.shots);
    
    const executionTime = Date.now() - startTime;
    
    return {
      counts: rawResults.counts,
      probability: this.countsToProb(rawResults.counts, job.execution.shots),
      statevector: rawResults.statevector,
      unitary: rawResults.unitary,
      executionTime,
      quantumTime: rawResults.quantumTime || executionTime,
      gateErrors: rawResults.gateErrors || [],
      readoutErrors: rawResults.readoutErrors || []
    };
  }

  private async executeOnSimulator(
    circuit: QuantumCircuit,
    shots: number,
    simulator: unknown
  ): Promise<unknown> {
    // Mock simulator execution
    const counts: { [state: string]: number } = {};
    const numStates = Math.pow(2, circuit.qubits);
    
    // Generate random results for demonstration
    for (let i = 0; i < shots; i++) {
      const state = Math.floor(Math.random() * numStates).toString(2).padStart(circuit.qubits, '0');
      counts[state] = (counts[state] || 0) + 1;
    }

    return {
      counts,
      quantumTime: Math.random() * 1000, // milliseconds
      gateErrors: new Array(circuit.gates.length).fill(0),
      readoutErrors: new Array(circuit.qubits).fill(Math.random() * 0.01)
    };
  }

  private async executeOnQuantumDevice(
    circuit: QuantumCircuit,
    shots: number,
    device: string
  ): Promise<unknown> {
    // Mock quantum device execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 5000)); // Simulate queue time
    
    const counts: { [state: string]: number } = {};
    const numStates = Math.pow(2, circuit.qubits);
    
    // Add some noise to simulate real quantum device
    for (let i = 0; i < shots; i++) {
      let state = Math.floor(Math.random() * numStates);
      
      // Add bit-flip errors
      if (Math.random() < 0.05) { // 5% error rate
        const bitToFlip = Math.floor(Math.random() * circuit.qubits);
        state ^= (1 << bitToFlip);
      }
      
      const stateStr = state.toString(2).padStart(circuit.qubits, '0');
      counts[stateStr] = (counts[stateStr] || 0) + 1;
    }

    return {
      counts,
      quantumTime: Math.random() * 10000, // milliseconds
      gateErrors: new Array(circuit.gates.length).fill(Math.random() * 0.02),
      readoutErrors: new Array(circuit.qubits).fill(Math.random() * 0.05)
    };
  }

  private countsToProb(counts: { [state: string]: number }, shots: number): { [state: string]: number } {
    const prob: { [state: string]: number } = {};
    for (const [state, count] of Object.entries(counts)) {
      prob[state] = count / shots;
    }
    return prob;
  }

  private async applyErrorMitigation(
    counts: { [state: string]: number },
    job: QuantumJob,
    backend: unknown
  ): Promise<{ [state: string]: number }> {
    // Mock error mitigation
    if (this.config.optimization.errorMitigation.readout) {
      // Apply readout error mitigation
      return this.mitigateReadoutErrors(counts);
    }
    
    return counts;
  }

  private mitigateReadoutErrors(counts: { [state: string]: number }): { [state: string]: number } {
    // Simple readout error mitigation
    const mitigated: { [state: string]: number } = {};
    
    for (const [state, count] of Object.entries(counts)) {
      // Apply correction factor
      const correctionFactor = 1.05; // Mock correction
      mitigated[state] = Math.round(count * correctionFactor);
    }
    
    return mitigated;
  }

  private async calculateFidelity(results: unknown, circuit: QuantumCircuit): Promise<number> {
    // Mock fidelity calculation
    return 0.95 + Math.random() * 0.05; // 95-100% fidelity
  }

  private async estimateJobCost(job: QuantumJob): Promise<number> {
    const circuit = this.circuits.get(job.circuitId)!;
    
    let baseCost = 0;
    
    if (job.backend.type === 'quantum') {
      // Quantum device costs
      baseCost = circuit.qubits * 0.001 + // Per qubit
                 circuit.depth * 0.0001 + // Per gate layer
                 job.execution.shots * 0.00001; // Per shot
    } else {
      // Simulator costs (much lower)
      baseCost = circuit.qubits * 0.00001 +
                 job.execution.shots * 0.000001;
    }
    
    return baseCost;
  }

  private async calculateActualCost(job: QuantumJob, results: unknown): Promise<number> {
    // Actual cost might differ from estimate
    return job.cost.estimated * (0.8 + Math.random() * 0.4); // ±20% variation
  }

  private validateAlgorithmParameters(algorithm: QuantumAlgorithm, parameters: unknown): void {
    for (const param of algorithm.parameters) {
      if (param.required && !(param.name in parameters)) {
        throw new Error(`Required parameter missing: ${param.name}`);
      }
      
      if (param.name in parameters) {
        const value = parameters[param.name];
        
        // Type validation
        if (param.type === 'number' && typeof value !== 'number') {
          throw new Error(`Parameter ${param.name} must be a number`);
        }
        
        // Constraint validation
        if (param.constraints) {
          if (param.constraints.min !== undefined && value < param.constraints.min) {
            throw new Error(`Parameter ${param.name} below minimum: ${param.constraints.min}`);
          }
          if (param.constraints.max !== undefined && value > param.constraints.max) {
            throw new Error(`Parameter ${param.name} above maximum: ${param.constraints.max}`);
          }
        }
      }
    }
  }

  private async generateAlgorithmCircuit(
    algorithm: QuantumAlgorithm,
    parameters: unknown
  ): Promise<Omit<QuantumCircuit, 'id' | 'createdAt' | 'updatedAt'>> {
    // Mock circuit generation based on algorithm
    const qubits = parameters.n_qubits || parameters.qubits || 4;
    
    let gates: QuantumCircuit['gates'] = [];
    
    if (algorithm.name.includes('QFT')) {
      gates = this.generateQFTGates(qubits);
    } else if (algorithm.name.includes('VQE')) {
      gates = this.generateVQEGates(qubits, parameters.ansatz_depth || 3);
    } else {
      // Generic algorithm circuit
      gates = this.generateGenericGates(qubits);
    }
    
    return {
      name: `${algorithm.name} Circuit`,
      description: `Generated circuit for ${algorithm.name}`,
      qubits,
      depth: this.calculateCircuitDepth(gates),
      gates,
      measurements: Array.from({ length: qubits }, (_, i) => ({ qubit: i, classicalBit: i })),
      metadata: {
        creator: 'algorithm-generator',
        algorithm: algorithm.name,
        purpose: algorithm.description,
        complexity: 'medium',
        tags: [algorithm.category, 'generated']
      },
      optimization: {
        level: 'basic',
        preserveStructure: false
      }
    };
  }

  private generateQFTGates(qubits: number): QuantumCircuit['gates'] {
    const gates: QuantumCircuit['gates'] = [];
    
    for (let i = 0; i < qubits; i++) {
      gates.push({ type: 'H', targets: [i] });
      
      for (let j = i + 1; j < qubits; j++) {
        gates.push({
          type: 'RZ',
          targets: [i],
          controls: [j],
          angle: Math.PI / Math.pow(2, j - i)
        });
      }
    }
    
    // Add SWAP gates for bit reversal
    for (let i = 0; i < Math.floor(qubits / 2); i++) {
      gates.push({ type: 'SWAP', targets: [i, qubits - 1 - i] });
    }
    
    return gates;
  }

  private generateVQEGates(qubits: number, depth: number): QuantumCircuit['gates'] {
    const gates: QuantumCircuit['gates'] = [];
    
    for (let layer = 0; layer < depth; layer++) {
      // RY rotation on all qubits
      for (let i = 0; i < qubits; i++) {
        gates.push({
          type: 'RY',
          targets: [i],
          angle: Math.random() * 2 * Math.PI // Random initial parameters
        });
      }
      
      // Entangling layer
      for (let i = 0; i < qubits - 1; i++) {
        gates.push({ type: 'CNOT', targets: [i + 1], controls: [i] });
      }
    }
    
    return gates;
  }

  private generateGenericGates(qubits: number): QuantumCircuit['gates'] {
    const gates: QuantumCircuit['gates'] = [];
    const gateTypes: Array<QuantumCircuit['gates'][0]['type']> = ['X', 'Y', 'Z', 'H', 'RX', 'RY', 'RZ'];
    
    for (let i = 0; i < qubits * 3; i++) {
      const gateType = gateTypes[Math.floor(Math.random() * gateTypes.length)];
      const target = Math.floor(Math.random() * qubits);
      
      if (gateType.startsWith('R')) {
        gates.push({
          type: gateType as string,
          targets: [target],
          angle: Math.random() * 2 * Math.PI
        });
      } else {
        gates.push({
          type: gateType,
          targets: [target]
        });
      }
    }
    
    return gates;
  }

  private calculateCircuitDepth(gates: QuantumCircuit['gates']): number {
    // Simplified depth calculation
    const qubitLastUsed = new Map<number, number>();
    let depth = 0;
    
    for (let i = 0; i < gates.length; i++) {
      const gate = gates[i];
      const allQubits = [...gate.targets, ...(gate.controls || [])];
      
      const gateDepth = Math.max(0, ...allQubits.map(q => qubitLastUsed.get(q) || 0)) + 1;
      
      for (const qubit of allQubits) {
        qubitLastUsed.set(qubit, gateDepth);
      }
      
      depth = Math.max(depth, gateDepth);
    }
    
    return depth;
  }

  private validateSimulation(simulation: QuantumSimulation): void {
    if (!simulation.name || !simulation.type) {
      throw new Error('Simulation name and type are required');
    }
    
    if (!simulation.algorithm.name) {
      throw new Error('Algorithm name is required');
    }
    
    if (simulation.problem.variables.length === 0) {
      throw new Error('Simulation must have at least one variable');
    }
  }

  private async estimateSimulationResources(simulation: QuantumSimulation): Promise<QuantumSimulation['resources']> {
    const variables = simulation.problem.variables.length;
    const qubits = Math.ceil(Math.log2(variables)) + 2; // Extra qubits for ancillas
    
    return {
      qubits,
      gates: qubits * 50, // Rough estimate
      depth: qubits * 10,
      shots: 1024,
      runtime: 30 // minutes
    };
  }

  private async buildSimulationCircuit(simulation: QuantumSimulation): Promise<Omit<QuantumCircuit, 'id' | 'createdAt' | 'updatedAt'>> {
    const qubits = simulation.resources.qubits;
    
    // Build circuit based on simulation type
    let gates: QuantumCircuit['gates'] = [];
    
    if (simulation.type === 'optimization') {
      gates = this.buildOptimizationCircuit(simulation, qubits);
    } else if (simulation.type === 'molecular') {
      gates = this.buildMolecularCircuit(simulation, qubits);
    } else {
      gates = this.generateGenericGates(qubits);
    }
    
    return {
      name: `${simulation.name} Circuit`,
      description: `Circuit for ${simulation.type} simulation`,
      qubits,
      depth: this.calculateCircuitDepth(gates),
      gates,
      measurements: Array.from({ length: qubits }, (_, i) => ({ qubit: i, classicalBit: i })),
      metadata: {
        creator: simulation.createdBy,
        algorithm: simulation.algorithm.name,
        purpose: simulation.problem.description,
        complexity: 'high',
        tags: [simulation.type, 'simulation']
      },
      optimization: {
        level: 'advanced',
        preserveStructure: true
      }
    };
  }

  private buildOptimizationCircuit(simulation: QuantumSimulation, qubits: number): QuantumCircuit['gates'] {
    // QAOA-style circuit for optimization
    const gates: QuantumCircuit['gates'] = [];
    const depth = simulation.algorithm.parameters.depth || 3;
    
    // Initial superposition
    for (let i = 0; i < qubits; i++) {
      gates.push({ type: 'H', targets: [i] });
    }
    
    // QAOA layers
    for (let layer = 0; layer < depth; layer++) {
      // Problem Hamiltonian
      for (let i = 0; i < qubits - 1; i++) {
        gates.push({ type: 'CNOT', targets: [i + 1], controls: [i] });
        gates.push({ type: 'RZ', targets: [i + 1], angle: Math.random() });
        gates.push({ type: 'CNOT', targets: [i + 1], controls: [i] });
      }
      
      // Mixer Hamiltonian
      for (let i = 0; i < qubits; i++) {
        gates.push({ type: 'RX', targets: [i], angle: Math.random() });
      }
    }
    
    return gates;
  }

  private buildMolecularCircuit(simulation: QuantumSimulation, qubits: number): QuantumCircuit['gates'] {
    // VQE-style circuit for molecular simulation
    const gates: QuantumCircuit['gates'] = [];
    const depth = simulation.algorithm.parameters.ansatz_depth || 3;
    
    // Build molecular ansatz
    for (let layer = 0; layer < depth; layer++) {
      // Single qubit rotations
      for (let i = 0; i < qubits; i++) {
        gates.push({ type: 'RY', targets: [i], angle: Math.random() * Math.PI });
      }
      
      // Two-qubit entangling gates
      for (let i = 0; i < qubits; i += 2) {
        if (i + 1 < qubits) {
          gates.push({ type: 'CNOT', targets: [i + 1], controls: [i] });
        }
      }
    }
    
    return gates;
  }

  private async runVariationalSimulation(simulation: QuantumSimulation, circuitId: string): Promise<unknown> {
    const maxIterations = simulation.algorithm.optimizer.maxIterations;
    const tolerance = simulation.algorithm.optimizer.tolerance;
    
    let bestEnergy = Infinity;
    let bestParameters: number[] = [];
    const convergence = [];
    
    // Mock variational optimization
    for (let iter = 0; iter < maxIterations; iter++) {
      // Generate random parameters for this iteration
      const parameters = Array.from({ length: 10 }, () => Math.random() * 2 * Math.PI);
      
      // Mock energy calculation
      const energy = -1.5 + Math.random() * 0.5 + Math.exp(-iter / 10); // Converging to -1.5
      const gradient = Math.random() * 0.1;
      
      convergence.push({
        iteration: iter,
        energy,
        gradient,
        parameters: [...parameters]
      });
      
      if (energy < bestEnergy) {
        bestEnergy = energy;
        bestParameters = [...parameters];
      }
      
      // Check convergence
      if (iter > 0 && Math.abs(convergence[iter - 1].energy - energy) < tolerance) {
        break;
      }
    }
    
    return {
      energy: bestEnergy,
      groundState: bestParameters,
      convergence,
      fidelity: 0.95 + Math.random() * 0.05,
      success: bestEnergy < -1.0
    };
  }

  private processSimulationResults(jobResults: unknown, simulation: QuantumSimulation): unknown {
    if (!jobResults) return null;
    
    // Process results based on simulation type
    if (simulation.type === 'optimization') {
      return this.processOptimizationResults(jobResults, simulation);
    } else if (simulation.type === 'molecular') {
      return this.processMolecularResults(jobResults, simulation);
    }
    
    return jobResults;
  }

  private processOptimizationResults(jobResults: unknown, simulation: QuantumSimulation): unknown {
    // Extract optimization solution from measurement results
    const counts = jobResults.counts;
    const mostProbableState = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    
    return {
      solution: mostProbableState,
      probability: counts[mostProbableState] / Object.values(counts).reduce((a: unknown, b: unknown) => a + b, 0),
      energy: Math.random() * -1 - 0.5, // Mock energy
      success: true
    };
  }

  private processMolecularResults(jobResults: unknown, simulation: QuantumSimulation): unknown {
    // Process molecular simulation results
    return {
      energy: Math.random() * -2 - 1, // Mock molecular energy
      groundState: Object.keys(jobResults.counts)[0],
      fidelity: jobResults.fidelity,
      success: true
    };
  }

  private async validateSimulationResults(simulation: QuantumSimulation): Promise<void> {
    if (!simulation.results || !simulation.validation) return;
    
    // Mock validation
    const classicalBenchmark = simulation.validation.classicalBenchmark;
    const quantumResult = simulation.results.energy;
    
    if (classicalBenchmark && quantumResult) {
      const error = Math.abs(quantumResult - classicalBenchmark) / Math.abs(classicalBenchmark);
      simulation.validation.errorAnalysis = `Relative error: ${(error * 100).toFixed(2)}%`;
    }
  }

  private applyBasicOptimizations(gates: QuantumCircuit['gates']): QuantumCircuit['gates'] {
    // Remove consecutive Pauli gates on same qubit
    const optimized = [];
    let i = 0;
    
    while (i < gates.length) {
      const gate = gates[i];
      
      if (['X', 'Y', 'Z'].includes(gate.type) && i + 1 < gates.length) {
        const nextGate = gates[i + 1];
        if (gate.type === nextGate.type && 
            gate.targets[0] === nextGate.targets[0] && 
            !gate.controls && !nextGate.controls) {
          // Two identical Pauli gates cancel out
          i += 2;
          continue;
        }
      }
      
      optimized.push(gate);
      i++;
    }
    
    return optimized;
  }

  private applyAdvancedOptimizations(gates: QuantumCircuit['gates']): QuantumCircuit['gates'] {
    let optimized = this.applyBasicOptimizations(gates);
    
    // Combine rotation gates
    optimized = this.combineRotations(optimized);
    
    // Optimize CNOT chains
    optimized = this.optimizeCNOTChains(optimized);
    
    return optimized;
  }

  private applyAggressiveOptimizations(gates: QuantumCircuit['gates']): QuantumCircuit['gates'] {
    let optimized = this.applyAdvancedOptimizations(gates);
    
    // Template matching and replacement
    optimized = this.applyTemplateOptimizations(optimized);
    
    return optimized;
  }

  private combineRotations(gates: QuantumCircuit['gates']): QuantumCircuit['gates'] {
    // Combine consecutive rotation gates on same qubit
    const optimized = [];
    let i = 0;
    
    while (i < gates.length) {
      const gate = gates[i];
      
      if (['RX', 'RY', 'RZ'].includes(gate.type) && i + 1 < gates.length) {
        const nextGate = gates[i + 1];
        if (gate.type === nextGate.type && 
            gate.targets[0] === nextGate.targets[0] &&
            !gate.controls && !nextGate.controls) {
          // Combine angles
          optimized.push({
            ...gate,
            angle: (gate.angle || 0) + (nextGate.angle || 0)
          });
          i += 2;
          continue;
        }
      }
      
      optimized.push(gate);
      i++;
    }
    
    return optimized;
  }

  private optimizeCNOTChains(gates: QuantumCircuit['gates']): QuantumCircuit['gates'] {
    // Optimize chains of CNOT gates
    return gates; // Simplified - would implement more complex logic
  }

  private applyTemplateOptimizations(gates: QuantumCircuit['gates']): QuantumCircuit['gates'] {
    // Apply known gate sequence optimizations
    return gates; // Simplified - would implement template matching
  }

  private collectMetrics(): void {
    const now = new Date();
    const metrics = {
      timestamp: now,
      activeJobs: this.activeJobs.size,
      queuedJobs: this.jobQueue.length,
      totalCircuits: this.circuits.size,
      totalJobs: this.jobs.size,
      backendUtilization: this.calculateCurrentBackendUtilization()
    };
    
    this.metrics.set(now.toISOString(), metrics);
    this.emit('metricsCollected', metrics);
  }

  private calculateCurrentBackendUtilization(): { [backend: string]: number } {
    const utilization: { [backend: string]: number } = {};
    
    for (const backend of this.backends.keys()) {
      const activeJobsOnBackend = Array.from(this.activeJobs).filter(jobId => {
        const job = this.jobs.get(jobId);
        return job?.backend.device === backend;
      }).length;
      
      utilization[backend] = activeJobsOnBackend;
    }
    
    return utilization;
  }

  private calculateQubitHours(jobs: QuantumJob[]): number {
    return jobs.reduce((total, job) => {
      const circuit = this.circuits.get(job.circuitId);
      const executionTime = job.results?.executionTime || 0;
      return total + (circuit?.qubits || 0) * (executionTime / 1000 / 3600); // Convert to hours
    }, 0);
  }

  private calculateGateOperations(jobs: QuantumJob[]): number {
    return jobs.reduce((total, job) => {
      const circuit = this.circuits.get(job.circuitId);
      return total + (circuit?.gates.length || 0) * job.execution.shots;
    }, 0);
  }

  private groupCostsByProvider(jobs: QuantumJob[]): { [provider: string]: number } {
    const costs: { [provider: string]: number } = {};
    
    for (const job of jobs) {
      const provider = job.backend.provider;
      costs[provider] = (costs[provider] || 0) + (job.cost.actual || 0);
    }
    
    return costs;
  }

  private groupCostsByBackend(jobs: QuantumJob[]): { [backend: string]: number } {
    const costs: { [backend: string]: number } = {};
    
    for (const job of jobs) {
      const backend = job.backend.device;
      costs[backend] = (costs[backend] || 0) + (job.cost.actual || 0);
    }
    
    return costs;
  }

  private getMostUsedAlgorithms(jobs: QuantumJob[]): string[] {
    const algorithmCounts: { [algorithm: string]: number } = {};
    
    for (const job of jobs) {
      const circuit = this.circuits.get(job.circuitId);
      if (circuit) {
        const algorithm = circuit.metadata.algorithm;
        algorithmCounts[algorithm] = (algorithmCounts[algorithm] || 0) + 1;
      }
    }
    
    return Object.entries(algorithmCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([algorithm]) => algorithm);
  }

  private calculateAlgorithmSuccessRates(jobs: QuantumJob[]): { [algorithm: string]: number } {
    const algorithmStats: { [algorithm: string]: { total: number; successful: number } } = {};
    
    for (const job of jobs) {
      const circuit = this.circuits.get(job.circuitId);
      if (circuit) {
        const algorithm = circuit.metadata.algorithm;
        if (!algorithmStats[algorithm]) {
          algorithmStats[algorithm] = { total: 0, successful: 0 };
        }
        
        algorithmStats[algorithm].total++;
        if (job.status === 'completed') {
          algorithmStats[algorithm].successful++;
        }
      }
    }
    
    const successRates: { [algorithm: string]: number } = {};
    for (const [algorithm, stats] of Object.entries(algorithmStats)) {
      successRates[algorithm] = stats.total > 0 ? stats.successful / stats.total : 0;
    }
    
    return successRates;
  }

  private calculateBackendUtilization(jobs: QuantumJob[]): { [backend: string]: number } {
    const utilizationData: { [backend: string]: number } = {};
    
    for (const job of jobs) {
      const backend = job.backend.device;
      const executionTime = job.results?.executionTime || 0;
      utilizationData[backend] = (utilizationData[backend] || 0) + executionTime;
    }
    
    return utilizationData;
  }

  private calculateBackendAvailability(): { [backend: string]: number } {
    const availability: { [backend: string]: number } = {};
    
    for (const backend of this.backends.keys()) {
      // Mock availability calculation
      availability[backend] = 0.95 + Math.random() * 0.05; // 95-100%
    }
    
    return availability;
  }

  private calculateAverageQueueTimes(jobs: QuantumJob[]): { [backend: string]: number } {
    const queueTimes: { [backend: string]: number[] } = {};
    
    for (const job of jobs) {
      if (job.timeline.started) {
        const backend = job.backend.device;
        const queueTime = job.timeline.started.getTime() - job.timeline.queued.getTime();
        
        if (!queueTimes[backend]) {
          queueTimes[backend] = [];
        }
        queueTimes[backend].push(queueTime);
      }
    }
    
    const averages: { [backend: string]: number } = {};
    for (const [backend, times] of Object.entries(queueTimes)) {
      averages[backend] = times.length > 0 ? 
        times.reduce((a, b) => a + b, 0) / times.length / 1000 / 60 : 0; // Convert to minutes
    }
    
    return averages;
  }
}