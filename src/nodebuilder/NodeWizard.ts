/**
 * Node Wizard
 * Guided node creation with 7-step wizard
 */

import {
  WizardStep,
  WizardStepType,
  WizardData,
  NodeCategory,
  AuthType,
  FieldType,
  HttpMethod,
  BodyType,
} from '../types/nodebuilder';
import { NodeBuilder } from './NodeBuilder';

export class NodeWizard {
  private steps: WizardStep[];
  private currentStep: number = 0;
  private data: WizardData = {};

  constructor() {
    this.steps = this.initializeSteps();
  }

  /**
   * Initialize wizard steps
   */
  private initializeSteps(): WizardStep[] {
    return [
      {
        id: 'basic_info',
        title: 'Basic Information',
        description: 'Enter basic details about your custom node',
        component: WizardStepType.BASIC_INFO,
        validation: (data) => {
          const basic = data.basicInfo;
          return !!(
            basic?.name &&
            basic?.displayName &&
            basic?.description &&
            basic?.category
          );
        },
      },
      {
        id: 'authentication',
        title: 'Authentication',
        description: 'Configure how your node authenticates with the API',
        component: WizardStepType.AUTHENTICATION,
        optional: true,
        validation: (data) => {
          if (!data.authentication) return true;
          return !!(data.authentication.type && data.authentication.fields);
        },
      },
      {
        id: 'operations',
        title: 'Operations',
        description: 'Define the operations your node will support',
        component: WizardStepType.OPERATIONS,
        validation: (data) => {
          return !!(data.operations && data.operations.length > 0);
        },
      },
      {
        id: 'parameters',
        title: 'Parameters',
        description: 'Add input parameters for your node',
        component: WizardStepType.PARAMETERS,
        optional: true,
        validation: () => true, // Parameters are optional
      },
      {
        id: 'data_mapping',
        title: 'Data Mapping',
        description: 'Configure input/output data mapping',
        component: WizardStepType.DATA_MAPPING,
        optional: true,
        validation: () => true, // Data mapping is optional
      },
      {
        id: 'testing',
        title: 'Testing',
        description: 'Configure test cases for your node',
        component: WizardStepType.TESTING,
        optional: true,
        validation: () => true, // Testing is optional
      },
      {
        id: 'review',
        title: 'Review & Generate',
        description: 'Review your configuration and generate the node',
        component: WizardStepType.REVIEW,
        validation: () => true,
      },
    ];
  }

  /**
   * Get current step
   */
  getCurrentStep(): WizardStep {
    return this.steps[this.currentStep];
  }

  /**
   * Get all steps
   */
  getSteps(): WizardStep[] {
    return this.steps;
  }

  /**
   * Get current step index
   */
  getCurrentStepIndex(): number {
    return this.currentStep;
  }

  /**
   * Get total steps
   */
  getTotalSteps(): number {
    return this.steps.length;
  }

  /**
   * Get wizard data
   */
  getData(): WizardData {
    return this.data;
  }

  /**
   * Update wizard data
   */
  updateData(updates: Partial<WizardData>): void {
    this.data = { ...this.data, ...updates };
  }

  /**
   * Validate current step
   */
  validateCurrentStep(): boolean {
    const step = this.getCurrentStep();
    if (step.optional) return true;
    if (!step.validation) return true;
    return step.validation(this.data);
  }

  /**
   * Move to next step
   */
  nextStep(): boolean {
    if (!this.validateCurrentStep()) {
      return false;
    }

    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      return true;
    }

