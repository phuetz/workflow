/**
 * API CLI Tab Component
 * Displays CLI installation and usage instructions
 */

import React from 'react';
import { Copy } from 'lucide-react';
import type { CLICommand } from './types';

interface APICLITabProps {
  darkMode: boolean;
  onCopy: (text: string) => void;
}

const CLI_COMMANDS: CLICommand[] = [
  { command: 'wfb workflows list', description: 'List all workflows' },
  { command: 'wfb workflows get <id>', description: 'Get workflow details' },
  { command: 'wfb workflows execute <id>', description: 'Execute a workflow' },
  { command: 'wfb executions list', description: 'List workflow executions' },
  { command: 'wfb executions logs <id>', description: 'View execution logs' }
];

export function APICLITab({ darkMode, onCopy }: APICLITabProps) {
  return (
    <div className="space-y-6">
      <div
        className={`${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } rounded-lg border p-6`}
      >
        <h2
          className={`text-xl font-semibold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          Command Line Interface
        </h2>
        <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Use our CLI tool to interact with workflows from your terminal.
        </p>

        {/* Installation */}
        <InstallationSection darkMode={darkMode} onCopy={onCopy} />

        {/* Authentication */}
        <AuthenticationSection darkMode={darkMode} />

        {/* Common Commands */}
        <CommonCommandsSection
          darkMode={darkMode}
          commands={CLI_COMMANDS}
          onCopy={onCopy}
        />
      </div>
    </div>
  );
}

interface InstallationSectionProps {
  darkMode: boolean;
  onCopy: (text: string) => void;
}

function InstallationSection({ darkMode, onCopy }: InstallationSectionProps) {
  const installCode = `# Install via npm
npm install -g @workflowbuilder/cli

# Or download binary
curl -L https://github.com/workflowbuilder/cli/releases/latest/download/wfb-cli -o wfb
chmod +x wfb`;

  return (
    <div className="mb-6">
      <h3
        className={`font-medium mb-3 ${
          darkMode ? 'text-gray-300' : 'text-gray-700'
        }`}
      >
        Installation
      </h3>
      <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4`}>
        <pre className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {installCode}
        </pre>
        <button
          onClick={() => onCopy('npm install -g @workflowbuilder/cli')}
          className="mt-2 text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Copy Install Command
        </button>
      </div>
    </div>
  );
}

interface AuthenticationSectionProps {
  darkMode: boolean;
}

function AuthenticationSection({ darkMode }: AuthenticationSectionProps) {
  const authCode = `# Set your API key
wfb auth set-key your_api_key_here

# Or set via environment variable
export WFB_API_KEY=your_api_key_here`;

  return (
    <div className="mb-6">
      <h3
        className={`font-medium mb-3 ${
          darkMode ? 'text-gray-300' : 'text-gray-700'
        }`}
      >
        Authentication
      </h3>
      <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-4`}>
        <pre className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {authCode}
        </pre>
      </div>
    </div>
  );
}

interface CommonCommandsSectionProps {
  darkMode: boolean;
  commands: CLICommand[];
  onCopy: (text: string) => void;
}

function CommonCommandsSection({
  darkMode,
  commands,
  onCopy
}: CommonCommandsSectionProps) {
  return (
    <div>
      <h3
        className={`font-medium mb-3 ${
          darkMode ? 'text-gray-300' : 'text-gray-700'
        }`}
      >
        Common Commands
      </h3>
      <div className="space-y-3">
        {commands.map((cmd, index) => (
          <div
            key={index}
            className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg p-3`}
          >
            <div className="flex items-center justify-between">
              <div>
                <code
                  className={`text-sm font-mono ${
                    darkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}
                >
                  {cmd.command}
                </code>
                <p
                  className={`text-xs mt-1 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {cmd.description}
                </p>
              </div>
              <button
                onClick={() => onCopy(cmd.command)}
                className={`p-1 rounded ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                } transition-colors`}
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
