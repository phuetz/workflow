import React, { useState, useEffect } from 'react';
import {
  AlertCircle, AlertTriangle, Code, Download, Package, Search,
  Settings, Shield, X
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { nodeTypes } from '../../data/nodeTypes';
import { logger } from '../../services/SimpleLogger';

interface NodeConfigField {
  name: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'textarea' | 'json' | 'password' | 'multiselect' | 'file' | 'color';
  label: string;
  description?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  defaultValue?: unknown;
  dependsOn?: string;
  dependsOnValue?: unknown;
}

interface ModernNodeConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

const ModernNodeConfig: React.FC<ModernNodeConfigProps> = ({ isOpen, onClose }) => {
  const { selectedNode, updateNodeConfig, darkMode } = useWorkflowStore();
  
  const [config, setConfig] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'authentication' | 'output'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // UI/UX FIX: Add loading state to provide feedback during save operations
  const [isSaving, setIsSaving] = useState(false);
  const [jsonValidationErrors, setJsonValidationErrors] = useState<Record<string, string>>({});

  // Configuration des champs par type de nœud
  const getNodeConfigFields = (nodeType: string): NodeConfigField[] => {
    const baseFields: NodeConfigField[] = [
      {
        name: 'name',
        type: 'text',
        label: 'Nom du nœud',
        description: 'Nom personnalisé pour ce nœud',
        required: true,
        placeholder: 'Mon nœud personnalisé'
      },
      {
        name: 'description',
        type: 'textarea',
        label: 'Description',
        description: 'Description de la fonction de ce nœud',
        placeholder: 'Décrivez ce que fait ce nœud...'
      }
    ];

    // Configuration spécifique par type
    switch (nodeType) {
      case 'httpRequest':
        return [
          ...baseFields,
          {
            name: 'method',
            type: 'select',
            label: 'Méthode HTTP',
            required: true,
            options: [
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
              { value: 'PUT', label: 'PUT' },
              { value: 'DELETE', label: 'DELETE' },
              { value: 'PATCH', label: 'PATCH' }
            ],
            defaultValue: 'GET'
          },
          {
            name: 'url',
            type: 'text',
            label: 'URL',
            required: true,
            placeholder: 'https://api.example.com/endpoint',
            validation: {
              pattern: '^https?://.+'
            }
          },
          {
            name: 'headers',
            type: 'json',
            label: 'En-têtes',
            description: 'En-têtes HTTP personnalisés',
            defaultValue: {}
          },
          {
            name: 'authentication',
            type: 'select',
            label: 'Authentification',
            options: [
              { value: 'none', label: 'Aucune' },
              { value: 'basic', label: 'Basic Auth' },
              { value: 'bearer', label: 'Bearer Token' },
              { value: 'oauth2', label: 'OAuth 2.0' }
            ],
            defaultValue: 'none'
          },
          {
            name: 'timeout',
            type: 'number',
            label: 'Timeout (ms)',
            description: 'Délai d\'attente en millisecondes',
            defaultValue: 5000,
            validation: {
              min: 1000,
              max: 60000
            }
          }
        ];

      case 'database':
        return [
          ...baseFields,
          {
            name: 'connectionString',
            type: 'password',
            label: 'Chaîne de connexion',
            required: true,
            placeholder: 'postgresql://user:password@localhost:5432/db'
          },
          {
            name: 'query',
            type: 'textarea',
            label: 'Requête SQL',
            required: true,
            placeholder: 'SELECT * FROM users WHERE active = true'
          },
          {
            name: 'parameters',
            type: 'json',
            label: 'Paramètres',
            description: 'Paramètres pour la requête préparée',
            defaultValue: {}
          }
        ];

      case 'email':
        return [
          ...baseFields,
          {
            name: 'to',
            type: 'text',
            label: 'Destinataire',
            required: true,
            placeholder: 'user@example.com'
          },
          {
            name: 'subject',
            type: 'text',
            label: 'Sujet',
            required: true,
            placeholder: 'Objet de l\'email'
          },
          {
            name: 'body',
            type: 'textarea',
            label: 'Corps du message',
            required: true,
            placeholder: 'Contenu de l\'email...'
          },
          {
            name: 'attachments',
            type: 'file',
            label: 'Pièces jointes',
            description: 'Fichiers à joindre à l\'email'
          }
        ];

      case 'filter':
        return [
          ...baseFields,
          {
            name: 'condition',
            type: 'select',
            label: 'Condition',
            required: true,
            options: [
              { value: 'equals', label: 'Égal à' },
              { value: 'not_equals', label: 'Différent de' },
              { value: 'contains', label: 'Contient' },
              { value: 'starts_with', label: 'Commence par' },
              { value: 'ends_with', label: 'Finit par' },
              { value: 'greater_than', label: 'Supérieur à' },
              { value: 'less_than', label: 'Inférieur à' }
            ],
            defaultValue: 'equals'
          },
          {
            name: 'field',
            type: 'text',
            label: 'Champ',
            required: true,
            placeholder: 'nom_du_champ'
          },
          {
            name: 'value',
            type: 'text',
            label: 'Valeur',
            required: true,
            placeholder: 'valeur_à_comparer'
          }
        ];

      default:
        return baseFields;
    }
  };

  const nodeConfigFields = getNodeConfigFields(selectedNode?.data?.type || '');

  // Filtrer les champs selon la recherche
  const filteredFields = nodeConfigFields.filter(field =>
    field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grouper les champs par onglet
  const fieldsByTab = {
    basic: filteredFields.filter(f => ['name', 'description', 'url', 'method', 'to', 'subject', 'condition', 'field', 'value'].includes(f.name)),
    advanced: filteredFields.filter(f => ['headers', 'parameters', 'timeout', 'query', 'body', 'attachments'].includes(f.name)),
    authentication: filteredFields.filter(f => ['authentication', 'connectionString'].includes(f.name)),
    output: filteredFields.filter(f => ['output_format', 'return_type'].includes(f.name))
  };

  useEffect(() => {
    if (selectedNode) {
      setConfig(selectedNode.data.config || {});
      setActiveTab('basic');
      setErrors({});
      setSearchTerm('');
    }
  }, [selectedNode]);

  const validateField = (field: NodeConfigField, value: any): string | null => {
    if (field.required && (!value || value === '')) {
      return `${field.label} est requis`;
    }

    if (field.validation) {
      const { pattern, min, max, minLength, maxLength } = field.validation;

      if (pattern && value && !new RegExp(pattern).test(value)) {
        return `${field.label} ne respecte pas le format attendu`;
      }
      
      if (min !== undefined && value < min) {
        return `${field.label} doit être supérieur ou égal à ${min}`;
      }
      
      if (max !== undefined && value > max) {
        return `${field.label} doit être inférieur ou égal à ${max}`;
      }
      
      if (minLength !== undefined && value.length < minLength) {
        return `${field.label} doit contenir au moins ${minLength} caractères`;
      }
      
      if (maxLength !== undefined && value.length > maxLength) {
        return `${field.label} ne peut pas dépasser ${maxLength} caractères`;
      }
    }

    return null;
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setConfig(prev => ({ ...prev, [fieldName]: value }));

    const field = nodeConfigFields.find(f => f.name === fieldName);
    if (field) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [fieldName]: error || '' }));
    }
  };

  const handleSave = async () => {
    if (selectedNode) {
      // UI/UX FIX: Show loading state during save
      setIsSaving(true);
      
      try {
        // Valider tous les champs
        const newErrors: Record<string, string> = {};
        let valid = true;

        nodeConfigFields.forEach(field => {
          const error = validateField(field, config[field.name]);
          if (error) {
            newErrors[field.name] = error;
            valid = false;
          }
        });

        // UI/UX FIX: Also check for JSON validation errors
        const hasJsonErrors = Object.keys(jsonValidationErrors).length > 0;
        if (hasJsonErrors) {
          valid = false;
          // Merge JSON errors with field errors for display
          Object.entries(jsonValidationErrors).forEach(([fieldName, error]) => {
            newErrors[fieldName] = error;
          });
        }

        setErrors(newErrors);
        setIsValid(valid);

        if (valid) {
          // Save configuration directly without artificial delay
          await updateNodeConfig(selectedNode.id, config);
          onClose();
        }
      } catch (error) {
        logger.error('Error saving node configuration:', error);
        // UI/UX FIX: Show error feedback to user
        setErrors(prev => ({ ...prev, '_general': 'Erreur lors de la sauvegarde' }));
      } finally {
        setIsSaving(false);
      }
    }
  };

  const renderField = (field: NodeConfigField) => {
    const value = config[field.name] ?? field.defaultValue ?? '';
    const error = errors[field.name];
    const fieldId = `field-${field.name}`;

    // Vérifier les dépendances
    if (field.dependsOn && config[field.dependsOn] !== field.dependsOnValue) {
      return null;
    }

    const baseClasses = `w-full px-4 py-2 border rounded-lg transition-colors ${
      darkMode
        ? 'bg-gray-800 border-gray-700 text-white focus:border-primary-500'
        : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500'
    } ${error ? 'border-red-500' : ''} focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50`;

    return (
      <div key={field.name} className="mb-6">
        <label htmlFor={fieldId} className={`block text-sm font-medium mb-2 ${
          darkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {field.description && (
          <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {field.description}
          </p>
        )}

        {field.type === 'text' && (
          <input
            id={fieldId}
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
          />
        )}

        {field.type === 'password' && (
          <input
            id={fieldId}
            type="password"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={baseClasses}
          />
        )}

        {field.type === 'number' && (
          <input
            id={fieldId}
            type="number"
            value={value}
            onChange={(e) => {
              // UI/UX FIX: Better number input handling with user feedback
              const inputValue = e.target.value;
              const numValue = parseFloat(inputValue);
              if (inputValue === '') {
                handleFieldChange(field.name, '');
              } else {
                if (!isNaN(numValue)) {
                  handleFieldChange(field.name, numValue);
                } else {
                  // Show error for invalid number input
                  setErrors(prev => ({ ...prev, [field.name]: 'Veuillez entrer un nombre valide' }));
                }
              }
            }}
            onBlur={(e) => {
              // Convert empty string to default value on blur
              if (e.target.value === '' && field.defaultValue !== undefined) {
                handleFieldChange(field.name, field.defaultValue);
              }
            }}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={baseClasses}
          />
        )}

        {field.type === 'textarea' && (
          <textarea
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={baseClasses}
          />
        )}

        {field.type === 'select' && (
          <select
            id={fieldId}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={baseClasses}
          >
            {/* UI/UX FIX: Clearer placeholder for required vs optional fields */}
            <option value="" disabled={field.required}>
              {field.required ? 'Sélectionnez une option *' : 'Sélectionnez une option (optionnel)'}
            </option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {field.type === 'boolean' && (
          <div className="flex items-center">
            <input
              id={fieldId}
              type="checkbox"
              checked={value}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor={fieldId} className={`ml-2 text-sm ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Activer cette option
            </label>
          </div>
        )}

        {field.type === 'json' && (
          <>
            <textarea
              id={fieldId}
              value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              onChange={(e) => {
                const inputValue = e.target.value;
                try {
                  const parsed = JSON.parse(inputValue);
                  handleFieldChange(field.name, parsed);
                  // UI/UX FIX: Clear JSON validation error when valid
                  setJsonValidationErrors(prev => {
                    const { [field.name]: _, ...rest } = prev;
                    return rest;
                  });
                } catch (parseError) {
                  // Allow editing but show validation error
                  handleFieldChange(field.name, inputValue);
                  // UI/UX FIX: Show JSON validation error to user
                  setJsonValidationErrors(prev => ({
                    ...prev,
                    [field.name]: 'JSON invalide: ' + (parseError instanceof Error ? parseError.message : 'Format incorrect')
                  }));
                }
              }}
              placeholder={field.placeholder}
              rows={6}
              className={`${baseClasses} font-mono text-sm ${
                jsonValidationErrors[field.name] ? 'border-yellow-500' : ''
              }`}
            />
            {/* UI/UX FIX: Show JSON validation feedback */}
            {jsonValidationErrors[field.name] && (
              <p className="text-yellow-600 text-sm mt-1 flex items-center">
                <AlertTriangle size={16} className="mr-1" />
                {jsonValidationErrors[field.name]}
              </p>
            )}
          </>
        )}

        {field.type === 'color' && (
          <input
            id={fieldId}
            type="color"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full h-12 border rounded-lg cursor-pointer"
          />
        )}

        {error && (
          <p className="text-red-500 text-sm mt-1 flex items-center">
            <AlertCircle size={16} className="mr-1" />
            {error}
          </p>
        )}
      </div>
    );
  };

  if (!isOpen || !selectedNode) return null;

  const nodeType = Array.isArray(nodeTypes) ? nodeTypes.find(nt => nt.type === selectedNode.data.type) : undefined;

  if (!nodeType) {
    logger.error(`Node type ${selectedNode.data.type} not found in nodeTypes`);
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div 
        className={`w-full max-w-4xl max-h-[90vh] ${
          darkMode ? 'bg-gray-900' : 'bg-white'
        } rounded-xl shadow-2xl overflow-hidden`}
        role="document"
      >
        
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        } flex items-center justify-between`}>
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
              nodeType?.color || 'bg-gray-500'
            }`}>
              {nodeType?.icon && (
                <Settings size={20} className="text-white" />
              )}
            </div>
            <div>
              <h2 
                id="modal-title"
                className={`text-xl font-semibold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                Configuration - {nodeType?.label || 'Nœud'}
              </h2>
              <p 
                id="modal-description"
                className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Configurez les paramètres pour le nœud {selectedNode.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className={`px-6 py-4 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="relative">
            <Search size={20} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Rechercher un paramètre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className={`px-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <nav className="flex space-x-8">
            {[
              { id: 'basic', label: 'Basique', icon: Settings },
              { id: 'advanced', label: 'Avancé', icon: Code },
              { id: 'authentication', label: 'Authentification', icon: Shield },
              { id: 'output', label: 'Sortie', icon: Download }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'basic' | 'advanced' | 'authentication' | 'output')}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : darkMode
                      ? 'border-transparent text-gray-400 hover:text-gray-300'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={16} className="mr-2" />
                {tab.label}
                {fieldsByTab[tab.id as keyof typeof fieldsByTab].length > 0 && (
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {fieldsByTab[tab.id as keyof typeof fieldsByTab].length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 max-h-96">
          <div className="space-y-6">
            {fieldsByTab[activeTab].length > 0 ? (
              fieldsByTab[activeTab].map(renderField)
            ) : (
              <div className="text-center py-12">
                <Package size={48} className={`mx-auto mb-4 ${
                  darkMode ? 'text-gray-600' : 'text-gray-400'
                }`} />
                <p className={`text-lg font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Aucun paramètre dans cet onglet
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        } flex items-center justify-between`}>
          <div className="flex items-center space-x-2">
            {Object.keys(errors).length > 0 && (
              <div className="flex items-center text-red-500">
                <AlertCircle size={16} className="mr-1" />
                <span className="text-sm">
                  {Object.keys(errors).length} erreur(s) trouvée(s)
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={Object.keys(errors).some(key => errors[key]) || isSaving}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                Object.keys(errors).some(key => errors[key]) || isSaving
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-500 text-white hover:bg-primary-600'
              }`}
              title={(() => {
                const errorKeys = Object.keys(errors).filter(key => errors[key]);
                const hasErrors = errorKeys.length > 0;
                return hasErrors ? `${errorKeys.length} erreur(s) à corriger` : '';
              })()}
            >
              {/* UI/UX FIX: Show loading state and clearer disabled state */}
              {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{isSaving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernNodeConfig;