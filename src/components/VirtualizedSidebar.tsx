/**
 * Virtualized Sidebar with react-window for performance
 * Handles 1000+ nodes efficiently
 */

import React, { useState, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ChevronDown, ChevronRight, Search, Save, Download } from 'lucide-react';
import * as Icons from 'lucide-react';
import { nodeTypes, nodeCategories } from '../data/nodeTypes';
import { useWorkflowStore } from '../store/workflowStore';

interface NodeItem {
  type: 'category' | 'node';
  key: string;
  data: any;
  category?: string;
}

export default function VirtualizedSidebar() {
  const {
    saveWorkflow,
    exportWorkflow,
    isExecuting,
    darkMode
  } = useWorkflowStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['trigger', 'core']);

  // Filter and organize nodes
  const { items, nodeCount } = useMemo(() => {
    const filteredNodes = Object.values(nodeTypes).filter(node => {
      if (searchTerm && !node.label.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    });

    const itemsList: NodeItem[] = [];
    let count = 0;

    Object.entries(nodeCategories).forEach(([catKey, category]) => {
      const categoryNodes = filteredNodes.filter(node => node.category === catKey);
      if (categoryNodes.length === 0) return;

      // Add category header
      itemsList.push({
        type: 'category',
        key: catKey,
        data: { ...category, key: catKey, count: categoryNodes.length }
      });

      // Add nodes if category is expanded
      if (expandedCategories.includes(catKey)) {
        categoryNodes.forEach(node => {
          itemsList.push({
            type: 'node',
            key: node.type,
            data: node,
            category: catKey
          });
          count++;
        });
      } else {
        count += categoryNodes.length;
      }
    });

    return { items: itemsList, nodeCount: count };
  }, [searchTerm, expandedCategories]);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const getIcon = useCallback((iconName: string) => {
    const Icon = Icons[iconName as keyof typeof Icons] as React.ComponentType<any>;
    return Icon ? <Icon size={16} /> : <Icons.Plus size={16} />;
  }, []);

  const getCategoryIcon = useCallback((category: string) => {
    const icons: Record<string, React.ReactNode> = {
      trigger: <Icons.Zap size={16} />,
      communication: <Icons.MessageSquare size={16} />,
      database: <Icons.Database size={16} />,
      ai: <Icons.Brain size={16} />,
      core: <Icons.Settings size={16} />,
      flow: <Icons.GitBranch size={16} />,
      data: <Icons.Filter size={16} />
    };
    return icons[category] || <Icons.Settings size={16} />;
  }, []);

  const getNodeColor = useCallback((category: string) => {
    const colors: Record<string, string> = {
      trigger: 'bg-orange-100 text-orange-800 border-orange-200',
      communication: 'bg-blue-100 text-blue-800 border-blue-200',
      database: 'bg-purple-100 text-purple-800 border-purple-200',
      ai: 'bg-green-100 text-green-800 border-green-200',
      core: 'bg-gray-100 text-gray-800 border-gray-200',
      flow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      data: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  }, []);

  // Render row function for react-window
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];

    if (item.type === 'category') {
      const isExpanded = expandedCategories.includes(item.key);
      return (
        <div style={style} className="px-4">
          <button
            onClick={() => toggleCategory(item.key)}
            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {getCategoryIcon(item.key)}
              <span className="font-medium text-sm truncate">{item.data.name}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
              }`}>
                {item.data.count}
              </span>
            </div>
            <div className="flex-shrink-0">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
          </button>
        </div>
      );
    }

    // Node item
    const node = item.data;
    return (
      <div style={style} className="px-4">
        <div
          draggable
          onDragStart={(e) => onDragStart(e, node.type)}
          className={`p-3 ml-8 rounded-lg cursor-move transition-all border ${getNodeColor(item.category!)} ${
            darkMode ? 'hover:shadow-lg' : 'hover:shadow-md'
          } hover:scale-105`}
        >
          <div className="flex items-center space-x-2">
            {getIcon(node.icon)}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{node.label}</div>
              {node.description && (
                <div className="text-xs opacity-75 truncate">{node.description}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }, [items, expandedCategories, darkMode, toggleCategory, onDragStart, getIcon, getCategoryIcon, getNodeColor]);

  return (
    <div className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-80 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-r overflow-hidden flex flex-col z-10 shadow-md`}>
      {/* Header */}
      <div className={`p-5 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b flex-shrink-0`}>
        <h2 className="text-lg font-semibold mb-4 truncate">
          Node Library
          <span className="ml-2 text-xs opacity-60">({nodeCount} nodes)</span>
        </h2>

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
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => saveWorkflow()}
            disabled={isExecuting}
            className="bg-blue-500 text-white px-3 py-2.5 rounded-lg hover:bg-blue-600 disabled:opacity-50 text-xs flex items-center justify-center space-x-2 transition-colors"
          >
            <Save size={14} />
            <span>Save</span>
          </button>
          <button
            onClick={exportWorkflow}
            disabled={isExecuting}
            className="bg-green-500 text-white px-3 py-2.5 rounded-lg hover:bg-green-600 disabled:opacity-50 text-xs flex items-center justify-center space-x-2 transition-colors"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Virtualized List */}
      <div className="flex-1">
        <List
          height={window.innerHeight - 280} // Adjust based on header height
          itemCount={items.length}
          itemSize={item => items[item].type === 'category' ? 60 : 80}
          width="100%"
          className={darkMode ? 'scrollbar-dark' : 'scrollbar-light'}
        >
          {Row}
        </List>
      </div>
    </div>
  );
}
