/**
 * Submit Node Form Component
 * Form for submitting a new community node
 */

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { getThemeClasses } from './utils';

interface SubmitNodeFormProps {
  darkMode: boolean;
}

const REQUIREMENTS = [
  'Your node must be published to a public Git repository',
  'Include comprehensive documentation and examples',
  'Follow our node development guidelines',
  'Pass security and code quality checks'
];

const STEPS = [
  {
    title: '1. Use our Node SDK',
    content: `npm install -g @workflowbuilder/node-sdk
wfb-node create my-awesome-node`,
    isCode: true
  },
  {
    title: '2. Develop and Test',
    content: 'Build your node functionality and test it thoroughly with different scenarios.',
    isCode: false
  },
  {
    title: '3. Submit for Review',
    content: 'Push your code to a public repository and submit it through our developer portal.',
    isCode: false
  }
];

function SubmitNodeForm({ darkMode }: SubmitNodeFormProps) {
  const theme = getThemeClasses(darkMode);

  return (
    <div className={`${theme.bg} ${theme.border} rounded-lg border p-6`}>
      <h2 className={`text-xl font-semibold mb-4 ${theme.text}`}>
        Submit Your Node
      </h2>
      <p className={`mb-6 ${theme.textSecondary}`}>
        Share your custom node with the community and help others build better workflows.
      </p>

      <div className="space-y-6">
        {/* Requirements */}
        <div>
          <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Requirements
          </h3>
          <ul className={`space-y-2 ${theme.textSecondary}`}>
            {REQUIREMENTS.map((req, index) => (
              <li key={index} className="flex items-start space-x-2">
                <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Getting Started */}
        <div>
          <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Getting Started
          </h3>
          <div className="space-y-3">
            {STEPS.map((step, index) => (
              <div key={index} className={`${theme.bgSecondary} rounded-lg p-4`}>
                <h4 className={`font-medium mb-2 ${theme.text}`}>
                  {step.title}
                </h4>
                {step.isCode ? (
                  <pre className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} overflow-x-auto`}>
                    {step.content}
                  </pre>
                ) : (
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {step.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            Read Developer Guide
          </button>
          <button className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            darkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}>
            View Examples
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubmitNodeForm;
