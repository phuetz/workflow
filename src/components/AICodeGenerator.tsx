import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Code, Sparkles, Play, Copy, Download, Settings, Zap, Brain } from 'lucide-react';

interface CodeTemplate {
  id: string;
  name: string;
  language: 'javascript' | 'python';
  category: string;
  description: string;
  template: string;
  complexity: 'simple' | 'intermediate' | 'advanced';
}

export default function AICodeGenerator() {
  const { darkMode, addLog } = useWorkflowStore();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState<'javascript' | 'python'>('javascript');
  const [complexity, setComplexity] = useState<'simple' | 'intermediate' | 'advanced'>('intermediate');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const codeTemplates: CodeTemplate[] = [
    {
      id: 'data-transform',
      name: 'Data Transformation',
      language: 'javascript',
      category: 'Data Processing',
      description: 'Transform and validate input data with error handling',
      complexity: 'intermediate',
      template: `// AI-Generated Data Transformation
function transformData(inputData) {
  try {
    // Validate input
    if (!inputData || typeof inputData !== 'object') {
      throw new Error('Invalid input data');
    }
    
    // Transform data structure
    const transformed = {
      id: inputData.id || generateId(),
      name: inputData.name?.trim() || 'Unknown',
      email: validateEmail(inputData.email),
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'ai-generated',
        version: '1.0'
      }
    };
    
    return transformed;
  } catch (error) {
    console.error('Transformation error:', error);
    return { error: error.message };
  }
}`
    },
    {
      id: 'api-request',
      name: 'API Request Handler',
      language: 'javascript',
      category: 'HTTP',
      description: 'Robust API request with retry logic and error handling',
      complexity: 'advanced',
      template: `// AI-Generated API Request Handler
async function apiRequest(url, options = {}) {
  const maxRetries = 3;
  const retryDelay = 1000;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Workflow-Builder/1.0',
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        timeout: options.timeout || 30000
      });
      
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }
      
      const data = await response.json();
      return { success: true, data, status: response.status };
      
    } catch (error) {
      console.warn(\`Attempt \${attempt + 1} failed:\`, error.message);
      
      if (attempt === maxRetries - 1) {
        return { success: false, error: error.message };
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }
}`
    },
    {
      id: 'data-analysis',
      name: 'Data Analysis',
      language: 'python',
      category: 'Analytics',
      description: 'Statistical analysis and data visualization',
      complexity: 'advanced',
      template: `# AI-Generated Data Analysis
import pandas as pd
import numpy as np
from datetime import datetime

def analyze_data(data):
    """Comprehensive data analysis with statistics and insights"""
    try:
        # Convert to DataFrame
        df = pd.DataFrame(data)
        
        # Basic statistics
        stats = {
            'total_records': len(df),
            'missing_values': df.isnull().sum().to_dict(),
            'data_types': df.dtypes.to_dict(),
            'memory_usage': df.memory_usage().sum()
        }
        
        # Numerical analysis
        numerical_cols = df.select_dtypes(include=[np.number]).columns
        if len(numerical_cols) > 0:
            stats['numerical_summary'] = df[numerical_cols].describe().to_dict()
        
        # Categorical analysis
        categorical_cols = df.select_dtypes(include=['object']).columns
        if len(categorical_cols) > 0:
            stats['categorical_summary'] = {
                col: df[col].value_counts().head().to_dict()
                for col in categorical_cols
            }
        
        # Generate insights
        insights = generate_insights(df, stats)
        
        return {
            'success': True,
            'statistics': stats,
            'insights': insights,
            'processed_at': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

def generate_insights(df, stats):
    """Generate actionable insights from data"""
    insights = []
    
    # Check for data quality issues
    if any(stats['missing_values'].values()):
        insights.append('Data quality: Missing values detected')
    
    # Check for outliers in numerical data
    numerical_cols = df.select_dtypes(include=[np.number]).columns
    for col in numerical_cols:
        q75, q25 = np.percentile(df[col].dropna(), [75, 25])
        iqr = q75 - q25
        if iqr > 0:
            outliers = len(df[(df[col] < q25 - 1.5*iqr) | (df[col] > q75 + 1.5*iqr)])
            if outliers > 0:
                insights.append(f'Outliers detected in {col}: {outliers} records')
    
    return insights`
    }
  ];

  const generateCode = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    
    try {
      // Simulate AI code generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const codePrompts = {
        'data validation': `// AI-Generated Data Validation
function validateData(data) {
  const errors = [];
  
  // Email validation
  if (data.email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }
  
  // Required fields
  const required = ['name', 'email'];
  required.forEach(field => {
    if (!data[field]) errors.push(\`\${field} is required\`);
  });
  
  return { isValid: errors.length === 0, errors };
}`,
        'api call': `// AI-Generated API Call
async function makeApiCall(endpoint, data) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.API_TOKEN
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(\`API Error: \${response.status}\`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}`,
        'transform data': `// AI-Generated Data Transformation
function transformData(inputData) {
  return inputData.map(item => ({
    id: item.id,
    fullName: \`\${item.firstName} \${item.lastName}\`,
    email: item.email.toLowerCase(),
    createdAt: new Date().toISOString(),
    isActive: item.status === 'active'
  }));
}`,
        'error handling': `// AI-Generated Error Handling
function withErrorHandling(fn) {
  return async (...args) => {
    try {
      const result = await fn(...args);
      return { success: true, data: result };
    } catch (error) {
      console.error('Operation failed:', error);
      return { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  };
}`
      };
      
      // Find matching code or generate generic
      let code = '';
      const promptLower = prompt.toLowerCase();
      
      for (const [key, value] of Object.entries(codePrompts)) {
        if (promptLower.includes(key)) {
          code = value;
          break;
        }
      }
      
      // Generic code generation based on language
      if (!code) {
        if (language === 'python') {
          code = `# AI-Generated Python Code for: ${prompt}
def process_data(data):
    """
    Generated function based on: ${prompt}
    """
    try:
        # Process the data according to requirements
        result = {
            'input': data,
            'processed_at': datetime.now().isoformat(),
            'status': 'success'
        }
        
        # Add your custom logic here
        # ...
        
        return result
    except Exception as e:
        return {'error': str(e), 'status': 'failed'}`;
        } else {
          code = `// AI-Generated JavaScript Code for: ${prompt}
function processData(data) {
  try {
    // Generated logic based on: ${prompt}
    const result = {
      input: data,
      processedAt: new Date().toISOString(),
      status: 'success'
    };
    
    // Add your custom logic here
    // ...
    
    return result;
  } catch (error) {
    return { error: error.message, status: 'failed' };
  }
}`;
        }
      }
      
      setGeneratedCode(code);
      
      addLog({
        level: 'info',
        message: 'Code généré par IA avec succès',
        data: { prompt, language, linesOfCode: code.split('\n').length }
      });
      
    } catch (error) {
      addLog({
        level: 'error',
        message: 'Erreur lors de la génération de code',
        data: { error: error.message }
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    showNotification('Code copié dans le presse-papiers !', 'success');
  };

  const downloadCode = () => {
    const extension = language === 'python' ? 'py' : 'js';
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-generated-code.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white font-medium ${
      type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  };

  return (
    <>
      {/* AI Code Generator Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-68 left-4 z-40 px-4 py-2 rounded-lg ${
          darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'
        } text-white shadow-lg flex items-center space-x-2 transition-all hover:scale-105`}
      >
        <Brain size={16} />
        <span>AI Code Generator</span>
      </button>

      {/* AI Code Generator Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Brain className="text-purple-500" size={24} />
                <h2 className="text-xl font-bold">AI Code Generator</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Panel - Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Décrivez le code que vous voulez générer
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ex: Créer une fonction de validation d'email avec regex"
                    className={`w-full px-3 py-2 border rounded-md h-24 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Langage</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className={`w-full px-3 py-2 border rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Complexité</label>
                    <select
                      value={complexity}
                      onChange={(e) => setComplexity(e.target.value as any)}
                      className={`w-full px-3 py-2 border rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="simple">Simple</option>
                      <option value="intermediate">Intermédiaire</option>
                      <option value="advanced">Avancé</option>
                    </select>
                  </div>
                </div>

                {/* Templates */}
                <div>
                  <label className="block text-sm font-medium mb-2">Templates populaires</label>
                  <div className="grid grid-cols-1 gap-2">
                    {codeTemplates
                      .filter(t => t.language === language)
                      .map(template => (
                        <button
                          key={template.id}
                          onClick={() => {
                            setPrompt(template.description);
                            setSelectedTemplate(template.id);
                          }}
                          className={`p-3 text-left rounded border transition-colors ${
                            selectedTemplate === template.id
                              ? 'border-purple-500 bg-purple-50'
                              : darkMode 
                                ? 'border-gray-600 hover:border-gray-500' 
                                : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-gray-500">{template.category}</div>
                        </button>
                      ))}
                  </div>
                </div>

                <button
                  onClick={generateCode}
                  disabled={!prompt.trim() || isGenerating}
                  className="w-full bg-purple-500 text-white py-3 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Génération en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Générer le Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Panel - Output */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Code Généré</h3>
                  {generatedCode && (
                    <div className="flex space-x-2">
                      <button
                        onClick={copyCode}
                        className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        title="Copier"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={downloadCode}
                        className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                        title="Télécharger"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {generatedCode ? (
                  <div className={`border rounded-lg ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <div className={`px-3 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b rounded-t-lg flex items-center justify-between`}>
                      <span className="text-sm font-medium">
                        {language === 'python' ? 'Python' : 'JavaScript'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {generatedCode.split('\n').length} lignes
                      </span>
                    </div>
                    <pre className="p-4 overflow-x-auto text-sm">
                      <code className={language === 'python' ? 'language-python' : 'language-javascript'}>
                        {generatedCode}
                      </code>
                    </pre>
                  </div>
                ) : (
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    darkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}>
                    <Code size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">Le code généré apparaîtra ici</p>
                  </div>
                )}

                {/* AI Info */}
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                  <h4 className="font-medium mb-2 flex items-center">
                    <Zap className="mr-2 text-blue-500" size={16} />
                    IA Code Generator
                  </h4>
                  <div className="text-sm space-y-1 text-gray-600">
                    <p>✅ <strong>Génération intelligente</strong> : Analyse le contexte et les meilleures pratiques</p>
                    <p>✅ <strong>Error handling</strong> : Gestion d'erreur intégrée automatiquement</p>
                    <p>✅ <strong>Code optimisé</strong> : Performance et lisibilité optimisées</p>
                    <p>✅ <strong>Documentation</strong> : Commentaires explicatifs inclus</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}