/**
 * Node Color Picker
 * Customize node colors for visual organization (like n8n)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Palette,
  Check,
  RotateCcw,
  Pipette,
  Star,
  Lock,
  Unlock,
} from 'lucide-react';
import { logger } from '../../services/SimpleLogger';
import { useWorkflowStore } from '../../store/workflowStore';

interface NodeColorPickerProps {
  nodeId: string;
  currentColor?: string;
  onColorChange: (nodeId: string, color: string) => void;
  position?: { x: number; y: number };
  isOpen: boolean;
  onClose: () => void;
}

interface ColorPreset {
  name: string;
  color: string;
  category: string;
}

// Color presets organized by category
const COLOR_PRESETS: ColorPreset[] = [
  // Triggers
  { name: 'Webhook Green', color: '#10B981', category: 'Triggers' },
  { name: 'Schedule Blue', color: '#3B82F6', category: 'Triggers' },
  { name: 'Event Purple', color: '#8B5CF6', category: 'Triggers' },

  // Data
  { name: 'Transform Orange', color: '#F59E0B', category: 'Data' },
  { name: 'Filter Pink', color: '#EC4899', category: 'Data' },
  { name: 'Merge Cyan', color: '#06B6D4', category: 'Data' },

  // Actions
  { name: 'HTTP Blue', color: '#2563EB', category: 'Actions' },
  { name: 'Email Red', color: '#EF4444', category: 'Actions' },
  { name: 'Database Indigo', color: '#6366F1', category: 'Actions' },

  // Logic
  { name: 'If Yellow', color: '#EAB308', category: 'Logic' },
  { name: 'Switch Lime', color: '#84CC16', category: 'Logic' },
  { name: 'Loop Teal', color: '#14B8A6', category: 'Logic' },

  // Neutral
  { name: 'Gray', color: '#6B7280', category: 'Neutral' },
  { name: 'Slate', color: '#475569', category: 'Neutral' },
  { name: 'Stone', color: '#78716C', category: 'Neutral' },
];

// Quick colors (flat palette)
const QUICK_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#78716C', '#6B7280', '#1F2937',
];

const NodeColorPicker: React.FC<NodeColorPickerProps> = ({
  nodeId,
  currentColor = '#6B7280',
  onColorChange,
  position,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'presets' | 'custom'>('quick');
  const [customColor, setCustomColor] = useState(currentColor);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [favoriteColors, setFavoriteColors] = useState<string[]>(['#3B82F6', '#10B981', '#F59E0B']);
  const [isLocked, setIsLocked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Load recent colors from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('nodeColorPickerRecent');
    if (stored) {
      try {
        setRecentColors(JSON.parse(stored));
      } catch (e) {
        logger.error('Failed to parse recent colors');
      }
    }
  }, []);

  // Save recent colors
  const addToRecent = (color: string) => {
    const updated = [color, ...recentColors.filter(c => c !== color)].slice(0, 5);
    setRecentColors(updated);
    localStorage.setItem('nodeColorPickerRecent', JSON.stringify(updated));
  };

  // Handle color selection
  const handleColorSelect = (color: string) => {
    if (isLocked) return;
    onColorChange(nodeId, color);
    addToRecent(color);
    onClose();
  };

  // Toggle favorite
  const toggleFavorite = (color: string) => {
    const updated = favoriteColors.includes(color)
      ? favoriteColors.filter(c => c !== color)
      : [...favoriteColors, color].slice(0, 8);
    setFavoriteColors(updated);
  };

  // Reset to default
  const handleReset = () => {
    onColorChange(nodeId, '#6B7280');
    onClose();
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95"
      style={{
        left: position?.x || '50%',
        top: position?.y || '50%',
        transform: !position ? 'translate(-50%, -50%)' : undefined,
        width: 300,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-purple-600" />
          <span className="font-semibold text-gray-900">Node Color</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`p-1.5 rounded-lg transition-colors ${
              isLocked ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100 text-gray-500'
            }`}
            title={isLocked ? 'Unlock color changes' : 'Lock color'}
          >
            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            title="Reset to default"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Current color preview */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-lg shadow-inner border-2 border-white"
          style={{ backgroundColor: currentColor }}
        />
        <div>
          <p className="text-sm font-medium text-gray-900">Current Color</p>
          <p className="text-xs text-gray-500 font-mono uppercase">{currentColor}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['quick', 'presets', 'custom'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'quick' && (
          <div className="space-y-4">
            {/* Favorites */}
            {favoriteColors.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                  <Star size={10} /> Favorites
                </p>
                <div className="flex flex-wrap gap-2">
                  {favoriteColors.map(color => (
                    <button
                      key={color}
                      onClick={() => handleColorSelect(color)}
                      className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${
                        currentColor === color ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {currentColor === color && (
                        <Check size={14} className="text-white m-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent */}
            {recentColors.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Recent</p>
                <div className="flex flex-wrap gap-2">
                  {recentColors.map(color => (
                    <button
                      key={color}
                      onClick={() => handleColorSelect(color)}
                      className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${
                        currentColor === color ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick palette */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">All Colors</p>
              <div className="grid grid-cols-10 gap-1">
                {QUICK_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      toggleFavorite(color);
                    }}
                    className={`w-6 h-6 rounded transition-transform hover:scale-125 ${
                      currentColor === color ? 'ring-2 ring-purple-500 ring-offset-1' : ''
                    } ${favoriteColors.includes(color) ? 'ring-1 ring-amber-400' : ''}`}
                    style={{ backgroundColor: color }}
                    title={`${color} - Right-click to favorite`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'presets' && (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {['Triggers', 'Data', 'Actions', 'Logic', 'Neutral'].map(category => (
              <div key={category}>
                <p className="text-xs font-medium text-gray-500 mb-2">{category}</p>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_PRESETS.filter(p => p.category === category).map(preset => (
                    <button
                      key={preset.color}
                      onClick={() => handleColorSelect(preset.color)}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all hover:border-gray-300 ${
                        currentColor === preset.color
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span className="text-xs text-gray-700 truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="space-y-4">
            {/* Color input */}
            <div className="flex items-center gap-3">
              <div
                className="w-16 h-16 rounded-lg shadow-inner border-2 border-white cursor-pointer"
                style={{ backgroundColor: customColor }}
                onClick={() => colorInputRef.current?.click()}
              />
              <input
                ref={colorInputRef}
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="sr-only"
              />
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Hex Color
                </label>
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      setCustomColor(val);
                    }
                  }}
                  className="w-full px-3 py-2 font-mono text-sm uppercase border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* RGB sliders could be added here */}
            <div className="text-center">
              <button
                onClick={() => colorInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Pipette size={16} />
                Pick Color
              </button>
            </div>

            {/* Apply button */}
            <button
              onClick={() => handleColorSelect(customColor)}
              disabled={!/^#[0-9A-Fa-f]{6}$/.test(customColor)}
              className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Apply Color
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        Right-click colors to add to favorites
      </div>
    </div>
  );
};

export default NodeColorPicker;
