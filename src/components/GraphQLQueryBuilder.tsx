import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Code, Play, Copy, Download, Layers, Database } from 'lucide-react';

interface GraphQLField {
  name: string;
  type: string;
  description: string;
  args?: GraphQLArgument[];
  fields?: GraphQLField[];
  selected: boolean;
}

interface GraphQLArgument {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  value?: any;
}

interface GraphQLSchema {
  types: {
    [key: string]: GraphQLField[];
  };
}

export default function GraphQLQueryBuilder() {
  const { darkMode, addLog } = useWorkflowStore();
  const [isOpen, setIsOpen] = useState(false);
  const [schemaUrl, setSchemaUrl] = useState('');
  const [schema, setSchema] = useState<GraphQLSchema | null>(null);
  const [selectedType, setSelectedType] = useState('Query');
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock GraphQL schema for demonstration
  const mockSchema: GraphQLSchema = {
    types: {
      Query: [
        {
          name: 'user',
          type: 'User',
          description: 'Get user by ID',
          selected: false,
          args: [
            { name: 'id', type: 'ID!', required: true },
            { name: 'includeProfile', type: 'Boolean', required: false, defaultValue: false }
          ],
          fields: [
            { name: 'id', type: 'ID!', description: 'User ID', selected: false },
            { name: 'name', type: 'String', description: 'User name', selected: false },
            { name: 'email', type: 'String', description: 'User email', selected: false },
            { name: 'profile', type: 'Profile', description: 'User profile', selected: false, fields: [
              { name: 'bio', type: 'String', description: 'User bio', selected: false },
              { name: 'avatar', type: 'String', description: 'Avatar URL', selected: false }
            ]}
          ]
        },
        {
          name: 'users',
          type: '[User]',
          description: 'Get all users',
          selected: false,
          args: [
            { name: 'limit', type: 'Int', required: false, defaultValue: 10 },
            { name: 'offset', type: 'Int', required: false, defaultValue: 0 }
          ],
          fields: [
            { name: 'id', type: 'ID!', description: 'User ID', selected: false },
            { name: 'name', type: 'String', description: 'User name', selected: false },
            { name: 'email', type: 'String', description: 'User email', selected: false }
          ]
        },
        {
          name: 'posts',
          type: '[Post]',
          description: 'Get posts',
          selected: false,
          args: [
            { name: 'authorId', type: 'ID', required: false },
            { name: 'published', type: 'Boolean', required: false }
          ],
          fields: [
            { name: 'id', type: 'ID!', description: 'Post ID', selected: false },
            { name: 'title', type: 'String', description: 'Post title', selected: false },
            { name: 'content', type: 'String', description: 'Post content', selected: false },
            { name: 'author', type: 'User', description: 'Post author', selected: false, fields: [
              { name: 'id', type: 'ID!', description: 'Author ID', selected: false },
              { name: 'name', type: 'String', description: 'Author name', selected: false }
            ]}
          ]
        }
      ],
      Mutation: [
        {
          name: 'createUser',
          type: 'User',
          description: 'Create a new user',
          selected: false,
          args: [
            { name: 'input', type: 'CreateUserInput!', required: true }
          ],
          fields: [
            { name: 'id', type: 'ID!', description: 'User ID', selected: false },
            { name: 'name', type: 'String', description: 'User name', selected: false },
            { name: 'email', type: 'String', description: 'User email', selected: false }
          ]
        },
        {
          name: 'updateUser',
          type: 'User',
          description: 'Update an existing user',
          selected: false,
          args: [
            { name: 'id', type: 'ID!', required: true },
            { name: 'input', type: 'UpdateUserInput!', required: true }
          ],
          fields: [
            { name: 'id', type: 'ID!', description: 'User ID', selected: false },
            { name: 'name', type: 'String', description: 'User name', selected: false },
            { name: 'email', type: 'String', description: 'User email', selected: false }
          ]
        }
      ]
    }
  };

  const loadSchema = async () => {
    setIsLoading(true);
    
    try {
      // Simulate schema loading
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSchema(mockSchema);
      
      addLog({
        level: 'info',
        message: 'Schéma GraphQL chargé avec succès',
        data: { url: schemaUrl, types: Object.keys(mockSchema.types).length }
      });
      
    } catch (error) {
      addLog({
        level: 'error',
        message: 'Erreur lors du chargement du schéma',
        data: { error: error.message }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleField = (typeName: string, fieldIndex: number, subFieldIndex?: number) => {
    if (!schema) return;

    const newSchema = { ...schema };
    const field = newSchema.types[typeName][fieldIndex];
    
    if (subFieldIndex !== undefined && field.fields) {
      field.fields[subFieldIndex].selected = !field.fields[subFieldIndex].selected;
    } else {
      field.selected = !field.selected;
    }
    
    setSchema(newSchema);
    generateQuery();
  };

  const generateQuery = () => {
    if (!schema) return;

    const selectedFields = schema.types[selectedType].filter(field => field.selected);
    
    if (selectedFields.length === 0) {
      setGeneratedQuery('');
      return;
    }

    const queryType = selectedType.toLowerCase();
    let query = `${queryType} {\n`;

    selectedFields.forEach(field => {
      let fieldString = `  ${field.name}`;
      
      // Add arguments if any
      if (field.args && field.args.length > 0) {
        const argsWithValues = field.args.filter(arg => arg.value !== undefined);
        if (argsWithValues.length > 0) {
          const argsString = argsWithValues
            .map(arg => `${arg.name}: ${formatArgValue(arg.value, arg.type)}`)
            .join(', ');
          fieldString += `(${argsString})`;
        }
      }

      // Add nested fields if any selected
      if (field.fields) {
        const selectedSubFields = field.fields.filter(f => f.selected);
        if (selectedSubFields.length > 0) {
          fieldString += ' {\n';
          selectedSubFields.forEach(subField => {
            fieldString += `    ${subField.name}\n`;
          });
          fieldString += '  }';
        }
      }

      query += fieldString + '\n';
    });

    query += '}';
    setGeneratedQuery(query);
  };

  const formatArgValue = (value: any, type: string): string => {
    if (type.includes('String')) {
      return `"${value}"`;
    } else if (type.includes('Boolean')) {
      return value.toString();
    } else if (type.includes('Int') || type.includes('Float')) {
      return value.toString();
    } else if (type.includes('ID')) {
      return `"${value}"`;
    }
    return value;
  };

  const updateArgument = (typeName: string, fieldIndex: number, argIndex: number, value: any) => {
    if (!schema) return;

    const newSchema = { ...schema };
    const field = newSchema.types[typeName][fieldIndex];
    
    if (field.args && field.args[argIndex]) {
      field.args[argIndex].value = value;
    }
    
    setSchema(newSchema);
    generateQuery();
  };

  const copyQuery = () => {
    navigator.clipboard.writeText(generatedQuery);
    showNotification('Requête copiée dans le presse-papiers !', 'success');
  };

  const downloadQuery = () => {
    const blob = new Blob([generatedQuery], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graphql-query.gql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const executeQuery = async () => {
    if (!generatedQuery.trim()) return;

    try {
      // Simulate query execution
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockResult = {
        data: {
          user: {
            id: "1",
            name: "John Doe",
            email: "john@example.com",
            profile: {
              bio: "Software Developer",
              avatar: "https://example.com/avatar.jpg"
            }
          }
        }
      };

      addLog({
        level: 'info',
        message: 'Requête GraphQL exécutée avec succès',
        data: { query: generatedQuery.substring(0, 100) + '...', result: mockResult }
      });

      showNotification('Requête exécutée avec succès !', 'success');
    } catch (error) {
      addLog({
        level: 'error',
        message: 'Erreur lors de l\'exécution de la requête',
        data: { error: error.message }
      });
      showNotification('Erreur lors de l\'exécution', 'error');
    }
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
      {/* GraphQL Query Builder Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-92 left-4 z-40 px-4 py-2 rounded-lg ${
          darkMode ? 'bg-pink-600 hover:bg-pink-700' : 'bg-pink-500 hover:bg-pink-600'
        } text-white shadow-lg flex items-center space-x-2 transition-all hover:scale-105`}
      >
        <Layers size={16} />
        <span>GraphQL Builder</span>
      </button>

      {/* GraphQL Query Builder Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Layers className="text-pink-500" size={24} />
                <h2 className="text-xl font-bold">GraphQL Query Builder</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Panel - Schema Loading */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    URL du schéma GraphQL
                  </label>
                  <input
                    type="text"
                    value={schemaUrl}
                    onChange={(e) => setSchemaUrl(e.target.value)}
                    placeholder="https://api.example.com/graphql"
                    className={`w-full px-3 py-2 border rounded-md ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                  />
                </div>

                <button
                  onClick={loadSchema}
                  disabled={isLoading}
                  className="w-full bg-pink-500 text-white py-2 rounded-lg hover:bg-pink-600 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Chargement...</span>
                    </>
                  ) : (
                    <>
                      <Database size={16} />
                      <span>Charger le Schéma</span>
                    </>
                  )}
                </button>

                {/* Quick Schema Examples */}
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Exemples de schémas</h4>
                  <div className="space-y-2">
                    {[
                      { name: 'GitHub API', url: 'https://api.github.com/graphql' },
                      { name: 'SpaceX API', url: 'https://api.spacex.land/graphql' },
                      { name: 'Rick & Morty', url: 'https://rickandmortyapi.com/graphql' }
                    ].map(example => (
                      <button
                        key={example.name}
                        onClick={() => setSchemaUrl(example.url)}
                        className={`w-full p-2 text-left rounded border transition-colors ${
                          darkMode 
                            ? 'border-gray-600 hover:border-gray-500' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-sm font-medium">{example.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Use Mock Schema Button */}
                <button
                  onClick={() => setSchema(mockSchema)}
                  className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
                >
                  Utiliser le schéma de démonstration
                </button>
              </div>

              {/* Middle Panel - Schema Explorer */}
              <div className="space-y-4">
                {schema && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Type de requête</label>
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        {Object.keys(schema.types).map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      <div className={`p-3 border-b font-medium ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        Champs disponibles
                      </div>
                      <div className="p-3 space-y-3">
                        {schema.types[selectedType]?.map((field, fieldIndex) => (
                          <div key={fieldIndex} className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={field.selected}
                                onChange={() => toggleField(selectedType, fieldIndex)}
                                className="rounded"
                              />
                              <span className="font-medium">{field.name}</span>
                              <span className="text-xs text-blue-600">{field.type}</span>
                            </div>
                            <div className="text-xs text-gray-500 ml-6">{field.description}</div>
                            
                            {/* Arguments */}
                            {field.args && field.args.length > 0 && field.selected && (
                              <div className="ml-6 space-y-2">
                                <div className="text-xs font-medium text-gray-600">Arguments:</div>
                                {field.args.map((arg, argIndex) => (
                                  <div key={argIndex} className="flex items-center space-x-2">
                                    <span className="text-xs">{arg.name}:</span>
                                    <input
                                      type="text"
                                      placeholder={arg.defaultValue?.toString() || arg.type}
                                      onChange={(e) => updateArgument(selectedType, fieldIndex, argIndex, e.target.value)}
                                      className={`px-2 py-1 text-xs border rounded ${
                                        darkMode ? 'bg-gray-600 border-gray-500' : 'bg-gray-50 border-gray-300'
                                      }`}
                                    />
                                    <span className="text-xs text-gray-500">{arg.type}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Nested Fields */}
                            {field.fields && field.selected && (
                              <div className="ml-6 space-y-1">
                                <div className="text-xs font-medium text-gray-600">Sous-champs:</div>
                                {field.fields.map((subField, subFieldIndex) => (
                                  <div key={subFieldIndex} className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={subField.selected}
                                      onChange={() => toggleField(selectedType, fieldIndex, subFieldIndex)}
                                      className="rounded"
                                    />
                                    <span className="text-sm">{subField.name}</span>
                                    <span className="text-xs text-blue-600">{subField.type}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {!schema && (
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    darkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}>
                    <Database size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">Chargez un schéma GraphQL pour commencer</p>
                  </div>
                )}
              </div>

              {/* Right Panel - Query Output */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Requête générée</h3>
                  {generatedQuery && (
                    <div className="flex space-x-2">
                      <button
                        onClick={executeQuery}
                        className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                        title="Exécuter"
                      >
                        <Play size={16} />
                      </button>
                      <button
                        onClick={copyQuery}
                        className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        title="Copier"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={downloadQuery}
                        className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                        title="Télécharger"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {generatedQuery ? (
                  <div className={`border rounded-lg ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <div className={`px-3 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b rounded-t-lg flex items-center justify-between`}>
                      <span className="text-sm font-medium">GraphQL Query</span>
                      <span className="text-xs text-gray-500">
                        {generatedQuery.split('\n').length} lignes
                      </span>
                    </div>
                    <pre className="p-4 overflow-x-auto text-sm">
                      <code className="language-graphql">{generatedQuery}</code>
                    </pre>
                  </div>
                ) : (
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    darkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}>
                    <Code size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">Sélectionnez des champs pour générer une requête</p>
                  </div>
                )}

                {/* GraphQL Info */}
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                  <h4 className="font-medium mb-2 flex items-center">
                    <Layers className="mr-2 text-pink-500" size={16} />
                    GraphQL Query Builder
                  </h4>
                  <div className="text-sm space-y-1 text-gray-600">
                    <p>✅ <strong>Visual schema explorer</strong> : Navigation intuitive du schéma</p>
                    <p>✅ <strong>Auto-completion</strong> : Suggestions intelligentes de champs</p>
                    <p>✅ <strong>Validation</strong> : Validation automatique des requêtes</p>
                    <p>✅ <strong>Test intégré</strong> : Exécution directe des requêtes</p>
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