import React from 'react';
import * as Icons from 'lucide-react';
import { Handle, Position } from 'reactflow';
import { nodeTypes } from '../data/nodeTypes';
import { useWorkflowStore } from '../store/workflowStore';

interface CustomNodeProps {
  data: any;
  id: string;
  selected?: boolean;
}

export default function CustomNode({ data, id, selected }: CustomNodeProps) {
  const { 
    setSelectedNode, 
    executionResults, 
    executionErrors, 
    currentExecutingNode,
    darkMode 
  } = useWorkflowStore();
  
  const nodeType = nodeTypes[data.type] || nodeTypes.trigger;
  
  const hasResult = executionResults[id];
  const hasError = executionErrors[id];
  const isExecuting = currentExecutingNode === id;
  
  // Fonction pour obtenir l'icône spécifique à n8n
  const getNodeIcon = () => {
    switch (data.type) {
      // Triggers
      case 'trigger':
      case 'manualTrigger':
        return <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
          <Icons.Play size={10} className="text-white ml-0.5" />
        </div>;
      
      case 'schedule':
        return <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
          <Icons.Clock size={10} className="text-white" />
        </div>;
      
      case 'webhook':
        return <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
          <Icons.Zap size={10} className="text-white" />
        </div>;
      
      case 'rssFeed':
        return <div className="w-4 h-4 bg-orange-500 rounded-sm flex items-center justify-center">
          <Icons.Rss size={10} className="text-white" />
        </div>;
      
      // Communication
      case 'email':
      case 'gmail':
        return <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center text-white font-bold text-xs">
          @
        </div>;
      
      case 'slack':
        return <div className="w-4 h-4 bg-purple-500 rounded-sm flex items-center justify-center">
          <Icons.MessageSquare size={10} className="text-white" />
        </div>;
      
      case 'discord':
        return <div className="w-4 h-4 bg-indigo-500 rounded-sm flex items-center justify-center">
          <Icons.MessageCircle size={10} className="text-white" />
        </div>;
      
      case 'telegram':
        return <div className="w-4 h-4 bg-blue-400 rounded-sm flex items-center justify-center">
          <Icons.Send size={10} className="text-white" />
        </div>;
      
      // Database
      case 'mysql':
        return <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
          <Icons.Database size={10} className="text-white" />
        </div>;
      
      case 'postgres':
        return <div className="w-4 h-4 bg-blue-800 rounded-sm flex items-center justify-center">
          <Icons.Database size={10} className="text-white" />
        </div>;
      
      case 'mongodb':
        return <div className="w-4 h-4 bg-green-600 rounded-sm flex items-center justify-center">
          <Icons.Database size={10} className="text-white" />
        </div>;
      
      // Core
      case 'httpRequest':
        return <div className="w-4 h-4 bg-purple-500 rounded-sm flex items-center justify-center">
          <Icons.Globe size={10} className="text-white" />
        </div>;
      
      case 'code':
        return <div className="w-4 h-4 bg-orange-500 rounded-sm flex items-center justify-center text-white font-bold text-xs">
          {'</>'}
        </div>;
      
      case 'python':
        return <div className="w-4 h-4 bg-yellow-500 rounded-sm flex items-center justify-center">
          <Icons.FileText size={10} className="text-white" />
        </div>;
      
      case 'transform':
        return <div className="w-4 h-4 bg-orange-500 rounded-sm flex items-center justify-center text-white font-bold text-xs">
          {'</>'}
        </div>;
      
      // Flow Control
      case 'condition':
        return <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
          <div className="text-white text-xs font-bold">≡</div>
        </div>;
      
      case 'merge':
        return <div className="w-4 h-4 bg-cyan-500 rounded-sm flex items-center justify-center">
          <Icons.Merge size={10} className="text-white" />
        </div>;
      
      case 'split':
        return <div className="w-4 h-4 bg-cyan-500 rounded-sm flex items-center justify-center">
          <Icons.Split size={10} className="text-white" />
        </div>;
      
      case 'delay':
        return <div className="w-4 h-4 bg-gray-500 rounded-sm flex items-center justify-center">
          <Icons.Timer size={10} className="text-white" />
        </div>;
      
      case 'loop':
        return <div className="w-4 h-4 bg-orange-500 rounded-sm flex items-center justify-center">
          <Icons.RotateCcw size={10} className="text-white" />
        </div>;

      case 'forEach':
        return <div className="w-4 h-4 bg-orange-500 rounded-sm flex items-center justify-center">
          <Icons.List size={10} className="text-white" />
        </div>;
      
      case 'filter':
        return <div className="w-4 h-4 bg-purple-500 rounded-sm flex items-center justify-center">
          <Icons.Filter size={10} className="text-white" />
        </div>;
      
      case 'sort':
        return <div className="w-4 h-4 bg-indigo-500 rounded-sm flex items-center justify-center">
          <Icons.ArrowUpDown size={10} className="text-white" />
        </div>;

      case 'etl':
        return <div className="w-4 h-4 bg-orange-700 rounded-sm flex items-center justify-center">
          <Icons.Database size={10} className="text-white" />
        </div>;
      
      // AI
      case 'openai':
        return <div className="w-4 h-4 bg-gray-700 rounded-sm flex items-center justify-center">
          <Icons.Bot size={10} className="text-white" />
        </div>;
      
      case 'anthropic':
        return <div className="w-4 h-4 bg-amber-600 rounded-sm flex items-center justify-center">
          <Icons.Brain size={10} className="text-white" />
        </div>;
      
      // Cloud
      case 'aws':
        return <div className="w-4 h-4 bg-orange-600 rounded-sm flex items-center justify-center">
          <Icons.Cloud size={10} className="text-white" />
        </div>;
      
      case 's3':
        return <div className="w-4 h-4 bg-orange-700 rounded-sm flex items-center justify-center">
          <Icons.Archive size={10} className="text-white" />
        </div>;
      
      case 'googleSheets':
        return <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
          <Icons.FileSpreadsheet size={10} className="text-white" />
        </div>;
      
      case 'googleDrive':
        return <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center">
          <Icons.HardDrive size={10} className="text-white" />
        </div>;
      
      // Productivity
      case 'notion':
        return <div className="w-4 h-4 bg-gray-600 rounded-sm flex items-center justify-center">
          <Icons.BookOpen size={10} className="text-white" />
        </div>;
      
      case 'airtable':
        return <div className="w-4 h-4 bg-yellow-500 rounded-sm flex items-center justify-center">
          <Icons.Table size={10} className="text-white" />
        </div>;
      
      // E-commerce
      case 'stripe':
        return <div className="w-4 h-4 bg-purple-700 rounded-sm flex items-center justify-center">
          <Icons.CreditCard size={10} className="text-white" />
        </div>;
      
      case 'paypal':
        return <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
          <Icons.DollarSign size={10} className="text-white" />
        </div>;
      
      // Development
      case 'github':
        return <div className="w-4 h-4 bg-gray-800 rounded-sm flex items-center justify-center">
          <Icons.Github size={10} className="text-white" />
        </div>;
      
      case 'gitlab':
        return <div className="w-4 h-4 bg-orange-800 rounded-sm flex items-center justify-center">
          <Icons.GitBranch size={10} className="text-white" />
        </div>;
      
      default:
        return <div className="w-4 h-4 bg-gray-500 rounded-sm flex items-center justify-center">
          <Icons.Settings size={10} className="text-white" />
        </div>;
    }
  };

  // Fonction pour obtenir la couleur de bordure selon le type
  const getBorderColor = () => {
    if (hasError) return 'border-red-400';
    if (isExecuting) return 'border-blue-400';
    if (hasResult) return 'border-green-400';
    if (selected) return 'border-blue-500';
    
    switch (nodeType.category) {
      case 'trigger': return 'border-green-400';
      case 'communication': return 'border-blue-400';
      case 'database': return 'border-purple-400';
      case 'ai': return 'border-emerald-400';
      case 'core': return 'border-orange-400';
      case 'flow': return 'border-cyan-400';
      case 'cloud': return 'border-amber-400';
      case 'productivity': return 'border-yellow-400';
      case 'ecommerce': return 'border-pink-400';
      case 'development': return 'border-gray-400';
      case 'google': return 'border-blue-500';
      case 'data': return 'border-indigo-400';
      default: return 'border-gray-400';
    }
  };

  // Fonction pour obtenir les informations de configuration
  const getConfigInfo = () => {
    const config = data.config || {};
    const isConfigured = Object.keys(config).length > 0;
    
    switch (data.type) {
      case 'httpRequest':
        return config.url ? `${config.method || 'GET'}: ${config.url.length > 30 ? config.url.substring(0, 30) + '...' : config.url}` : 'Configure HTTP request';
      case 'email':
      case 'gmail':
        return config.to ? `To: ${config.to}${config.subject ? ` - ${config.subject}` : ''}` : 'Configure email';
      case 'slack':
        return config.channel ? `${config.channel}${config.message ? ` - ${config.message.substring(0, 20)}...` : ''}` : 'Configure Slack';
      case 'schedule':
        return config.cron ? `${config.cron} (${config.timezone || 'UTC'})` : 'Configure schedule';
      case 'webhook':
        return config.webhookUrl ? `${config.method || 'POST'} webhook ready` : 'Configure webhook';
      case 'mysql':
      case 'postgres':
      case 'mongodb':
        return config.database ? `${config.database}.${config.collection || config.table || 'table'}` : 'Configure database';
      case 'openai':
        return config.model ? `${config.model}${config.temperature ? ` (T:${config.temperature})` : ''}` : 'Configure OpenAI';
      case 'condition':
        return config.condition ? `${config.condition.substring(0, 25)}...` : 'Configure condition';
      case 'transform':
        return config.code ? `${config.transformType || 'javascript'} transform` : 'Configure transform';
      case 'delay':
        return config.delay ? `Wait ${config.delay} ${config.unit || 'seconds'}` : 'Configure delay';
      case 'filter':
        return config.filter ? `Filter: ${config.filter.substring(0, 20)}...` : 'Configure filter';
      case 'sort':
        return config.field ? `Sort by ${config.field} (${config.order || 'asc'})` : 'Configure sort';
      case 'merge':
        return 'Merge inputs';
      case 'split':
        return 'Split data';
      default:
        return isConfigured ? 'Configured' : 'Configure node';
    }
  };

  const [showTooltip, setShowTooltip] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêche la propagation de l'événement aux éléments parents
    setSelectedNode({ id, data });
    console.log("Node selected:", id, data.label || data.type); // Ajout d'un log pour le débogage
  };

  // Calculer le nombre de handles
  const inputCount = nodeType.inputs || 0;
  const outputCount = nodeType.outputs || 0;

  return (
    <div
      onClick={handleClick}
      className="relative cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={`Configure ${data.label || data.type} node`}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e as any)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      {/* Nœud principal */}
      <div className={`
        w-24 h-16 bg-white rounded-lg border-2 border-dashed ${getBorderColor()}
        cursor-pointer transition-all duration-200 hover:shadow-md
        flex items-center justify-center relative
        ${isExecuting ? 'animate-pulse' : ''}
        ${selected ? 'ring-2 ring-blue-500' : ''}
      `}>
        {/* Icône */}
        <div className="flex items-center justify-center">
          {getNodeIcon()}
          
          {/* Badge de configuration */}
          {Object.keys(data.config || {}).length > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          )}
        </div>
        
        {/* Indicateur d'état */}
        {isExecuting && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full">
            <div className="w-full h-full bg-blue-500 rounded-full animate-ping"></div>
          </div>
        )}
        
        {hasResult && !isExecuting && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
            <Icons.Check size={8} className="text-white" />
          </div>
        )}
        
        {hasError && !isExecuting && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
            <Icons.X size={8} className="text-white" />
          </div>
        )}
      </div>

      {/* Handles d'entrée */}
      {inputCount > 0 && Array.from({ length: inputCount }).map((_, index) => (
        <Handle
          key={`input-${index}`}
          type="target"
          position={Position.Left}
          id={`input-${index}`}
          className="w-2 h-2 bg-gray-600 rounded-full border-0 hover:bg-blue-500 transition-colors"
          style={{ 
            left: -4,
            top: inputCount === 1 ? '50%' : `${30 + (index * 40)}%`,
            transform: 'translateY(-50%)'
          }}
        />
      ))}

      {/* Handles de sortie */}
      {outputCount > 0 && Array.from({ length: outputCount }).map((_, index) => {
        // Pour les nœuds de condition, utiliser des IDs spécifiques
        const handleId = data.type === 'condition' ? 
          (index === 0 ? 'true' : 'false') : 
          `output-${index}`;
        
        return (
          <Handle
            key={`output-${index}`}
            type="source"
            position={Position.Right}
            id={handleId}
            className="w-2 h-2 bg-gray-600 rounded-full border-0 hover:bg-blue-500 transition-colors"
            style={{ 
              right: -4,
              top: outputCount === 1 ? '50%' : `${30 + (index * 40)}%`,
              transform: 'translateY(-50%)'
            }}
          />
        );
      })}

      {/* Labels pour les sorties de condition */}
      {data.type === 'condition' && outputCount > 1 && (
        <>
          <div className="absolute -right-8 top-3 text-xs text-gray-500 font-medium">
            true
          </div>
          <div className="absolute -right-8 bottom-3 text-xs text-gray-500 font-medium">
            false
          </div>
        </>
      )}

      {/* Label principal sous le nœud */}
      <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center min-w-max">
        <div className="text-sm font-semibold text-gray-900 mb-1">
          {data.label || nodeType.label}
        </div>
        <div className="text-xs text-gray-500 max-w-44 truncate bg-white px-2 py-1 rounded shadow-sm">
          {getConfigInfo()}
        </div>
      </div>

      {/* Tooltip au hover */}
      {showTooltip && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10 pointer-events-none">
          {nodeType.description}
        </div>
      )}
    </div>
  );
}