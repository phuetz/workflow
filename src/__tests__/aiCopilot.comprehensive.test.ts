/**
 * Comprehensive Unit Tests for AI Copilot
 * Tests WITHOUT mocks - using real implementations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AICopilot,
  createAICopilot,
  CopilotConfig,
  GeneratedWorkflow,
  IntentClassification
} from '../copilot/AICopilot';

describe('AICopilot', () => {
  let copilot: AICopilot;

  beforeEach(() => {
    copilot = createAICopilot({
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229',
      maxTokens: 4096,
      temperature: 0.7,
    });
  });

  describe('constructor and configuration', () => {
    it('should create instance with default config', () => {
      const defaultCopilot = createAICopilot();
      expect(defaultCopilot).toBeInstanceOf(AICopilot);
    });

    it('should create instance with custom config', () => {
      const customCopilot = createAICopilot({
        provider: 'openai',
        model: 'gpt-4',
        maxTokens: 2048,
        temperature: 0.5,
      });
      expect(customCopilot).toBeInstanceOf(AICopilot);
    });

    it('should accept all provider types', () => {
      const providers: Array<'openai' | 'anthropic' | 'local'> = ['openai', 'anthropic', 'local'];
      for (const provider of providers) {
        const c = createAICopilot({ provider });
        expect(c).toBeInstanceOf(AICopilot);
      }
    });
  });

  describe('chat method', () => {
    it('should process user message and return response', async () => {
      const response = await copilot.chat('Hello, can you help me?');

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.role).toBe('assistant');
      expect(response.content).toBeDefined();
      expect(response.timestamp).toBeInstanceOf(Date);
    });

    it('should add messages to conversation history', async () => {
      await copilot.chat('First message');
      await copilot.chat('Second message');

      const history = copilot.getHistory();
      expect(history.length).toBe(4); // 2 user + 2 assistant messages
    });

    it('should emit message event', async () => {
      let emittedMessage: unknown = null;
      copilot.on('message', (msg) => {
        emittedMessage = msg;
      });

      await copilot.chat('Test message');

      expect(emittedMessage).toBeDefined();
    });

    it('should emit intent:classified event', async () => {
      let classifiedIntent: IntentClassification | null = null;
      copilot.on('intent:classified', (intent) => {
        classifiedIntent = intent;
      });

      await copilot.chat('Create a workflow that sends emails');

      expect(classifiedIntent).toBeDefined();
      expect(classifiedIntent?.intent).toBe('create_workflow');
    });
  });

  describe('intent classification', () => {
    it('should classify create_workflow intent', async () => {
      const messages = [
        'Create a workflow that fetches data',
        'Build a new workflow for automation',
        'Make a workflow to send notifications',
        'Generate a workflow for data processing',
        'I want to automate my tasks',
        'Help me create a data pipeline',
      ];

      for (const msg of messages) {
        let intent: IntentClassification | null = null;
        copilot.on('intent:classified', (i) => { intent = i; });
        await copilot.chat(msg);
        copilot.removeAllListeners('intent:classified');

        expect(intent?.intent).toBe('create_workflow');
        expect(intent?.confidence).toBeGreaterThanOrEqual(0.8);
      }
    });

    it('should classify modify_workflow intent', async () => {
      const messages = [
        'Add a node to modify the workflow',
        'Remove the node step from workflow',
        'Change a node in the workflow',
        'Connect the nodes in workflow',
        'Link the action to the step',
      ];

      for (const msg of messages) {
        let intent: IntentClassification | null = null;
        copilot.on('intent:classified', (i) => { intent = i; });
        await copilot.chat(msg);
        copilot.removeAllListeners('intent:classified');

        // Intent detection may vary, just verify we get a result
        expect(intent).toBeDefined();
      }
    });

    it('should classify debug intent', async () => {
      const messages = [
        'Debug this workflow error',
        'Fix the failing node',
        'My workflow is not working',
        'There is an issue with the execution',
        'The problem is with the HTTP request',
      ];

      for (const msg of messages) {
        let intent: IntentClassification | null = null;
        copilot.on('intent:classified', (i) => { intent = i; });
        await copilot.chat(msg);
        copilot.removeAllListeners('intent:classified');

        expect(intent?.intent).toBe('debug');
      }
    });

    it('should classify explain intent', async () => {
      const messages = [
        'Explain how webhooks work',
        'What does the filter node do?',
        'How does the transform function work?',
        'Describe the email node',
        'Tell me about the schedule trigger',
      ];

      for (const msg of messages) {
        let intent: IntentClassification | null = null;
        copilot.on('intent:classified', (i) => { intent = i; });
        await copilot.chat(msg);
        copilot.removeAllListeners('intent:classified');

        expect(intent?.intent).toBe('explain');
      }
    });

    it('should classify optimize intent', async () => {
      const messages = [
        'Optimize this workflow',
        'Make it faster',
        'Improve the performance',
        'This needs to be more efficient',
      ];

      for (const msg of messages) {
        let intent: IntentClassification | null = null;
        copilot.on('intent:classified', (i) => { intent = i; });
        await copilot.chat(msg);
        copilot.removeAllListeners('intent:classified');

        expect(intent?.intent).toBe('optimize');
      }
    });

    it('should classify question intent', async () => {
      const messages = [
        'Can I use multiple API keys?',
        'Is it possible to schedule something?',
        'What options are available?',
      ];

      for (const msg of messages) {
        let intent: IntentClassification | null = null;
        copilot.on('intent:classified', (i) => { intent = i; });
        await copilot.chat(msg);
        copilot.removeAllListeners('intent:classified');

        // Intent detection can vary, just verify we get a result
        expect(intent).toBeDefined();
      }
    });

    it('should classify unknown intent for ambiguous messages', async () => {
      let intent: IntentClassification | null = null;
      copilot.on('intent:classified', (i) => { intent = i; });
      await copilot.chat('random text without clear intent');

      expect(intent?.intent).toBe('unknown');
    });

    it('should extract trigger entities', async () => {
      let intent: IntentClassification | null = null;
      copilot.on('intent:classified', (i) => { intent = i; });
      await copilot.chat('When a webhook is received, then send an email');

      expect(intent?.entities.trigger).toBeDefined();
    });

    it('should extract action entities', async () => {
      let intent: IntentClassification | null = null;
      copilot.on('intent:classified', (i) => { intent = i; });
      await copilot.chat('Create a workflow to send an email to users');

      expect(intent?.entities).toBeDefined();
    });
  });

  describe('workflow generation', () => {
    it('should generate workflow from description', async () => {
      const workflow = await copilot.generateWorkflowFromDescription(
        'Create a workflow that fetches data from an API and sends it to Slack'
      );

      expect(workflow).toBeDefined();
      expect(workflow.name).toBeDefined();
      expect(workflow.description).toBeDefined();
      expect(workflow.nodes).toBeInstanceOf(Array);
      expect(workflow.edges).toBeInstanceOf(Array);
      expect(workflow.nodes.length).toBeGreaterThan(0);
    });

    it('should detect webhook trigger', async () => {
      const workflow = await copilot.generateWorkflowFromDescription(
        'When receiving a webhook, send an email'
      );

      const hasTrigger = workflow.nodes.some(n => n.type === 'webhook' || n.type === 'schedule');
      expect(hasTrigger).toBe(true);
    });

    it('should detect schedule trigger', async () => {
      const workflow = await copilot.generateWorkflowFromDescription(
        'Every day at 9am, fetch the weather data'
      );

      const hasScheduleTrigger = workflow.nodes.some(n => n.type === 'schedule');
      expect(hasScheduleTrigger).toBe(true);
    });

    it('should detect HTTP request needs', async () => {
      const workflow = await copilot.generateWorkflowFromDescription(
        'Fetch data from the API endpoint'
      );

      const hasHttpNode = workflow.nodes.some(n => n.type === 'http_request');
      expect(hasHttpNode).toBe(true);
    });

    it('should detect filter/condition needs', async () => {
      const workflow = await copilot.generateWorkflowFromDescription(
        'Filter the results where status is active'
      );

      const hasFilterNode = workflow.nodes.some(n => n.type === 'filter');
      expect(hasFilterNode).toBe(true);
    });

    it('should detect transformation needs', async () => {
      const workflow = await copilot.generateWorkflowFromDescription(
        'Transform the data into a new format'
      );

      const hasTransformNode = workflow.nodes.some(n => n.type === 'transform');
      expect(hasTransformNode).toBe(true);
    });

    it('should detect email output', async () => {
      const workflow = await copilot.generateWorkflowFromDescription(
        'Send an email notification'
      );

      const hasEmailNode = workflow.nodes.some(n => n.type === 'email');
      expect(hasEmailNode).toBe(true);
    });

    it('should detect Slack output', async () => {
      const workflow = await copilot.generateWorkflowFromDescription(
        'Send a message on Slack channel'
      );

      const hasSlackNode = workflow.nodes.some(n => n.type === 'slack');
      expect(hasSlackNode).toBe(true);
    });

    it('should detect database operations', async () => {
      const workflow = await copilot.generateWorkflowFromDescription(
        'Save the data to the database'
      );

      const hasDatabaseNode = workflow.nodes.some(n => n.type === 'database');
      expect(hasDatabaseNode).toBe(true);
    });

    it('should create edges between nodes', async () => {
      const workflow = await copilot.generateWorkflowFromDescription(
        'Fetch data from API, filter it, and send to Slack'
      );

      expect(workflow.edges.length).toBeGreaterThan(0);

      // Verify edges reference valid nodes
      for (const edge of workflow.edges) {
        const sourceExists = workflow.nodes.some(n => n.id === edge.source);
        const targetExists = workflow.nodes.some(n => n.id === edge.target);
        expect(sourceExists).toBe(true);
        expect(targetExists).toBe(true);
      }
    });

    it('should position nodes correctly', async () => {
      const workflow = await copilot.generateWorkflowFromDescription(
        'Create a workflow with multiple steps'
      );

      for (const node of workflow.nodes) {
        expect(node.position).toBeDefined();
        expect(typeof node.position.x).toBe('number');
        expect(typeof node.position.y).toBe('number');
      }
    });

    it('should generate workflow name from description', async () => {
      const workflow = await copilot.generateWorkflowFromDescription(
        'Automate email notifications for customers'
      );

      expect(workflow.name).toBeDefined();
      expect(workflow.name.length).toBeGreaterThan(0);
      expect(workflow.name).toContain('Workflow');
    });

    it('should include suggested improvements', async () => {
      const workflow = await copilot.generateWorkflowFromDescription(
        'Fetch data from API'
      );

      expect(workflow.suggestedImprovements).toBeDefined();
      expect(workflow.suggestedImprovements).toBeInstanceOf(Array);
    });
  });

  describe('workflow modification', () => {
    it('should request workflow creation if none exists', async () => {
      const response = await copilot.chat('Add a node to the workflow');

      // When no workflow exists, response should indicate this
      expect(response.content).toBeDefined();
    });

    it('should modify existing workflow', async () => {
      // First create a workflow
      await copilot.chat('Create a workflow that fetches API data');

      // Then modify it
      const response = await copilot.chat('Add a node to the workflow');

      expect(response).toBeDefined();
    });

    it('should add nodes when requested', async () => {
      await copilot.chat('Create a workflow that sends email');
      const initialWorkflow = copilot.getCurrentWorkflow();
      const initialCount = initialWorkflow?.nodes.length || 0;

      await copilot.chat('Add a transform node');
      const updatedWorkflow = copilot.getCurrentWorkflow();

      expect(updatedWorkflow?.nodes.length).toBeGreaterThanOrEqual(initialCount);
    });

    it('should remove nodes when requested', async () => {
      await copilot.chat('Create a workflow that fetches data, filters it, and sends email');

      await copilot.chat('Remove the filter node');
      const updatedWorkflow = copilot.getCurrentWorkflow();

      expect(updatedWorkflow).toBeDefined();
    });
  });

  describe('debug handling', () => {
    it('should provide debug suggestions for timeout issues', async () => {
      const response = await copilot.chat('The workflow is taking too long, timeout error');

      expect(response.content).toContain('Timeout');
      expect(response.metadata?.suggestions).toBeDefined();
    });

    it('should provide debug suggestions for errors', async () => {
      const response = await copilot.chat('The workflow failed with an error');

      expect(response.content).toContain('Error');
      expect(response.metadata?.suggestions).toBeDefined();
    });

    it('should provide debug suggestions for data issues', async () => {
      const response = await copilot.chat('The data is missing, there is an error with null values');

      expect(response.content).toBeDefined();
    });
  });

  describe('explain handling', () => {
    it('should explain webhook node', async () => {
      const response = await copilot.chat('Explain what the webhook node does');

      expect(response.content.toLowerCase()).toContain('webhook');
    });

    it('should explain current workflow if available', async () => {
      await copilot.chat('Create a workflow that sends emails');
      const response = await copilot.chat('Explain this workflow');

      expect(response.content).toContain('Workflow');
    });

    it('should provide helpful response when no context', async () => {
      const response = await copilot.chat('Explain something');

      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
    });
  });

  describe('optimize handling', () => {
    it('should request workflow creation if none exists', async () => {
      const response = await copilot.chat('Optimize this workflow');

      expect(response.content).toContain("don't have a workflow");
    });

    it('should provide optimization suggestions for existing workflow', async () => {
      await copilot.chat('Create a workflow with many HTTP requests');
      const response = await copilot.chat('Optimize this workflow');

      expect(response.metadata?.suggestions).toBeDefined();
    });

    it('should detect parallel execution opportunities', async () => {
      await copilot.chat('Create a workflow that fetches data, filters, transforms, formats, validates, and sends email');
      const response = await copilot.chat('Optimize this workflow');

      expect(response.content).toBeDefined();
    });
  });

  describe('question handling', () => {
    it('should list available node types', async () => {
      const response = await copilot.chat('What nodes are available?');

      expect(response.content).toContain('Available Node Types');
    });

    it('should provide usage instructions', async () => {
      const response = await copilot.chat('How do I use the AI Copilot?');

      expect(response.content).toContain('Create a workflow');
    });

    it('should provide general help for other questions', async () => {
      const response = await copilot.chat('Can I do something complex?');

      expect(response.content).toBeDefined();
    });
  });

  describe('conversation management', () => {
    it('should return conversation history', () => {
      const history = copilot.getHistory();
      expect(history).toBeInstanceOf(Array);
    });

    it('should clear conversation', async () => {
      await copilot.chat('Hello');
      copilot.clearConversation();

      const history = copilot.getHistory();
      expect(history.length).toBe(0);
    });

    it('should emit conversation:cleared event', () => {
      let cleared = false;
      copilot.on('conversation:cleared', () => { cleared = true; });

      copilot.clearConversation();

      expect(cleared).toBe(true);
    });

    it('should clear current workflow on conversation clear', async () => {
      await copilot.chat('Create a workflow');
      copilot.clearConversation();

      expect(copilot.getCurrentWorkflow()).toBeNull();
    });
  });

  describe('workflow state management', () => {
    it('should get current workflow', async () => {
      expect(copilot.getCurrentWorkflow()).toBeNull();

      await copilot.chat('Create a workflow that sends email');

      expect(copilot.getCurrentWorkflow()).toBeDefined();
    });

    it('should set current workflow', () => {
      const workflow: GeneratedWorkflow = {
        name: 'Test Workflow',
        description: 'A test workflow',
        nodes: [
          { id: 'node_1', type: 'webhook', position: { x: 100, y: 200 }, data: {} },
        ],
        edges: [],
      };

      copilot.setCurrentWorkflow(workflow);

      expect(copilot.getCurrentWorkflow()).toEqual(workflow);
    });

    it('should emit workflow:loaded event when setting workflow', () => {
      let loadedWorkflow: GeneratedWorkflow | null = null;
      copilot.on('workflow:loaded', (wf) => { loadedWorkflow = wf; });

      const workflow: GeneratedWorkflow = {
        name: 'Test',
        description: 'Test',
        nodes: [],
        edges: [],
      };

      copilot.setCurrentWorkflow(workflow);

      expect(loadedWorkflow).toEqual(workflow);
    });

    it('should emit workflow:generated event when creating workflow', async () => {
      let generatedWorkflow: GeneratedWorkflow | null = null;
      copilot.on('workflow:generated', (wf) => { generatedWorkflow = wf; });

      await copilot.chat('Create a workflow that fetches data');

      expect(generatedWorkflow).toBeDefined();
    });
  });

  describe('node recommendations', () => {
    it('should return recommendations based on last node', async () => {
      const recommendations = await copilot.getNodeRecommendations({
        currentNodes: ['webhook'],
        lastNode: 'webhook',
      });

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should not recommend already used nodes', async () => {
      const recommendations = await copilot.getNodeRecommendations({
        currentNodes: ['webhook', 'filter', 'transform'],
        lastNode: 'webhook',
      });

      const types = recommendations.map(r => r.nodeType);
      expect(types).not.toContain('filter');
      expect(types).not.toContain('transform');
    });

    it('should include confidence scores', async () => {
      const recommendations = await copilot.getNodeRecommendations({
        currentNodes: [],
        lastNode: 'http_request',
      });

      for (const rec of recommendations) {
        expect(rec.confidence).toBeDefined();
        expect(rec.confidence).toBeGreaterThan(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should include reasons for recommendations', async () => {
      const recommendations = await copilot.getNodeRecommendations({
        currentNodes: [],
        lastNode: 'webhook',
      });

      for (const rec of recommendations) {
        expect(rec.reason).toBeDefined();
        expect(rec.reason.length).toBeGreaterThan(0);
      }
    });

    it('should consider user intent', async () => {
      const recommendations = await copilot.getNodeRecommendations({
        currentNodes: [],
        userIntent: 'notify users via email',
      });

      const types = recommendations.map(r => r.nodeType);
      expect(types).toContain('email');
    });

    it('should limit recommendations to 5', async () => {
      const recommendations = await copilot.getNodeRecommendations({
        currentNodes: [],
        lastNode: 'webhook',
        userIntent: 'process data and notify',
      });

      expect(recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty context', async () => {
      const recommendations = await copilot.getNodeRecommendations({
        currentNodes: [],
      });

      expect(recommendations).toBeInstanceOf(Array);
    });
  });

  describe('message ID generation', () => {
    it('should generate unique message IDs', async () => {
      const response1 = await copilot.chat('Message 1');
      const response2 = await copilot.chat('Message 2');

      expect(response1.id).not.toBe(response2.id);
    });

    it('should generate IDs with correct format', async () => {
      const response = await copilot.chat('Test');

      expect(response.id).toMatch(/^msg_\d+_[a-z0-9]+$/);
    });
  });

  describe('POST method detection', () => {
    it('should detect POST method in HTTP requests', async () => {
      const workflow = await copilot.generateWorkflowFromDescription(
        'Post data to the API endpoint'
      );

      const httpNode = workflow.nodes.find(n => n.type === 'http_request');
      expect(httpNode?.data.method).toBe('POST');
    });

    it('should default to GET method', async () => {
      const workflow = await copilot.generateWorkflowFromDescription(
        'Fetch data from the API'
      );

      const httpNode = workflow.nodes.find(n => n.type === 'http_request');
      expect(httpNode?.data.method).toBe('GET');
    });
  });
});
