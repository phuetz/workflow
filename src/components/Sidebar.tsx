import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Search, Zap, MessageSquare, Database, Brain, Settings, GitBranch, Filter } from 'lucide-react';
import * as Icons from 'lucide-react';
import { nodeTypes, nodeCategories } from '../data/nodeTypes';
import { useWorkflowStore } from '../store/workflowStore';

export default function Sidebar() {
  const { 
    saveWorkflow, 
    exportWorkflow,
    importWorkflow,
    isExecuting,
    workflows,
    workflowTemplates,
    loadWorkflow,
    darkMode 
  } = useWorkflowStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeView, setActiveView] = useState('nodes');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['trigger', 'core']);
  
  const filteredNodes = Object.values(nodeTypes).filter(node => {
    if (selectedCategory !== 'all' && node.category !== selectedCategory) return false;
    if (searchTerm && !node.label.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });
  
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importWorkflow(file);
    }
  };
  
  const getIcon = (iconName: string) => {
    const Icon = Icons[iconName as keyof typeof Icons] as React.ComponentType<any>;
    return Icon ? <Icon size={16} /> : <Plus size={16} />;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trigger': return <Zap size={16} />;
      case 'communication': return <MessageSquare size={16} />;
      case 'database': return <Database size={16} />;
      case 'ai': return <Brain size={16} />;
      case 'core': return <Settings size={16} />;
      case 'flow': return <GitBranch size={16} />;
      case 'data': return <Filter size={16} />;
      default: return <Settings size={16} />;
    }
  };

  const getNodeColor = (category: string) => {
    switch (category) {
      case 'trigger': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'communication': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'database': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ai': return 'bg-green-100 text-green-800 border-green-200';
      case 'core': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'flow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'data': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };
  
  return (
    <div className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-80 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-r overflow-hidden flex flex-col z-10`}>
      {/* Header */}
      <div className={`p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b flex-shrink-0`}>
        <h2 className="text-lg font-semibold mb-4 truncate">Node Library</h2>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search nodes..."
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm border ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => saveWorkflow()}
            disabled={isExecuting}
            className="bg-blue-500 text-white px-2 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 text-xs flex items-center justify-center space-x-1 transition-colors"
          >
            <Icons.Save size={14} />
            <span>Save</span>
          </button>
          <button
            onClick={exportWorkflow}
            disabled={isExecuting}
            className="bg-green-500 text-white px-2 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 text-xs flex items-center justify-center space-x-1 transition-colors"
          >
            <Icons.Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>
      
      {/* Nodes List */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(nodeCategories).map(([catKey, category]) => {
          const categoryNodes = filteredNodes.filter(node => node.category === catKey);
          if (categoryNodes.length === 0) return null;
          
          const isExpanded = expandedCategories.includes(catKey);
          
          return (
            <div key={catKey} className="mb-4">
              <button
                onClick={() => toggleCategory(catKey)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {getCategoryIcon(catKey)}
                  <span className="font-medium text-sm truncate">{category.name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {categoryNodes.length}
                  </span>
                </div>
                <div className="flex-shrink-0">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </button>
              
              {isExpanded && (
                <div className="mt-2 space-y-2 ml-2">
                  {categoryNodes.map(node => (
                    <div
                      key={node.type}
                      className={`p-3 rounded-lg border-2 border-dashed cursor-move transition-all hover:shadow-md ${
                        darkMode 
                          ? 'border-gray-600 hover:border-gray-500 bg-gray-700' 
                          : 'border-gray-300 hover:border-gray-400 bg-white'
                      }`}
                      onDragStart={(event) => onDragStart(event, node.type)}
                      draggable
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 rounded border flex items-center justify-center ${
                            darkMode ? 'border-gray-500' : 'border-gray-300'
                          }`}>
                            {getIcon(node.icon)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate leading-tight">{node.label}</h4>
                          <p className="text-xs opacity-75 truncate leading-tight mt-1">{node.description}</p>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-400 flex-shrink-0">
                          <span>{node.inputs}</span>
                          <Icons.ArrowRight size={12} />
                          <span>{node.outputs}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={`p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-t flex-shrink-0`}>
        <label className="block">
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            disabled={isExecuting}
            className="hidden"
          />
          <div className="w-full bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 cursor-pointer text-center text-sm flex items-center justify-center space-x-2 transition-colors">
            <Icons.Upload size={14} />
            <span>Import Workflow</span>
          </div>
        </label>
      </div>
    </div>
  );
}