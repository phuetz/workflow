import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Workflow, Settings, HelpCircle, Moon, Sun, ChevronDown, LogOut, UserCircle, Menu, X } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import NotificationCenter from './NotificationCenter';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { userService } from '../../services/UserService';
import { connectionStatusService, ConnectionInfo } from '../../services/ConnectionStatusService';

// Navigation items configuration
const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/workflows', label: 'Workflows', icon: '📊', matchStart: true },
  { path: '/marketplace', label: 'Marketplace', icon: '🛒' },
  { path: '/documentation', label: 'Documentation', icon: '📖' },
  { path: '/scheduling', label: 'Scheduling', icon: '🕐' },
  { path: '/import-export', label: 'Import/Export', icon: '📦' },
  { path: '/variables', label: 'Variables', icon: '🔧' },
  { path: '/subworkflows', label: 'Sub-workflows', icon: '🔗' },
  { path: '/sla', label: 'SLA', icon: '📊' },
  { path: '/data-transform', label: 'Transform', icon: '🧪' },
  { path: '/sharing', label: 'Sharing', icon: '🌐' },
  { path: '/api', label: 'API', icon: '🔑' },
  { path: '/community', label: 'Community', icon: '🌐' },
  { path: '/deployment', label: 'Deploy', icon: '🚀' },
  { path: '/backup', label: 'Backup', icon: '💾' },
];

