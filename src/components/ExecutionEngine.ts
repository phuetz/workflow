// Moteur d'exécution complet pour les workflows
export class WorkflowExecutor {
  constructor(
    private nodes: any[],
    private edges: any[],
    private options: any = {}
  ) {}
  
  // Exécution d'un nœud spécifique
  async executeNode(node: any, inputData: any = {}) {
    const { type, config = {} } = node.data;
    const startTime = Date.now();
    
    try {
      console.log(`🚀 Executing node: ${node.data.label} (${type})`);
      
      // Simuler un délai d'exécution réaliste
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 2000));
      
      let result: any = {};
      
      switch (type) {
        case 'trigger':
        case 'manualTrigger':
        case 'webhook':
          result = await this.executeTrigger(node, config, inputData);
          break;
          
        case 'schedule':
          result = await this.executeSchedule(node, config, inputData);
          break;
          
        case 'httpRequest':
          result = await this.executeHttpRequest(node, config, inputData);
          break;
          
        case 'email':
        case 'gmail':
          result = await this.executeEmail(node, config, inputData);
          break;
          
        case 'slack':
          result = await this.executeSlack(node, config, inputData);
          break;
          
        case 'discord':
          result = await this.executeDiscord(node, config, inputData);
          break;
          
        case 'mysql':
        case 'postgres':
          result = await this.executeDatabase(node, config, inputData);
          break;
          
        case 'mongodb':
          result = await this.executeMongoDB(node, config, inputData);
          break;
          
        case 'condition':
          result = await this.executeCondition(node, config, inputData);
          break;
          
        case 'transform':
          result = await this.executeTransform(node, config, inputData);
          break;
          
        case 'code':
          result = await this.executeCode(node, config, inputData);
          break;
          
        case 'openai':
          result = await this.executeOpenAI(node, config, inputData);
          break;
          
        case 'filter':
          result = await this.executeFilter(node, config, inputData);
          break;
          
        case 'sort':
          result = await this.executeSort(node, config, inputData);
          break;
          
        case 'merge':
          result = await this.executeMerge(node, config, inputData);
          break;

        case 'delay':
          result = await this.executeDelay(node, config, inputData);
          break;

        case 'loop':
          result = await this.executeLoop(node, config, inputData);
          break;

        case 'forEach':
          result = await this.executeForEach(node, config, inputData);
          break;

        case 'etl':
          result = await this.executeETL(node, config, inputData);
          break;

        case 'googleSheets':
          result = await this.executeGoogleSheets(node, config, inputData);
          break;
          
        case 's3':
          result = await this.executeS3(node, config, inputData);
          break;
          
        default:
          result = await this.executeGeneric(node, config, inputData);
      }
      
      const duration = Date.now() - startTime;
      
