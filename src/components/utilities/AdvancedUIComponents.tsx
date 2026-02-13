/**
 * Advanced UI Components
 * Modern, accessible, and highly interactive UI components
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
// import { useDrag, useDrop } from 'react-dnd';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'react-hot-toast';

// Advanced Data Table with virtualization, sorting, filtering
export const AdvancedDataTable: React.FC<{
  data: Record<string, unknown>[];
  columns: Array<{
    key: string;
    header: string;
    sortable?: boolean;
    filterable?: boolean;
    render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  }>;
  onRowClick?: (row: Record<string, unknown>) => void;
  onSelectionChange?: (selectedRows: Record<string, unknown>[]) => void;
  height?: number;
}> = ({ data, columns, onRowClick, onSelectionChange, height = 600 }) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const tableRef = useRef<HTMLDivElement>(null);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(row => 
          String(row[key]).toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, filters, sortConfig]);

  // Virtualization
  const rowVirtualizer = useVirtualizer({
    count: processedData.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectRow = (index: number, selected: boolean) => {
    const newSelected = new Set(selectedRows);
    if (selected) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedRows(newSelected);
    onSelectionChange?.(Array.from(newSelected).map(i => processedData[i]));
  };

  const handleSelectAll = (selected: boolean) => {
    const allIndices = new Set(processedData.map((_, i) => i));
    if (selected) {
      setSelectedRows(allIndices);
      onSelectionChange?.(processedData);
    } else {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    }
  };

  return (
    <div className="advanced-data-table">
      {/* Filters */}
      <div className="table-filters mb-4">
        {columns.filter(col => col.filterable).map(column => (
          <input
            key={column.key}
            type="text"
            placeholder={`Filter ${column.header}...`}
            value={filters[column.key] || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, [column.key]: e.target.value }))}
            className="filter-input mr-2 px-3 py-2 border rounded-lg"
          />
        ))}
      </div>

      {/* Table */}
      <div 
        ref={tableRef}
        className="table-container"
        style={{ height, overflow: 'auto' }}
      >
        <div style={{ height: rowVirtualizer.getTotalSize() }}>
          {/* Header */}
          <div className="table-header sticky top-0 bg-white z-10 border-b">
            <div className="flex items-center">
              <div className="w-12 p-2">
                <input
                  type="checkbox"
                  checked={selectedRows.size === processedData.length && processedData.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </div>
              {columns.map(column => (
                <div 
                  key={column.key}
                  className={`flex-1 p-3 font-semibold ${column.sortable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.header}
                    {column.sortable && sortConfig?.key === column.key && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Virtual Rows */}
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const row = processedData[virtualRow.index];
            const isSelected = selectedRows.has(virtualRow.index);

            return (
              <motion.div
                key={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`table-row flex items-center border-b hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                onClick={() => onRowClick?.(row)}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.1 }}
              >
                <div className="w-12 p-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleSelectRow(virtualRow.index, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {columns.map(column => (
                  <div key={column.key} className="flex-1 p-3">
                    {column.render ? column.render(row[column.key], row) : String(row[column.key] ?? '')}
                  </div>
                ))}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="table-footer mt-2 text-sm text-gray-600">
        Showing {processedData.length} of {data.length} items
        {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
      </div>
    </div>
  );
};