export default function Header() {
  const { darkMode, toggleDarkMode } = useWorkflowStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(userService.getCurrentUser());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>(connectionStatusService.getConnectionInfo());
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Check if a path is active
  const isActive = useCallback((path: string, matchStart = false) => {
    if (matchStart) {
      return location.pathname.startsWith(path);
    }
    return location.pathname === path;
  }, [location.pathname]);

  // Handle user change
  const handleUserChange = useCallback(() => {
    setCurrentUser(userService.getCurrentUser());
  }, []);

  useEffect(() => {
    userService.on('userLoaded', handleUserChange);
    userService.on('profileUpdated', handleUserChange);
    userService.on('logout', () => setCurrentUser(null));

    // Initialize demo user if no user is logged in
    userService.initializeDemoUser();

    // Subscribe to connection status changes
    const unsubscribeConnection = connectionStatusService.subscribe((info) => {
      setConnectionInfo(info);
    });

    return () => {
      userService.off('userLoaded', handleUserChange);
      userService.off('profileUpdated', handleUserChange);
      userService.off('logout', () => setCurrentUser(null));
      unsubscribeConnection();
    };
  }, [handleUserChange]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

  // Handle escape key to close menus
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMobileMenu(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = async () => {
    await userService.logout();
    navigate('/login');
  };

  // Render navigation link with proper accessibility
  const renderNavLink = (item: typeof navItems[0], isMobile = false) => {
    const active = isActive(item.path, item.matchStart);
    const baseClasses = isMobile
      ? `block px-4 py-3 text-sm font-medium transition-colors ${
          active
            ? darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
            : darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      : `text-sm font-medium transition-colors ${
          active
            ? darkMode ? 'text-white' : 'text-gray-900'
            : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
        }`;

    return (
      <Link
        key={item.path}
        to={item.path}
        className={baseClasses}
        aria-current={active ? 'page' : undefined}
      >
        <span aria-hidden="true">{item.icon}</span> {item.label}
      </Link>
    );
  };

  return (
    <>
      {/* Skip Navigation Link - Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none"
      >
        Skip to main content
      </a>

      <header
        className={`${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4 fixed top-0 left-0 right-0 z-50`}
        role="banner"
      >
        <div className="flex items-center justify-between">
          {/* Logo and title */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-3" aria-label="WorkflowBuilder Pro - Home">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Workflow size={20} className="text-white" aria-hidden="true" />
              </div>
              <div className="hidden sm:block">
                <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  WorkflowBuilder Pro
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Plateforme d'automatisation visuelle
                </p>
              </div>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`lg:hidden p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'} transition-colors`}
            aria-expanded={showMobileMenu}
            aria-controls="mobile-menu"
            aria-label={showMobileMenu ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {showMobileMenu ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>

          {/* Desktop Navigation */}
          <nav
            className="hidden lg:flex items-center space-x-6 overflow-x-auto max-w-[60%]"
            aria-label="Main navigation"
          >
            {navItems.map((item) => renderNavLink(item))}
          </nav>

          {/* Right side actions */}
          <div className="hidden sm:flex items-center space-x-4">
            {/* Real-time status indicator */}
            <div
              className="flex items-center space-x-2"
              role="status"
              aria-live="polite"
              aria-label={`Connection status: ${connectionStatusService.getStatusText()}, Latency: ${connectionInfo.latency}ms`}
            >
              <div
                className={`w-2 h-2 ${connectionStatusService.getStatusColor()} rounded-full ${connectionInfo.status === 'online' ? 'animate-pulse' : ''}`}
                aria-hidden="true"
              />
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {connectionStatusService.getStatusText()}
              </span>
            </div>

            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'} transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={darkMode}
            >
              {darkMode ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
            </button>

            {/* Notification center */}
            <NotificationCenter />

            {/* Help */}
            <button
              type="button"
              onClick={() => navigate('/documentation')}
              className={`p-2 rounded-lg ${darkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label="Help and Documentation"
            >
              <HelpCircle size={20} aria-hidden="true" />
            </button>

            {/* Settings */}
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className={`p-2 rounded-lg ${darkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label="Settings"
            >
              <Settings size={20} aria-hidden="true" />
            </button>

            {/* User profile */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center space-x-3 p-2 rounded-lg ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500`}
                aria-expanded={showUserMenu}
                aria-haspopup="menu"
                aria-label={`User menu for ${currentUser?.name || 'Guest User'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${darkMode ? 'bg-gray-600' : 'bg-blue-500'}`}
                  aria-hidden="true"
                >
                  {currentUser ? userService.getInitials() : 'G'}
                </div>
                <div className="hidden md:block text-left">
                  <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentUser?.name || 'Guest User'}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} capitalize`}>
                    {currentUser?.plan || 'free'} Plan
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${showUserMenu ? 'rotate-180' : ''} ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                  aria-hidden="true"
                />
              </button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <div
                  className={`absolute right-0 mt-2 w-64 rounded-lg shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}
                  role="menu"
                  aria-orientation="vertical"
                  aria-label="User menu"
                >
                  <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {currentUser?.name || 'Guest User'}
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {currentUser?.email || 'guest@workflow-editor.com'}
                    </p>
                  </div>

                  <div className="py-2" role="none">
                    <button
                      onClick={() => {
                        navigate('/profile');
                        setShowUserMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'} transition-colors flex items-center space-x-2`}
                      role="menuitem"
                    >
                      <UserCircle size={16} aria-hidden="true" />
                      <span>My Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate('/settings');
                        setShowUserMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'} transition-colors flex items-center space-x-2`}
                      role="menuitem"
                    >
                      <Settings size={16} aria-hidden="true" />
                      <span>Settings</span>
                    </button>

                    <hr className={`my-2 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`} role="separator" />

                    <button
                      onClick={handleLogout}
                      className={`w-full px-4 py-2 text-left text-sm ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors flex items-center space-x-2 text-red-500`}
                      role="menuitem"
                    >
                      <LogOut size={16} aria-hidden="true" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div
            id="mobile-menu"
            ref={mobileMenuRef}
            className={`lg:hidden absolute top-full left-0 right-0 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-lg max-h-[70vh] overflow-y-auto`}
            role="navigation"
            aria-label="Mobile navigation"
          >
            <nav className="py-2">
              {navItems.map((item) => renderNavLink(item, true))}
            </nav>

            {/* Mobile menu actions */}
            <div className={`px-4 py-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {connectionStatusService.getStatusText()}
                </span>
                <div
                  className={`w-2 h-2 ${connectionStatusService.getStatusColor()} rounded-full`}
                  aria-hidden="true"
                />
              </div>

              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className={`flex-1 py-2 px-4 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'} text-sm font-medium`}
                  aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate('/settings');
                    setShowMobileMenu(false);
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'} text-sm font-medium`}
                  aria-label="Settings"
                >
                  Settings
                </button>
              </div>

              {/* User info in mobile menu */}
              <div className={`mt-3 pt-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${darkMode ? 'bg-gray-600' : 'bg-blue-500'}`}
                  >
                    {currentUser ? userService.getInitials() : 'G'}
                  </div>
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentUser?.name || 'Guest User'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-red-500 text-sm font-medium"
                  aria-label="Logout"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}