      return {
        status: 'success',
        data: result,
        duration,
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        nodeType: type
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        status: 'error',
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code || 'EXECUTION_ERROR'
        },
        duration,
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        nodeType: type
      };
    }
  }
  
  // Implémentations spécifiques des nœuds
  async executeTrigger(node: any, config: any, inputData: any) {
    return { 
      trigger: 'manual',
      timestamp: new Date().toISOString(),
      data: config.mockData || {
        userId: Math.floor(Math.random() * 1000),
        email: 'user@example.com',
        action: 'signup'
      }
    };
  }
  
  async executeSchedule(node: any, config: any, inputData: any) {
    return {
      scheduled: true,
      cron: config.cron || '0 9 * * *',
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      data: { scheduledExecution: true }
    };
  }
  
  async executeHttpRequest(node: any, config: any, inputData: any) {
    const url = config.url || 'https://jsonplaceholder.typicode.com/posts/1';
    const method = config.method || 'GET';
    
    // Simulation d'une vraie requête HTTP
    const mockResponses = {
      'https://jsonplaceholder.typicode.com/posts/1': {
        id: 1,
        title: 'Mock post title',
        body: 'Mock post body',
        userId: 1
      },
      'https://api.github.com/users/octocat': {
        login: 'octocat',
        id: 1,
        name: 'The Octocat',
        company: 'GitHub'
      }
    };
    
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: mockResponses[url] || { message: 'HTTP request executed', url, method },
      url,
      method,
      duration: Math.floor(Math.random() * 1000) + 100
    };
  }
  
  async executeEmail(node: any, config: any, inputData: any) {
    const to = config.to || inputData.email || 'user@example.com';
    const subject = config.subject || 'Email from workflow';
    const body = config.body || 'This is an automated email';
    
    return {
      sent: true,
      to,
      subject,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: config.host?.includes('gmail') ? 'Gmail' : 'SMTP',
      timestamp: new Date().toISOString()
    };
  }
  
  async executeSlack(node: any, config: any, inputData: any) {
    const channel = config.channel || '#general';
    const message = config.message || 'Message from workflow';
    
    return {
      sent: true,
      channel,
      message,
      ts: Date.now().toString(),
      user: 'workflow-bot'
    };
  }
  
  async executeDiscord(node: any, config: any, inputData: any) {
    const content = config.content || 'Message from workflow';
    
    return {
      sent: true,
      content,
      messageId: Math.random().toString(36).substr(2, 18),
      timestamp: new Date().toISOString()
    };
  }
  
  async executeDatabase(node: any, config: any, inputData: any) {
    const operation = config.operation || 'select';
    const query = config.query || 'SELECT * FROM users LIMIT 10';
    
    const mockData = [
      { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-01' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-02' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', created_at: '2024-01-03' }
    ];
    
    return {
      operation,
      query,
      rowsAffected: mockData.length,
      data: operation === 'select' ? mockData : null,
      executionTime: Math.floor(Math.random() * 100) + 10
    };
  }
  
  async executeMongoDB(node: any, config: any, inputData: any) {
    const operation = config.operation || 'find';
    const collection = config.collection || 'users';
    
    return {
      operation,
      collection,
      database: config.database,
      result: {
        acknowledged: true,
        insertedCount: operation.includes('insert') ? 1 : undefined,
        matchedCount: operation.includes('update') ? 1 : undefined,
        modifiedCount: operation.includes('update') ? 1 : undefined
      }
    };
  }
  
  async executeCondition(node: any, config: any, inputData: any) {
    const condition = config.condition || 'true';
    
    // Évaluation simple de conditions
    let result = false;
    
    try {
      if (condition === 'true') result = true;
      else if (condition === 'false') result = false;
      else if (condition.includes('$json')) {
        // Simulation d'évaluation d'expression
        const value = inputData?.amount || Math.random() * 200;
        if (condition.includes('> 100')) result = value > 100;
        else if (condition.includes('< 50')) result = value < 50;
        else result = Math.random() > 0.5;
      } else {
        result = Math.random() > 0.5; // Simulation aléatoire
      }
    } catch {
      result = false;
    }
    
    return {
      condition,
      result,
      branch: result ? 'true' : 'false',
      data: inputData
    };
  }
  
  async executeTransform(node: any, config: any, inputData: any) {
    const code = config.code || 'return { ...items, transformed: true };';
    
    // Simulation de transformation
    const transformed = {
      ...inputData,
      transformed: true,
      transformedAt: new Date().toISOString(),
      originalKeys: Object.keys(inputData || {}),
      transformationType: config.transformType || 'javascript'
    };
    
    return transformed;
  }
  
  async executeCode(node: any, config: any, inputData: any) {
    const code = config.code || 'return { success: true };';
    
    // Simulation d'exécution de code
    try {
      const result = {
        executed: true,
        code: code.substring(0, 100) + (code.length > 100 ? '...' : ''),
        result: { success: true, timestamp: new Date().toISOString() },
        runtime: 'javascript',
        inputData
      };
      
      return result;
    } catch (error: any) {
      throw new Error(`Code execution failed: ${error.message}`);
    }
  }
  
  async executeOpenAI(node: any, config: any, inputData: any) {
    const model = config.model || 'gpt-3.5-turbo';
    const prompt = config.prompt || 'Hello, how are you?';
    
    // Simulation de réponse OpenAI
    const responses = [
      'Hello! I\'m doing well, thank you for asking. How can I help you today?',
      'I\'m functioning perfectly! What would you like to know or discuss?',
      'Greetings! I\'m here and ready to assist you with any questions or tasks.',
      'Hi there! I\'m doing great. What can I do for you?'
    ];
    
    return {
      model,
      prompt,
      response: responses[Math.floor(Math.random() * responses.length)],
      usage: {
        prompt_tokens: prompt.split(' ').length,
        completion_tokens: Math.floor(Math.random() * 50) + 10,
        total_tokens: Math.floor(Math.random() * 100) + 50
      },
      temperature: config.temperature || 0.7
    };
  }
  
  async executeFilter(node: any, config: any, inputData: any) {
    const filterExpression = config.filter || 'item.active === true';
    
    // Simulation de filtrage
    const items = inputData?.items || [
      { id: 1, name: 'Item 1', active: true },
      { id: 2, name: 'Item 2', active: false },
      { id: 3, name: 'Item 3', active: true }
    ];
    
    const filtered = items.filter((item: any, index: number) => index % 2 === 0); // Simulation
    
    return {
      originalCount: items.length,
      filteredCount: filtered.length,
      filter: filterExpression,
      items: filtered
    };
  }
  
  async executeSort(node: any, config: any, inputData: any) {
    const field = config.field || 'name';
    const order = config.order || 'asc';
    
    const items = inputData?.items || [
      { id: 3, name: 'Charlie', score: 85 },
      { id: 1, name: 'Alice', score: 92 },
      { id: 2, name: 'Bob', score: 78 }
    ];
    
    const sorted = [...items].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      return order === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    
    return {
      field,
      order,
      count: sorted.length,
      items: sorted
    };
  }
  
  async executeMerge(node: any, config: any, inputData: any) {
    // Simulation de fusion de données
    return {
      merged: true,
      sources: 2,
      data: {
        ...inputData,
        mergedAt: new Date().toISOString(),
        mergeStrategy: 'combine'
      }
    };
  }
  
  async executeDelay(node: any, config: any, inputData: any) {
    const delay = parseInt(config.delay) || 5;
    const unit = config.unit || 'seconds';
    
    const delayMs = unit === 'minutes' ? delay * 60 * 1000 : 
                   unit === 'hours' ? delay * 60 * 60 * 1000 : 
                   delay * 1000;
    
    // Simulation du délai (en réalité on ne va pas attendre)
    return {
      delayed: true,
      duration: delay,
      unit,
      delayMs,
      data: inputData
    };
  }
  
  async executeGoogleSheets(node: any, config: any, inputData: any) {
    const operation = config.operation || 'read';
    const spreadsheetId = config.spreadsheetId || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
    const range = config.range || 'A1:D10';
    
    return {
      operation,
      spreadsheetId,
      range,
      data: operation === 'read' ? [
        ['Name', 'Email', 'Score', 'Date'],
        ['John Doe', 'john@example.com', '95', '2024-01-01'],
        ['Jane Smith', 'jane@example.com', '87', '2024-01-02']
      ] : null,
      rowsAffected: operation === 'write' ? 1 : undefined
    };
  }
  
  async executeS3(node: any, config: any, inputData: any) {
    const operation = config.operation || 'upload';
    const bucket = config.bucket || 'my-bucket';
    
    return {
      operation,
      bucket,
      region: config.region || 'us-east-1',
      key: `file-${Date.now()}.json`,
      size: Math.floor(Math.random() * 10000) + 1000,
      etag: Math.random().toString(36).substr(2, 32)
    };
  }

  async executeLoop(node: any, config: any, inputData: any) {
    const items = Array.isArray(inputData?.items) ? inputData.items : [];
    const max = parseInt(config.maxIterations) || items.length;
    const delay = parseInt(config.delayMs) || 0;

    const results: any[] = [];
    for (let i = 0; i < items.length && i < max; i++) {
      results.push({ index: i, item: items[i] });
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      iterations: results.length,
      results
    };
  }

  async executeForEach(node: any, config: any, inputData: any) {
    const items = Array.isArray(inputData?.items) ? inputData.items : [];
    const results: any[] = [];

    for (let i = 0; i < items.length; i++) {
      results.push({ index: i, item: items[i] });
    }

    return {
      count: results.length,
      results
    };
  }

  async executeETL(node: any, config: any, inputData: any) {
    const data = Array.isArray(inputData?.data) ? inputData.data : [];
    let transformed = data;

    if (config.filterField) {
      transformed = transformed.filter((item: any) =>
        item && item[config.filterField] === config.filterValue
      );
    }

    if (Array.isArray(config.selectFields) && config.selectFields.length > 0) {
      transformed = transformed.map((item: any) => {
        const out: any = {};
        for (const field of config.selectFields) {
          out[field] = item[field];
        }
        return out;
      });
    }

    return {
      extracted: data.length,
      loaded: transformed.length,
      sample: transformed.slice(0, 3),
      data: transformed
    };
  }
  
  async executeGeneric(node: any, config: any, inputData: any) {
    return {
      nodeType: node.data.type,
      executed: true,
      config,
      inputData,
      timestamp: new Date().toISOString()
    };
  }
  
  // Obtenir les nœuds suivants
  getNextNodes(nodeId: string, branch?: string) {
    const outgoingEdges = this.edges.filter(edge => {
      if (edge.source !== nodeId) return false;
      if (branch && edge.sourceHandle && edge.sourceHandle !== branch) return false;
      return true;
    });
    
    return outgoingEdges.map(edge => {
      const node = this.nodes.find(n => n.id === edge.target);
      return { node, edge };
    });
  }
  
  // Obtenir les nœuds de départ
  getStartNodes() {
    const nodesWithInputs = new Set(this.edges.map(edge => edge.target));
    return this.nodes.filter(node => !nodesWithInputs.has(node.id));
  }
  
  // Exécution principale avec support des branches
  async execute(onNodeStart: Function, onNodeComplete: Function, onNodeError: Function) {
    const startTime = Date.now();
    const executionId = `exec_${Date.now()}`;
    
    console.log(`🚀 Starting workflow execution: ${executionId}`);
    
    const startNodes = this.getStartNodes();
    if (startNodes.length === 0) {
      throw new Error('No start nodes found in workflow');
    }
    
    const executionQueue: Array<{node: any, inputData: any}> = startNodes.map(node => ({
      node,
      inputData: {}
    }));
    
    const executed = new Set();
    const results: {[nodeId: string]: any} = {};
    const errors: any[] = [];
    
    while (executionQueue.length > 0) {
      const { node, inputData } = executionQueue.shift()!;
      
      if (!node || executed.has(node.id)) continue;
      
      try {
        console.log(`▶️ Executing node: ${node.data.label} (${node.id})`);
        onNodeStart(node.id);
        
        // Obtenir les données d'entrée des nœuds précédents
        const incomingEdges = this.edges.filter(edge => edge.target === node.id);
        let nodeInputData = inputData;
        
        if (incomingEdges.length > 0) {
          // Combiner les données des nœuds précédents
          const combinedData: any = {};
          for (const edge of incomingEdges) {
            const sourceResult = results[edge.source];
            if (sourceResult?.data) {
              Object.assign(combinedData, sourceResult.data);
            }
          }
          nodeInputData = { ...inputData, ...combinedData };
        }
        
        // Exécuter le nœud
        const result = await this.executeNode(node, nodeInputData);
        results[node.id] = result;
        
        console.log(`✅ Node completed: ${node.data.label}`, result);
        onNodeComplete(node.id, result);
        executed.add(node.id);
        
        // Gérer les nœuds suivants
        let nextNodes = [];
        
        if (result.status === 'success' && node.data.type === 'condition' && result.data?.branch) {
          // Pour les conditions, utiliser la branche spécifique
          nextNodes = this.getNextNodes(node.id, result.data.branch);
        } else if (result.status === 'success') {
          // Pour les autres nœuds, prendre toutes les sorties
          nextNodes = this.getNextNodes(node.id);
        }
        
        // Ajouter les nœuds suivants à la queue
        for (const { node: nextNode } of nextNodes) {
          if (nextNode && !executed.has(nextNode.id)) {
            executionQueue.push({
              node: nextNode,
              inputData: result.data || {}
            });
          }
        }
        
      } catch (error: any) {
        console.error(`❌ Node failed: ${node.data.label}`, error);
        errors.push({ nodeId: node.id, error });
        onNodeError(node.id, error);
        executed.add(node.id);
        
        // En cas d'erreur, continuer avec les autres nœuds si configuré
        if (!node.data.config?.continueOnFail) {
          break;
        }
      }
    }
    
    const duration = Date.now() - startTime;
    const status = errors.length === 0 ? 'success' : 'error';
    
    console.log(`🏁 Workflow execution completed: ${status} in ${duration}ms`);
    
    return {
      executionId,
      status,
      duration,
      nodesExecuted: executed.size,
      errors,
      results,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString()
    };
  }
}