    return false;
  }

  /**
   * Move to previous step
   */
  previousStep(): boolean {
    if (this.currentStep > 0) {
      this.currentStep--;
      return true;
    }
    return false;
  }

  /**
   * Go to specific step
   */
  goToStep(stepIndex: number): boolean {
    if (stepIndex >= 0 && stepIndex < this.steps.length) {
      this.currentStep = stepIndex;
      return true;
    }
    return false;
  }

  /**
   * Check if wizard is complete
   */
  isComplete(): boolean {
    return this.currentStep === this.steps.length - 1 && this.validateAll();
  }

  /**
   * Validate all required steps
   */
  validateAll(): boolean {
    return this.steps.every((step) => {
      if (step.optional) return true;
      if (!step.validation) return true;
      return step.validation(this.data);
    });
  }

  /**
   * Get validation errors
   */
  getValidationErrors(): string[] {
    const errors: string[] = [];

    this.steps.forEach((step) => {
      if (step.optional) return;
      if (!step.validation) return;
      if (!step.validation(this.data)) {
        errors.push(`${step.title}: Incomplete or invalid data`);
      }
    });

    return errors;
  }

  /**
   * Reset wizard
   */
  reset(): void {
    this.currentStep = 0;
    this.data = {};
  }

  /**
   * Generate node from wizard data
   */
  async generateNode(): Promise<NodeBuilder> {
    if (!this.validateAll()) {
      throw new Error('Cannot generate node: validation failed');
    }

    const builder = new NodeBuilder();

    // Set basic info
    if (this.data.basicInfo) {
      builder.setBasicInfo({
        name: this.data.basicInfo.name,
        displayName: this.data.basicInfo.displayName,
        description: this.data.basicInfo.description,
        category: this.data.basicInfo.category,
        icon: this.data.basicInfo.icon || 'Box',
        color: this.data.basicInfo.color || 'bg-gray-500',
      });
    }

    // Set authentication
    if (this.data.authentication) {
      builder.setAuthentication(this.data.authentication);
    }

    // Add operations
    if (this.data.operations) {
      this.data.operations.forEach((op) => builder.addOperation(op));
    }

    // Add parameters
    if (this.data.parameters) {
      this.data.parameters.forEach((param) => builder.addParameter(param));
    }

    // Set generation settings
    if (this.data.generationSettings) {
      builder.setGenerationSettings(this.data.generationSettings);
    }

    return builder;
  }

  /**
   * Export wizard state
   */
  exportState(): string {
    return JSON.stringify({
      currentStep: this.currentStep,
      data: this.data,
    });
  }

  /**
   * Import wizard state
   */
  importState(state: string): void {
    try {
      const parsed = JSON.parse(state);
      this.currentStep = parsed.currentStep || 0;
      this.data = parsed.data || {};
    } catch (error) {
      throw new Error(`Failed to import wizard state: ${error}`);
    }
  }

  /**
   * Get progress percentage
   */
  getProgress(): number {
    const validatedSteps = this.steps.filter((step, index) => {
      if (index > this.currentStep) return false;
      if (step.optional) return true;
      if (!step.validation) return true;
      return step.validation(this.data);
    }).length;

    return (validatedSteps / this.steps.length) * 100;
  }

  /**
   * Quick start templates
   */
  static getQuickStartTemplates(): Array<{
    name: string;
    description: string;
    data: Partial<WizardData>;
  }> {
    return [
      {
        name: 'REST API',
        description: 'Create a REST API integration',
        data: {
          basicInfo: {
            name: 'my_api',
            displayName: 'My API',
            description: 'Custom REST API integration',
            category: NodeCategory.ACTION,
            icon: 'Globe',
            color: 'bg-blue-500',
          },
          authentication: {
            type: AuthType.API_KEY,
            name: 'API Key',
            description: 'API Key authentication',
            fields: [
              {
                name: 'apiKey',
                displayName: 'API Key',
                type: FieldType.PASSWORD,
                required: true,
                description: 'Your API key',
                placeholder: 'Enter your API key',
                headerName: 'X-API-Key',
              },
            ],
          },
        },
      },
      {
        name: 'Webhook',
        description: 'Create a webhook trigger',
        data: {
          basicInfo: {
            name: 'my_webhook',
            displayName: 'My Webhook',
            description: 'Custom webhook trigger',
            category: NodeCategory.TRIGGER,
            icon: 'Webhook',
            color: 'bg-green-500',
          },
        },
      },
      {
        name: 'Database',
        description: 'Create a database integration',
        data: {
          basicInfo: {
            name: 'my_database',
            displayName: 'My Database',
            description: 'Custom database integration',
            category: NodeCategory.DATABASE,
            icon: 'Database',
            color: 'bg-purple-500',
          },
        },
      },
    ];
  }

  /**
   * Load quick start template
   */
  loadTemplate(templateName: string): void {
    const templates = NodeWizard.getQuickStartTemplates();
    const template = templates.find((t) => t.name === templateName);

    if (template) {
      this.data = { ...template.data };
    }
  }
}
