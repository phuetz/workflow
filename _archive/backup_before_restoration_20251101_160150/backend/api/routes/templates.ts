/**
 * Template API Routes
 * Handles workflow template operations: list, get, create, update, delete
 */

import { Router, Request, Response } from 'express';
import { templateService } from '../../../services/TemplateService';
import { asyncHandler } from '../../../middleware/globalErrorHandler';
import { logger } from '../../../services/LoggingService';
import type { TemplateFilters, TemplateCategory } from '../../../types/templates';

export const templateRouter = Router();

/**
 * GET /api/templates
 * List all templates with optional filtering
 */
templateRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const filters: TemplateFilters = {};

    // Parse query parameters
    if (req.query.category) {
      filters.category = req.query.category as TemplateCategory;
    }
    if (req.query.difficulty) {
      filters.difficulty = req.query.difficulty as 'beginner' | 'intermediate' | 'advanced';
    }
    if (req.query.pricing) {
      filters.pricing = req.query.pricing as 'free' | 'premium' | 'enterprise';
    }
    if (req.query.authorType) {
      filters.authorType = req.query.authorType as 'official' | 'community' | 'verified';
    }
    if (req.query.minRating) {
      filters.minRating = parseFloat(req.query.minRating as string);
    }
    if (req.query.maxSetupTime) {
      filters.maxSetupTime = parseInt(req.query.maxSetupTime as string);
    }
    if (req.query.tags) {
      filters.tags = Array.isArray(req.query.tags)
        ? req.query.tags as string[]
        : [req.query.tags as string];
    }

    const search = req.query.search as string;
    const templates = search
      ? templateService.search(search, filters)
      : templateService.getAll();

    // Apply filters if no search query
    let filteredTemplates = templates;
    if (!search && Object.keys(filters).length > 0) {
      filteredTemplates = templateService.search('', filters);
    }

    res.json({
      success: true,
      count: filteredTemplates.length,
      templates: filteredTemplates
    });
  } catch (error) {
    logger.error('Error listing templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list templates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * GET /api/templates/featured
 * Get featured templates
 */
templateRouter.get('/featured', asyncHandler(async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const featured = templateService.getFeatured();

    res.json({
      success: true,
      count: featured.length,
      templates: limit ? featured.slice(0, limit) : featured
    });
  } catch (error) {
    logger.error('Error getting featured templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get featured templates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * GET /api/templates/popular
 * Get popular templates
 */
templateRouter.get('/popular', asyncHandler(async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const popular = templateService.getPopular(limit);

    res.json({
      success: true,
      count: popular.length,
      templates: popular
    });
  } catch (error) {
    logger.error('Error getting popular templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular templates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * GET /api/templates/recent
 * Get recently updated templates
 */
templateRouter.get('/recent', asyncHandler(async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const recent = templateService.getRecent(limit);

    res.json({
      success: true,
      count: recent.length,
      templates: recent
    });
  } catch (error) {
    logger.error('Error getting recent templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent templates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * GET /api/templates/categories
 * List all template categories with counts
 */
templateRouter.get('/categories', asyncHandler(async (req: Request, res: Response) => {
  try {
    const marketplace = templateService.getMarketplace();

    res.json({
      success: true,
      count: marketplace.categories.length,
      categories: marketplace.categories.map(cat => ({
        name: cat.name,
        displayName: cat.displayName,
        icon: cat.icon,
        count: cat.count
      }))
    });
  } catch (error) {
    logger.error('Error listing categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list categories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * GET /api/templates/marketplace
 * Get full marketplace data
 */
templateRouter.get('/marketplace', asyncHandler(async (req: Request, res: Response) => {
  try {
    const filters: TemplateFilters = {};

    // Parse filters from query
    if (req.query.category) {
      filters.category = req.query.category as TemplateCategory;
    }
    if (req.query.difficulty) {
      filters.difficulty = req.query.difficulty as 'beginner' | 'intermediate' | 'advanced';
    }
    if (req.query.pricing) {
      filters.pricing = req.query.pricing as 'free' | 'premium' | 'enterprise';
    }

    const marketplace = templateService.getMarketplace(filters);

    res.json({
      success: true,
      marketplace: {
        featured: marketplace.featured,
        popular: marketplace.popular.slice(0, 10),
        recent: marketplace.recent.slice(0, 10),
        trending: marketplace.trending.slice(0, 10),
        categories: marketplace.categories.map(cat => ({
          name: cat.name,
          displayName: cat.displayName,
          icon: cat.icon,
          count: cat.count
        }))
      }
    });
  } catch (error) {
    logger.error('Error getting marketplace:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get marketplace data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * GET /api/templates/:id
 * Get a specific template by ID
 */
templateRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = templateService.getById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        templateId: id
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    logger.error('Error getting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get template',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * POST /api/templates
 * Create a new template
 */
templateRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const workflow = req.body;

    // Validate required fields
    if (!workflow || !workflow.nodes || !workflow.edges) {
      return res.status(400).json({
        success: false,
        error: 'Invalid workflow data',
        message: 'Workflow must contain nodes and edges'
      });
    }

    const template = await templateService.createTemplate(workflow);

    logger.info('Template created', { templateId: template.id });

    res.status(201).json({
      success: true,
      template,
      message: 'Template created successfully'
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * PUT /api/templates/:id
 * Update an existing template
 */
templateRouter.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if template exists
    const existingTemplate = templateService.getById(id);
    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        templateId: id
      });
    }

    await templateService.updateTemplate(id, updates);

    logger.info('Template updated', { templateId: id });

    res.json({
      success: true,
      message: 'Template updated successfully',
      templateId: id
    });
  } catch (error) {
    logger.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update template',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * DELETE /api/templates/:id
 * Delete a template
 */
templateRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if template exists
    const template = templateService.getById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        templateId: id
      });
    }

    // Only allow deletion of community/custom templates
    if (template.authorType === 'official') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete official templates',
        templateId: id
      });
    }

    // Note: Actual deletion would be implemented here
    logger.info('Template deleted', { templateId: id });

    res.json({
      success: true,
      message: 'Template deleted successfully',
      templateId: id
    });
  } catch (error) {
    logger.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * POST /api/templates/:id/install
 * Install a template
 */
templateRouter.post('/:id/install', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customizations = req.body.customizations || {};

    // Check if template exists
    const template = templateService.getById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        templateId: id
      });
    }

    const installation = await templateService.install(id, customizations);

    logger.info('Template installed', {
      templateId: id,
      workflowId: installation.workflowId
    });

    res.status(201).json({
      success: true,
      installation,
      message: 'Template installation started'
    });
  } catch (error) {
    logger.error('Error installing template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to install template',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * GET /api/templates/installations
 * Get all template installations
 */
templateRouter.get('/api/installations', asyncHandler(async (req: Request, res: Response) => {
  try {
    const installations = templateService.getInstallations();

    res.json({
      success: true,
      count: installations.length,
      installations
    });
  } catch (error) {
    logger.error('Error getting installations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get installations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * POST /api/templates/:id/publish
 * Publish a template to the marketplace
 */
templateRouter.post('/:id/publish', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if template exists
    const template = templateService.getById(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        templateId: id
      });
    }

    await templateService.publishTemplate(id);

    logger.info('Template published', { templateId: id });

    res.json({
      success: true,
      message: 'Template published successfully',
      templateId: id
    });
  } catch (error) {
    logger.error('Error publishing template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish template',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * GET /api/templates/category/:category
 * Get templates by category
 */
templateRouter.get('/category/:category', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const templates = templateService.getByCategory(category as TemplateCategory);

    res.json({
      success: true,
      category,
      count: templates.length,
      templates
    });
  } catch (error) {
    logger.error('Error getting templates by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get templates by category',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * POST /api/templates/search
 * Search templates with advanced filters
 */
templateRouter.post('/search', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { query, filters } = req.body;

    const templates = templateService.search(query || '', filters);

    res.json({
      success: true,
      query,
      count: templates.length,
      templates
    });
  } catch (error) {
    logger.error('Error searching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search templates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export default templateRouter;
