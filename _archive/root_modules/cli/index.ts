#!/usr/bin/env node

/**
 * Workflow Automation Platform CLI
 * Command-line interface for managing workflows
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import axios, { AxiosInstance } from 'axios';
import fs from 'fs/promises';
import path from 'path';

const program = new Command();
const version = '2.0.0';

interface WorkflowConfig {
  apiUrl: string;
  apiKey: string;
}

class WorkflowCLI {
  private client: AxiosInstance;
  private config: WorkflowConfig;

  constructor(config: WorkflowConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async listWorkflows(): Promise<void> {
    const spinner = ora('Fetching workflows...').start();
    try {
      const { data } = await this.client.get('/api/workflows');
      spinner.succeed('Workflows retrieved');

      console.log('\n' + chalk.bold('Available Workflows:'));
      data.workflows.forEach((wf: any) => {
        console.log(`  ${chalk.cyan(wf.id)} - ${wf.name} (${chalk.gray(wf.status)})`);
      });
    } catch (error: any) {
      spinner.fail('Failed to fetch workflows');
      console.error(chalk.red(error.message));
    }
  }

  async getWorkflow(id: string): Promise<void> {
    const spinner = ora(`Fetching workflow ${id}...`).start();
    try {
      const { data } = await this.client.get(`/api/workflows/${id}`);
      spinner.succeed('Workflow retrieved');

      console.log('\n' + chalk.bold('Workflow Details:'));
      console.log(`  ${chalk.cyan('ID:')} ${data.id}`);
      console.log(`  ${chalk.cyan('Name:')} ${data.name}`);
      console.log(`  ${chalk.cyan('Status:')} ${data.status}`);
      console.log(`  ${chalk.cyan('Nodes:')} ${data.nodes.length}`);
      console.log(`  ${chalk.cyan('Created:')} ${new Date(data.createdAt).toLocaleString()}`);
    } catch (error: any) {
      spinner.fail('Failed to fetch workflow');
      console.error(chalk.red(error.message));
    }
  }

  async executeWorkflow(id: string, data?: any): Promise<void> {
    const spinner = ora(`Executing workflow ${id}...`).start();
    try {
      const { data: result } = await this.client.post(`/api/workflows/${id}/execute`, {
        data: data || {}
      });
      spinner.succeed('Workflow executed successfully');

      console.log('\n' + chalk.bold('Execution Result:'));
      console.log(`  ${chalk.cyan('Execution ID:')} ${result.executionId}`);
      console.log(`  ${chalk.cyan('Status:')} ${result.status}`);
      console.log(`  ${chalk.cyan('Duration:')} ${result.duration}ms`);

      if (result.error) {
        console.log(chalk.red(`  Error: ${result.error}`));
      }
    } catch (error: any) {
      spinner.fail('Workflow execution failed');
      console.error(chalk.red(error.message));
    }
  }

  async exportWorkflow(id: string, outputPath: string): Promise<void> {
    const spinner = ora(`Exporting workflow ${id}...`).start();
    try {
      const { data } = await this.client.get(`/api/workflows/${id}/export`);
      await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
      spinner.succeed(`Workflow exported to ${outputPath}`);
    } catch (error: any) {
      spinner.fail('Failed to export workflow');
      console.error(chalk.red(error.message));
    }
  }

  async importWorkflow(filePath: string): Promise<void> {
    const spinner = ora(`Importing workflow from ${filePath}...`).start();
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const workflow = JSON.parse(content);
      const { data } = await this.client.post('/api/workflows/import', workflow);
      spinner.succeed(`Workflow imported with ID: ${data.id}`);
    } catch (error: any) {
      spinner.fail('Failed to import workflow');
      console.error(chalk.red(error.message));
    }
  }

  async deleteWorkflow(id: string): Promise<void> {
    const answers = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message: `Are you sure you want to delete workflow ${id}?`,
      default: false
    }]);

    if (!answers.confirmed) {
      console.log(chalk.yellow('Deletion cancelled'));
      return;
    }

    const spinner = ora(`Deleting workflow ${id}...`).start();
    try {
      await this.client.delete(`/api/workflows/${id}`);
      spinner.succeed('Workflow deleted');
    } catch (error: any) {
      spinner.fail('Failed to delete workflow');
      console.error(chalk.red(error.message));
    }
  }

  async listExecutions(workflowId?: string): Promise<void> {
    const spinner = ora('Fetching executions...').start();
    try {
      const url = workflowId
        ? `/api/workflows/${workflowId}/executions`
        : '/api/executions';
      const { data } = await this.client.get(url);
      spinner.succeed('Executions retrieved');

      console.log('\n' + chalk.bold('Recent Executions:'));
      data.executions.forEach((exec: any) => {
        const status = exec.status === 'success' ? chalk.green(exec.status) : chalk.red(exec.status);
        console.log(`  ${chalk.cyan(exec.id)} - ${status} (${exec.duration}ms) ${chalk.gray(new Date(exec.startedAt).toLocaleString())}`);
      });
    } catch (error: any) {
      spinner.fail('Failed to fetch executions');
      console.error(chalk.red(error.message));
    }
  }

  async validateWorkflow(filePath: string): Promise<void> {
    const spinner = ora(`Validating workflow ${filePath}...`).start();
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const workflow = JSON.parse(content);
      const { data } = await this.client.post('/api/workflows/validate', workflow);

      if (data.valid) {
        spinner.succeed('Workflow is valid');
      } else {
        spinner.fail('Workflow validation failed');
        console.log('\n' + chalk.bold('Validation Errors:'));
        data.errors.forEach((error: string) => {
          console.log(chalk.red(`  • ${error}`));
        });
      }
    } catch (error: any) {
      spinner.fail('Validation failed');
      console.error(chalk.red(error.message));
    }
  }
}

// Load configuration
async function loadConfig(): Promise<WorkflowConfig> {
  const configPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.workflow-cli.json');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.log(chalk.yellow('No configuration found. Run: workflow-cli config'));
    process.exit(1);
  }
}

// Configure CLI
program
  .name('workflow-cli')
  .description('CLI tool for Workflow Automation Platform')
  .version(version);

// Config command
program
  .command('config')
  .description('Configure CLI settings')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiUrl',
        message: 'API URL:',
        default: 'http://localhost:3001'
      },
      {
        type: 'password',
        name: 'apiKey',
        message: 'API Key:',
        mask: '*'
      }
    ]);

    const configPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.workflow-cli.json');
    await fs.writeFile(configPath, JSON.stringify(answers, null, 2));
    console.log(chalk.green('✓ Configuration saved'));
  });

// List workflows
program
  .command('list')
  .alias('ls')
  .description('List all workflows')
  .action(async () => {
    const config = await loadConfig();
    const cli = new WorkflowCLI(config);
    await cli.listWorkflows();
  });

// Get workflow
program
  .command('get <id>')
  .description('Get workflow details')
  .action(async (id: string) => {
    const config = await loadConfig();
    const cli = new WorkflowCLI(config);
    await cli.getWorkflow(id);
  });

// Execute workflow
program
  .command('execute <id>')
  .alias('exec')
  .description('Execute a workflow')
  .option('-d, --data <json>', 'Input data as JSON')
  .action(async (id: string, options: any) => {
    const config = await loadConfig();
    const cli = new WorkflowCLI(config);
    const data = options.data ? JSON.parse(options.data) : undefined;
    await cli.executeWorkflow(id, data);
  });

// Export workflow
program
  .command('export <id>')
  .description('Export workflow to file')
  .option('-o, --output <path>', 'Output file path', 'workflow.json')
  .action(async (id: string, options: any) => {
    const config = await loadConfig();
    const cli = new WorkflowCLI(config);
    await cli.exportWorkflow(id, options.output);
  });

// Import workflow
program
  .command('import <file>')
  .description('Import workflow from file')
  .action(async (file: string) => {
    const config = await loadConfig();
    const cli = new WorkflowCLI(config);
    await cli.importWorkflow(file);
  });

// Delete workflow
program
  .command('delete <id>')
  .alias('rm')
  .description('Delete a workflow')
  .action(async (id: string) => {
    const config = await loadConfig();
    const cli = new WorkflowCLI(config);
    await cli.deleteWorkflow(id);
  });

// List executions
program
  .command('executions [workflowId]')
  .description('List workflow executions')
  .action(async (workflowId?: string) => {
    const config = await loadConfig();
    const cli = new WorkflowCLI(config);
    await cli.listExecutions(workflowId);
  });

// Validate workflow
program
  .command('validate <file>')
  .description('Validate a workflow file')
  .action(async (file: string) => {
    const config = await loadConfig();
    const cli = new WorkflowCLI(config);
    await cli.validateWorkflow(file);
  });

// Parse arguments
program.parse();
