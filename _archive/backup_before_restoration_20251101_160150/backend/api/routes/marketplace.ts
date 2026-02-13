/**
 * Marketplace API Routes
 * Endpoints for app and plugin marketplace
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// Marketplace API info endpoint
router.get('/', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Marketplace API',
    endpoints: [
      'GET /api/marketplace/apps/featured - Get featured apps',
      'GET /api/marketplace/apps - List all apps',
      'GET /api/marketplace/apps/:id - Get app details',
      'POST /api/marketplace/apps/:id/install - Install app (auth required)',
      'DELETE /api/marketplace/apps/:id/uninstall - Uninstall app (auth required)',
      'GET /api/marketplace/plugins - List plugins',
      'POST /api/marketplace/plugins/:id/install - Install plugin (auth required)'
    ]
  });
}));

// Public routes (no auth required)

// Get featured apps
router.get('/apps/featured', asyncHandler(async (req, res) => {
  const featuredApps = [
    {
      id: 'slack-advanced',
      name: 'Slack Advanced Integration',
      description: 'Complete Slack integration with advanced features',
      icon: '💬',
      category: 'Communication',
      rating: 4.8,
      installs: 15420,
      price: 0,
      author: 'WorkflowPro Team',
      verified: true
    },
    {
      id: 'ai-assistant',
      name: 'AI Workflow Assistant',
      description: 'GPT-powered workflow automation and optimization',
      icon: '🤖',
      category: 'AI & ML',
      rating: 4.9,
      installs: 8932,
      price: 9.99,
      author: 'AI Labs',
      verified: true
    },
    {
      id: 'github-actions',
      name: 'GitHub Actions Sync',
      description: 'Sync workflows with GitHub Actions',
      icon: '🐙',
      category: 'Development',
      rating: 4.7,
      installs: 12304,
      price: 0,
      author: 'DevTools Inc',
      verified: true
    }
  ];

  res.json(featuredApps);
}));

// Search apps
router.get('/apps/search', asyncHandler(async (req, res) => {
  const { q, category, sort = 'popular' } = req.query;

  // Simulate app search
  let apps = [
    {
      id: 'salesforce-sync',
      name: 'Salesforce Sync',
      description: 'Two-way sync with Salesforce CRM',
      icon: '☁️',
      category: 'CRM',
      rating: 4.6,
      installs: 5421,
      price: 19.99
    },
    {
      id: 'google-sheets',
      name: 'Google Sheets Integration',
      description: 'Read and write Google Sheets data',
      icon: '📊',
      category: 'Productivity',
      rating: 4.5,
      installs: 18745,
      price: 0
    }
  ];

  let filtered = apps;
  const query = typeof q === 'string' ? q.toLowerCase() : '';

  // Filter by search query
  if (query) {
    filtered = apps.filter(app =>
      app.name.toLowerCase().includes(query) ||
      app.description.toLowerCase().includes(query)
    );
  }

  // Filter by category
  if (category) {
    filtered = filtered.filter(app => app.category === category);
  }

  // Sort results
  if (sort === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'installs') {
    filtered.sort((a, b) => b.installs - a.installs);
  }

  res.json(filtered);
}));

// Get app details
router.get('/apps/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Simulate app details
  const app = {
    id,
    name: 'Sample App',
    description: 'Detailed description of the app',
    longDescription: 'This is a longer description with more details about features and capabilities.',
    icon: '📱',
    category: 'Productivity',
    rating: 4.7,
    installs: 10000,
    price: 0,
    screenshots: ['/screenshot1.png', '/screenshot2.png'],
    features: [
      'Feature 1: Advanced automation',
      'Feature 2: Real-time sync',
      'Feature 3: Custom configurations'
    ],
    requirements: [
      'WorkflowPro v2.0+',
      'API access enabled'
    ],
    changelog: [
      { version: '1.2.0', date: '2024-01-15', changes: ['Added new features', 'Bug fixes'] },
      { version: '1.1.0', date: '2023-12-01', changes: ['Performance improvements'] }
    ],
    author: {
      name: 'App Developer',
      website: 'https://example.com',
      support: 'support@example.com'
    }
  };

  res.json(app);
}));

// Get app categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = [
    { id: 'communication', name: 'Communication', icon: '💬', count: 45 },
    { id: 'crm', name: 'CRM', icon: '👥', count: 23 },
    { id: 'development', name: 'Development', icon: '💻', count: 67 },
    { id: 'ai-ml', name: 'AI & ML', icon: '🤖', count: 34 },
    { id: 'productivity', name: 'Productivity', icon: '📈', count: 89 },
    { id: 'marketing', name: 'Marketing', icon: '📣', count: 56 },
    { id: 'finance', name: 'Finance', icon: '💰', count: 28 },
    { id: 'analytics', name: 'Analytics', icon: '📊', count: 41 }
  ];

  res.json(categories);
}));

// Protected routes (auth required)

// Get installed apps
router.get('/installed', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  // Get user's installed apps
  const installedApps = [
    {
      id: 'slack-advanced',
      name: 'Slack Advanced Integration',
      icon: '💬',
      installedAt: '2024-01-10T10:00:00Z',
      status: 'active',
      config: {}
    }
  ];

  res.json(installedApps);
}));

// Install app
router.post('/install/:id', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  // Simulate app installation
  res.json({
    success: true,
    appId: id,
    message: 'App installed successfully'
  });
}));

// Uninstall app
router.delete('/uninstall/:id', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  // Simulate app uninstallation
  res.json({
    success: true,
    appId: id,
    message: 'App uninstalled successfully'
  });
}));

// Update app configuration
router.put('/apps/:id/config', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { config } = req.body;

  // Simulate config update
  res.json({
    success: true,
    appId: id,
    config
  });
}));

// Submit app review
router.post('/apps/:id/reviews', authMiddleware, asyncHandler(async (req: AuthRequest, res) => {
  const { rating } = req.body;
  
  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, 'Rating must be between 1 and 5');
  }

  // Simulate review submission
  res.json({
    success: true,
    reviewId: Math.random().toString(36).substring(2, 15)
  });
}));

export const marketplaceRouter = router;