// Advanced Command Palette
export const CommandPalette: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  commands: Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    action: () => void;
    keywords?: string[];
  }>;
}> = ({ isOpen, onClose, commands }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = useMemo(() => {
    if (!search) return commands;

    const searchLower = search.toLowerCase();
    return commands.filter(command => {
      return (
        command.title.toLowerCase().includes(searchLower) ||
        command.subtitle?.toLowerCase().includes(searchLower) ||
        command.keywords?.some(keyword => keyword.toLowerCase().includes(searchLower))
      );
    });
  }, [commands, search]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  useHotkeys('up', () => {
    setSelectedIndex(prev => Math.max(0, prev - 1));
  }, { enabled: isOpen });

  useHotkeys('down', () => {
    setSelectedIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
  }, { enabled: isOpen });

  useHotkeys('enter', () => {
    if (filteredCommands[selectedIndex]) {
      filteredCommands[selectedIndex].action();
      onClose();
    }
  }, { enabled: isOpen });

  useHotkeys('escape', onClose, { enabled: isOpen });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-32"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="command-palette bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="p-4 border-b">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-lg bg-transparent outline-none"
            />
          </div>

          {/* Commands List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No commands found for "{search}"
              </div>
            ) : (
              filteredCommands.map((command, index) => (
                <motion.div
                  key={command.id}
                  className={`command-item p-4 cursor-pointer flex items-center ${
                    index === selectedIndex ? 'bg-blue-50 border-r-2 border-blue-500' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    command.action();
                    onClose();
                  }}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.1 }}
                >
                  {command.icon && (
                    <div className="mr-3 text-gray-600">
                      {command.icon}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{command.title}</div>
                    {command.subtitle && (
                      <div className="text-sm text-gray-500">{command.subtitle}</div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Advanced Drag & Drop File Upload
export const AdvancedFileUpload: React.FC<{
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
}> = ({ onFilesSelected, accept, multiple = true, maxSize = 10 * 1024 * 1024, maxFiles = 10 }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Temporarily disable drag and drop until react-dnd is properly set up
  const isOver = false;
  const drop = (el: any) => el;

  /*const [{ isOver }, drop] = useDrop({
    accept: 'Files',
    drop: (item: unknown, monitor: unknown) => {
      handleFiles(files);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });*/

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);

    // Validate files
    const validFiles = fileArray.filter(file => {
      if (maxSize && file.size > maxSize) {
        toast.error(`File ${file.name} is too large (max ${maxSize / 1024 / 1024}MB)`);
        return false;
      }
      return true;
    }).slice(0, maxFiles);

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);

      // Simulate upload progress
      validFiles.forEach(file => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 30;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
          }
          setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        }, 200);
      });
    }
  }, [onFilesSelected, maxSize, maxFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div
      ref={drop}
      className={`advanced-file-upload relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
        isDragOver || isOver
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />

      <motion.div
        animate={{ scale: isDragOver || isOver ? 1.05 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="text-4xl mb-4">📁</div>
        <h3 className="text-lg font-semibold mb-2">
          {isDragOver || isOver ? 'Drop files here' : 'Upload files'}
        </h3>
        <p className="text-gray-600 mb-4">
          Drag and drop files here, or{' '}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            browse
          </button>
        </p>
        <div className="text-sm text-gray-500">
          {accept && <div>Accepted: {accept}</div>}
          {maxSize && <div>Max size: {maxSize / 1024 / 1024}MB</div>}
          {maxFiles && <div>Max files: {maxFiles}</div>}
        </div>
      </motion.div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="mt-4 space-y-2">
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="text-left">
              <div className="flex justify-between text-sm">
                <span className="truncate">{fileName}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <motion.div
                  className="bg-blue-600 h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Advanced Toast Notifications System
export const ToastManager: React.FC = () => {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    action?: { label: string; onClick: () => void };
    duration?: number;
  }>>([]);

  const addToast = useCallback((toast: typeof toasts[0]) => {
    const id = Date.now().toString();
    const newToast = { ...toast, id };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Expose global toast functions
  useEffect(() => {
    (window as unknown as Record<string, unknown>).showToast = addToast;
  }, [addToast]);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className={`toast-notification max-w-sm bg-white rounded-lg shadow-lg border-l-4 p-4 ${
              toast.type === 'success' ? 'border-green-500' :
              toast.type === 'error' ? 'border-red-500' :
              toast.type === 'warning' ? 'border-yellow-500' :
              'border-blue-500'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{toast.title}</h4>
                {toast.message && (
                  <p className="text-sm text-gray-600 mt-1">{toast.message}</p>
                )}
                {toast.action && (
                  <button
                    onClick={toast.action.onClick}
                    className="text-sm text-blue-600 hover:text-blue-700 mt-2"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Advanced Modal System
export const AdvancedModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    loading?: boolean;
  }>;
}> = ({ isOpen, onClose, title, children, size = 'md', actions }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useHotkeys('escape', onClose, { enabled: isOpen });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`advanced-modal bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`}
        >
          {/* Header */}
          <div className="modal-header px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="modal-content flex-1 overflow-y-auto p-6">
            {children}
          </div>

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="modal-actions px-6 py-4 border-t flex justify-end space-x-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  disabled={action.loading}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    action.variant === 'primary'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : action.variant === 'danger'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  } ${action.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {action.loading ? '...' : action.label}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default {
  AdvancedDataTable,
  CommandPalette,
  AdvancedFileUpload,
  ToastManager,
  AdvancedModal
};