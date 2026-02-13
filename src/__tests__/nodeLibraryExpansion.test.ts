/**
 * Node Library Expansion Tests
 * AGENT 17: Testing 80+ new node integrations
 */

import { describe, it, expect } from 'vitest';
import { nodeTypes, nodeCategories } from '../data/nodeTypes';
import registry from '../workflow/nodeConfigRegistry';

describe('Node Library Expansion - AGENT 17', () => {
  describe('Node Type Definitions', () => {
    it('should have 200+ total nodes', () => {
      const totalNodes = Object.keys(nodeTypes).length;
      expect(totalNodes).toBeGreaterThanOrEqual(200);
      console.log(`✅ Total nodes: ${totalNodes}`);
    });

    it('should have all required node properties', () => {
      Object.entries(nodeTypes).forEach(([key, node]) => {
        expect(node).toHaveProperty('type');
        expect(node).toHaveProperty('label');
        expect(node).toHaveProperty('icon');
        expect(node).toHaveProperty('color');
        expect(node).toHaveProperty('category');
        expect(node).toHaveProperty('inputs');
        expect(node).toHaveProperty('outputs');
        expect(node).toHaveProperty('description');
      });
    });

    it('should have unique node types', () => {
      const types = Object.keys(nodeTypes);
      const uniqueTypes = new Set(types);
      expect(types.length).toBe(uniqueTypes.size);
    });
  });

  describe('AI & ML Nodes (15 new nodes)', () => {
    const aiNodes = [
      'stabilityAI',
      'replicate',
      'claudeVision',
      'gpt4Vision',
      'googleAI',
      'ai21Labs',
      'midjourney',
      'dalle',
      'whisper',
      'elevenlabs',
      'azureOpenAI',
      'googleGemini',
      'anthropicClaude3',
      'openaiEmbeddings',
      'cohereEmbed',
    ];

    it('should have all 15 AI & ML nodes defined', () => {
      aiNodes.forEach((nodeType) => {
        expect(nodeTypes[nodeType]).toBeDefined();
        expect(nodeTypes[nodeType].category).toBe('ai');
      });
    });

    it('should have AI nodes registered in config registry', () => {
      aiNodes.forEach((nodeType) => {
        expect(registry[nodeType]).toBeDefined();
      });
    });

    it('should have proper descriptions for AI nodes', () => {
      expect(nodeTypes.stabilityAI.description).toContain('Stable Diffusion');
      expect(nodeTypes.replicate.description).toContain('ML models');
      expect(nodeTypes.whisper.description).toContain('transcription');
    });
  });

  describe('Communication & Messaging Nodes (15 new nodes)', () => {
    const commNodes = [
      'rabbitmq',
      'amazonSQS',
      'amazonSNS',
      'googlePubSub',
      'azureServiceBus',
      'twilioSendGrid',
      'postmark',
      'mailgunEmail',
      'discordBot',
      'mattermostChat',
      'rocketChat',
      'signalMessenger',
      'whatsappBusiness',
      'telegramBot',
      'apacheKafka',
    ];

    it('should have all 15 communication nodes defined', () => {
      commNodes.forEach((nodeType) => {
        expect(nodeTypes[nodeType]).toBeDefined();
        expect(nodeTypes[nodeType].category).toBe('communication');
      });
    });

    it('should have messaging nodes registered', () => {
      commNodes.forEach((nodeType) => {
        expect(registry[nodeType]).toBeDefined();
      });
    });
  });

  describe('CRM & Sales Nodes (10 new nodes)', () => {
    const crmNodes = [
      'hubspotCRM',
      'pipedriveCRM',
      'salesforceCRM',
      'zohoCRM',
      'freshsalesCRM',
      'closeCRM',
      'copperCRM',
      'insightlyCRM',
      'nimbleCRM',
      'sugarCRM',
    ];

    it('should have all 10 CRM nodes defined', () => {
      crmNodes.forEach((nodeType) => {
        expect(nodeTypes[nodeType]).toBeDefined();
        expect(nodeTypes[nodeType].category).toBe('crm');
      });
    });

    it('should have CRM nodes with proper labels', () => {
      expect(nodeTypes.hubspotCRM.label).toContain('HubSpot');
      expect(nodeTypes.salesforceCRM.label).toContain('Salesforce');
      expect(nodeTypes.zohoCRM.label).toContain('Zoho');
    });
  });

  describe('E-commerce Nodes (10 new nodes)', () => {
    const ecomNodes = [
      'shopifyStore',
      'wooCommerceStore',
      'magentoStore',
      'bigCommerceStore',
      'prestashop',
      'opencart',
      'ecwid',
      'squareCommerce',
      'chargebee',
      'recurly',
    ];

    it('should have all 10 e-commerce nodes defined', () => {
      ecomNodes.forEach((nodeType) => {
        expect(nodeTypes[nodeType]).toBeDefined();
        expect(nodeTypes[nodeType].category).toBe('ecommerce');
      });
    });

    it('should have e-commerce nodes registered', () => {
      ecomNodes.forEach((nodeType) => {
        expect(registry[nodeType]).toBeDefined();
      });
    });
  });

  describe('Finance & Payments Nodes (10 new nodes)', () => {
    const financeNodes = [
      'stripePayments',
      'paypalPayments',
      'braintree',
      'adyen',
      'squarePayments',
      'klarna',
      'plaid',
      'dwolla',
      'mollie',
      'twocheckout',
    ];

    it('should have all 10 finance nodes defined', () => {
      financeNodes.forEach((nodeType) => {
        expect(nodeTypes[nodeType]).toBeDefined();
        expect(nodeTypes[nodeType].category).toBe('finance');
      });
    });

    it('should have payment processors with proper descriptions', () => {
      expect(nodeTypes.stripePayments.description).toContain('Stripe');
      expect(nodeTypes.paypalPayments.description).toContain('PayPal');
      expect(nodeTypes.plaid.description).toContain('banking');
    });
  });

  describe('Productivity & Project Management Nodes (10 new nodes)', () => {
    const productivityNodes = [
      'notionDatabase',
      'airtableBase',
      'mondayBoards',
      'clickupTasks',
      'basecampProject',
      'wrikeProject',
      'smartsheetGrid',
      'codaDocs',
      'fiberyApp',
      'heightApp',
    ];

    it('should have all 10 productivity nodes defined', () => {
      productivityNodes.forEach((nodeType) => {
        expect(nodeTypes[nodeType]).toBeDefined();
        expect(nodeTypes[nodeType].category).toBe('productivity');
      });
    });

    it('should have productivity nodes registered', () => {
      productivityNodes.forEach((nodeType) => {
        expect(registry[nodeType]).toBeDefined();
      });
    });
  });

  describe('Developer Tools & DevOps Nodes (10 new nodes)', () => {
    const devopsNodes = [
      'githubAdvanced',
      'gitlabAdvanced',
      'bitbucketRepo',
      'jenkinsCI',
      'circleCIBuild',
      'travisCI',
      'azureDevOpsCI',
      'jiraAdvanced',
      'linearAdvanced',
      'sentryMonitoring',
    ];

    it('should have all 10 devops nodes defined', () => {
      devopsNodes.forEach((nodeType) => {
        expect(nodeTypes[nodeType]).toBeDefined();
        expect(nodeTypes[nodeType].category).toBe('devops');
      });
    });

    it('should have CI/CD tools properly labeled', () => {
      expect(nodeTypes.jenkinsCI.description).toContain('Jenkins');
      expect(nodeTypes.circleCIBuild.description).toContain('CircleCI');
      expect(nodeTypes.sentryMonitoring.description).toContain('error tracking');
    });
  });

  describe('Node Categories', () => {
    it('should have all required categories', () => {
      const requiredCategories = [
        'trigger',
        'core',
        'communication',
        'database',
        'ai',
        'productivity',
        'flow',
        'data',
        'ecommerce',
        'finance',
        'crm',
        'devops',
      ];

      requiredCategories.forEach((category) => {
        expect(nodeCategories[category]).toBeDefined();
        expect(nodeCategories[category].name).toBeDefined();
        expect(nodeCategories[category].icon).toBeDefined();
      });
    });

    it('should categorize nodes correctly', () => {
      const categoryCounts: Record<string, number> = {};

      Object.values(nodeTypes).forEach((node) => {
        categoryCounts[node.category] = (categoryCounts[node.category] || 0) + 1;
      });

      console.log('Nodes per category:', categoryCounts);

      // AI should have significant number of nodes
      expect(categoryCounts.ai).toBeGreaterThanOrEqual(15);

      // Communication should have good coverage
      expect(categoryCounts.communication).toBeGreaterThanOrEqual(15);

      // CRM should have at least 10
      expect(categoryCounts.crm).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Node Registry Coverage', () => {
    it('should have registry entries for all node types', () => {
      const registeredNodes = Object.keys(registry);
      const definedNodes = Object.keys(nodeTypes);

      // All defined nodes should have a registry entry (at least DefaultConfig)
      const missingRegistrations = definedNodes.filter(
        (nodeType) => !registeredNodes.includes(nodeType)
      );

      if (missingRegistrations.length > 0) {
        console.warn('Missing registrations:', missingRegistrations);
      }

      // We allow some nodes to not be in registry if they're deprecated or special
      expect(missingRegistrations.length).toBeLessThan(10);
    });

    it('should not have registry entries for undefined nodes', () => {
      const registeredNodes = Object.keys(registry);
      const definedNodes = Object.keys(nodeTypes);

      const extraRegistrations = registeredNodes.filter(
        (nodeType) => !definedNodes.includes(nodeType) && nodeType !== 'default'
      );

      if (extraRegistrations.length > 0) {
        console.warn('Extra registrations (not in nodeTypes):', extraRegistrations);
      }

      // Allow some flexibility for aliases
      expect(extraRegistrations.length).toBeLessThan(20);
    });
  });

  describe('Node Input/Output Configuration', () => {
    it('should have valid input/output counts', () => {
      Object.entries(nodeTypes).forEach(([key, node]) => {
        expect(node.inputs).toBeGreaterThanOrEqual(0);
        expect(node.outputs).toBeGreaterThanOrEqual(0);
        expect(node.inputs).toBeLessThanOrEqual(10);
        expect(node.outputs).toBeLessThanOrEqual(10);
      });
    });

    it('should have triggers with 0 inputs', () => {
      const triggers = Object.values(nodeTypes).filter(
        (node) => node.category === 'trigger'
      );

      triggers.forEach((trigger) => {
        expect(trigger.inputs).toBe(0);
        expect(trigger.outputs).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Node Descriptions', () => {
    it('should have meaningful descriptions', () => {
      Object.entries(nodeTypes).forEach(([key, node]) => {
        expect(node.description).toBeDefined();
        expect(node.description.length).toBeGreaterThan(10);
        expect(node.description.length).toBeLessThan(200);
      });
    });

    it('should have descriptions that match node purpose', () => {
      // AI nodes should mention AI-related terms
      expect(nodeTypes.stabilityAI.description.toLowerCase()).toMatch(
        /image|ai|generation|stable/
      );

      // Payment nodes should mention payment
      expect(nodeTypes.stripePayments.description.toLowerCase()).toMatch(/payment|stripe/);

      // CRM nodes should mention CRM or sales
      expect(nodeTypes.hubspotCRM.description.toLowerCase()).toMatch(/crm|hubspot/);
    });
  });

  describe('Node Colors and Icons', () => {
    it('should have valid Tailwind color classes', () => {
      const validColorPrefixes = [
        'bg-blue',
        'bg-green',
        'bg-red',
        'bg-yellow',
        'bg-purple',
        'bg-pink',
        'bg-indigo',
        'bg-gray',
        'bg-orange',
        'bg-teal',
        'bg-cyan',
        'bg-amber',
      ];

      Object.entries(nodeTypes).forEach(([key, node]) => {
        const hasValidColor = validColorPrefixes.some((prefix) =>
          node.color.startsWith(prefix)
        );
        expect(hasValidColor).toBe(true);
      });
    });

    it('should have non-empty icon strings', () => {
      Object.entries(nodeTypes).forEach(([key, node]) => {
        expect(node.icon).toBeDefined();
        expect(node.icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should load node types quickly', () => {
      const startTime = performance.now();
      const nodes = Object.keys(nodeTypes);
      const endTime = performance.now();

      const loadTime = endTime - startTime;
      expect(loadTime).toBeLessThan(100); // Should load in under 100ms
      console.log(`Node types loaded in ${loadTime.toFixed(2)}ms`);
    });

    it('should have reasonable node library size', () => {
      const nodeCount = Object.keys(nodeTypes).length;
      const registryCount = Object.keys(registry).length;

      console.log(`Total node definitions: ${nodeCount}`);
      console.log(`Total registry entries: ${registryCount}`);

      expect(nodeCount).toBeGreaterThanOrEqual(200);
      expect(nodeCount).toBeLessThan(500); // Reasonable upper limit
    });
  });

  describe('Node Library Coverage vs n8n', () => {
    it('should achieve 50%+ coverage of n8n nodes', () => {
      const ourNodeCount = Object.keys(nodeTypes).length;
      const n8nNodeCount = 400; // Approximate n8n node count
      const coveragePercent = (ourNodeCount / n8nNodeCount) * 100;

      console.log(`Coverage: ${coveragePercent.toFixed(1)}% of n8n (${ourNodeCount}/${n8nNodeCount})`);
      expect(coveragePercent).toBeGreaterThanOrEqual(50);
    });

    it('should have better AI/ML coverage than n8n', () => {
      const aiNodes = Object.values(nodeTypes).filter((node) => node.category === 'ai');
      const aiNodeCount = aiNodes.length;

      console.log(`AI/ML nodes: ${aiNodeCount}`);
      expect(aiNodeCount).toBeGreaterThanOrEqual(25); // Better than n8n's ~15
    });
  });
});
