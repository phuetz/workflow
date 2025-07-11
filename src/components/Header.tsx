import React from 'react';
import { Workflow, Settings, User, HelpCircle, Moon, Sun } from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';
import NotificationCenter from './NotificationCenter';

export default function Header() {
  const { darkMode, toggleDarkMode } = useWorkflowStore();

  return (
    <header className={`${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4`}>
      <div className="flex items-center justify-between">
        {/* Logo and title */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Workflow size={20} className="text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              WorkflowBuilder Pro
            </h1>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Plateforme d'automatisation visuelle
            </p>
          </div>
        </div>

        {/* Navigation centrale */}
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#" className={`text-sm font-medium ${darkMode ? 'text-white hover:text-gray-300' : 'text-gray-900 hover:text-gray-700'} transition-colors`}>
            🏠 Accueil
          </a>
          <a href="#" className={`text-sm font-medium ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
            📊 Dashboard
          </a>
          <a href="#" className={`text-sm font-medium ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
            🛒 Marketplace
          </a>
          <a href="#" className={`text-sm font-medium ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
            📖 Documentation
          </a>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {/* Status indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              En ligne
            </span>
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Notification center */}
          <NotificationCenter />
          {/* Notification center */}
          <NotificationCenter />

          {/* Help */}
          <button className={`p-2 ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
            <HelpCircle size={20} />
          </button>

          {/* Settings */}
          <button className={`p-2 ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
            <Settings size={20} />
          </button>

          {/* User profile */}
          <div className="flex items-center space-x-3">
            <button className={`p-2 ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
              <User size={20} />
            </button>
            <div className="hidden md:block">
              <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                John Doe
              </div>
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Plan Pro
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}