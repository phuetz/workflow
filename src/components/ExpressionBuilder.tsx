import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Code, Zap, Calendar, Hash, Type } from 'lucide-react';

export default function ExpressionBuilder() {
  const { darkMode, globalVariables } = useWorkflowStore();
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('data');

  const expressionCategories = {
    data: {
      name: 'Data',
      icon: <Hash size={16} />,
      functions: [
        { name: '$json', description: 'Current node data', example: '{{ $json.field }}' },
        { name: '$json("nodeName")', description: 'Data from specific node', example: '{{ $json("HTTP Request").data }}' },
        { name: '$input', description: 'Input data', example: '{{ $input.all() }}' },
        { name: '$items', description: 'All items', example: '{{ $items.length }}' },
        { name: '$item', description: 'Current item', example: '{{ $item(0).json }}' }
      ]
    },
    datetime: {
      name: 'Date & Time',
      icon: <Calendar size={16} />,
      functions: [
        { name: '$now', description: 'Current timestamp', example: '{{ $now }}' },
        { name: '$today', description: 'Today\'s date', example: '{{ $today }}' },
        { name: '$dateTime', description: 'Format date', example: '{{ $dateTime($now).format("YYYY-MM-DD") }}' },
        { name: '$timestamp', description: 'Unix timestamp', example: '{{ $timestamp }}' }
      ]
    },
    text: {
      name: 'Text',
      icon: <Type size={16} />,
      functions: [
        { name: '$length', description: 'String length', example: '{{ $length("hello") }}' },
        { name: '$upper', description: 'Uppercase', example: '{{ $upper("hello") }}' },
        { name: '$lower', description: 'Lowercase', example: '{{ $lower("HELLO") }}' },
        { name: '$substring', description: 'Extract substring', example: '{{ $substring("hello", 1, 3) }}' },
        { name: '$replace', description: 'Replace text', example: '{{ $replace("hello", "l", "x") }}' }
      ]
    },
    math: {
      name: 'Math',
      icon: <Hash size={16} />,
      functions: [
        { name: '$round', description: 'Round number', example: '{{ $round(3.14159, 2) }}' },
        { name: '$floor', description: 'Floor number', example: '{{ $floor(3.9) }}' },
        { name: '$ceil', description: 'Ceiling number', example: '{{ $ceil(3.1) }}' },
        { name: '$max', description: 'Maximum value', example: '{{ $max([1, 2, 3]) }}' },
        { name: '$min', description: 'Minimum value', example: '{{ $min([1, 2, 3]) }}' }
      ]
    },
    utility: {
      name: 'Utility',
      icon: <Zap size={16} />,
      functions: [
        { name: '$uuid', description: 'Generate UUID', example: '{{ $uuid }}' },
        { name: '$randomInt', description: 'Random integer', example: '{{ $randomInt(1, 100) }}' },
        { name: '$base64', description: 'Base64 encode', example: '{{ $base64("hello") }}' },
        { name: '$md5', description: 'MD5 hash', example: '{{ $md5("hello") }}' },
        { name: '$env', description: 'Environment variable', example: '{{ $env.API_KEY }}' }
      ]
    }
  };

  const evaluateExpression = () => {
    try {
      // Simulation d'évaluation d'expression
      const sampleData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        items: [1, 2, 3, 4, 5]
      };

      let evalResult = expression;
      
      // Remplacer les expressions simples
      evalResult = evalResult.replace(/\{\{\s*\$json\.(\w+)\s*\}\}/g, (match, field) => {
        return sampleData[field] || 'undefined';
      });
      
      evalResult = evalResult.replace(/\{\{\s*\$now\s*\}\}/g, new Date().toISOString());
      evalResult = evalResult.replace(/\{\{\s*\$today\s*\}\}/g, new Date().toISOString().split('T')[0]);
      evalResult = evalResult.replace(/\{\{\s*\$uuid\s*\}\}/g, 'uuid-' + Math.random().toString(36).substr(2, 9));
      evalResult = evalResult.replace(/\{\{\s*\$timestamp\s*\}\}/g, Date.now().toString());
      
      // Fonctions mathématiques
      evalResult = evalResult.replace(/\{\{\s*\$round\(([\d.]+),\s*(\d+)\)\s*\}\}/g, (match, num, digits) => {
        return parseFloat(num).toFixed(parseInt(digits));
      });
      
      // Fonctions de texte
      evalResult = evalResult.replace(/\{\{\s*\$upper\("([^"]+)"\)\s*\}\}/g, (match, text) => {
        return text.toUpperCase();
      });
      
      evalResult = evalResult.replace(/\{\{\s*\$lower\("([^"]+)"\)\s*\}\}/g, (match, text) => {
        return text.toLowerCase();
      });
      
      setResult(evalResult);
    } catch (error) {
      setResult('Error: ' + error.message);
    }
  };

  const insertExpression = (example: string) => {
    setExpression(prev => prev + example);
  };

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center space-x-3 mb-6">
          <Code className="text-purple-500" size={24} />
          <h1 className="text-2xl font-bold">Expression Builder</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-4`}>
            <h2 className="font-semibold mb-4">Function Categories</h2>
            <div className="space-y-2">
              {Object.entries(expressionCategories).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                    selectedCategory === key
                      ? 'bg-blue-500 text-white'
                      : darkMode 
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-200'
                  }`}
                >
                  {category.icon}
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Functions */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-4`}>
            <h2 className="font-semibold mb-4">
              {expressionCategories[selectedCategory].name} Functions
            </h2>
            <div className="space-y-3">
              {expressionCategories[selectedCategory].functions.map((func, index) => (
                <div key={index} className={`p-3 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <code className="font-mono text-sm font-bold text-purple-500">
                      {func.name}
                    </code>
                    <button
                      onClick={() => insertExpression(func.example)}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    >
                      Insert
                    </button>
                  </div>
                  <p className="text-sm opacity-75 mb-2">{func.description}</p>
                  <code className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    {func.example}
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* Expression Editor */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-4`}>
            <h2 className="font-semibold mb-4">Test Expression</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Expression</label>
                <textarea
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  className={`w-full h-32 p-3 rounded-lg border font-mono text-sm ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300'
                  }`}
                  placeholder="Enter your expression here..."
                />
              </div>

              <button
                onClick={evaluateExpression}
                className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
              >
                Evaluate Expression
              </button>

              {result && (
                <div>
                  <label className="block text-sm font-medium mb-2">Result</label>
                  <div className={`p-3 rounded-lg border ${
                    result.startsWith('Error:') 
                      ? 'border-red-500 bg-red-50 text-red-700' 
                      : darkMode 
                        ? 'border-gray-600 bg-gray-700' 
                        : 'border-gray-300 bg-gray-50'
                  }`}>
                    <code className="font-mono text-sm">{result}</code>
                  </div>
                </div>
              )}

              {/* Global Variables */}
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Global Variables</h3>
                <div className="space-y-2">
                  {Object.entries(globalVariables).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                      <code className="font-mono text-sm">${key}</code>
                      <span className="text-sm">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}