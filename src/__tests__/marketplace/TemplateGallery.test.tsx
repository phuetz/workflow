/**
 * TemplateGallery Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TemplateGallery } from '../../components/marketplace/TemplateGallery';
import { WorkflowTemplate } from '../../types/templates';

// Mock useWorkflowStore
vi.mock('../../store/workflowStore', () => ({
  useWorkflowStore: () => ({
    darkMode: false
  })
}));

// Mock fetch
global.fetch = vi.fn();

const mockTemplates: WorkflowTemplate[] = [
  {
    id: 'template-1',
    name: 'Test Template 1',
    description: 'Test description 1',
    category: 'business_automation',
    author: 'Test Author',
    authorType: 'official',
    tags: ['automation', 'test'],
    difficulty: 'beginner',
    workflow: { nodes: [], edges: [] },
    version: '1.0.0',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    downloads: 1000,
    rating: 4.5,
    reviewCount: 50,
    featured: true,
    requiredIntegrations: [],
    requiredCredentials: [],
    estimatedSetupTime: 10,
    documentation: { overview: 'Test', setup: [], usage: 'Test' },
    screenshots: [],
    customizableFields: [],
    pricing: 'free'
  } as WorkflowTemplate
];

describe('TemplateGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      json: async () => ({ templates: mockTemplates })
    });
  });

  it('renders gallery with templates', async () => {
    render(<TemplateGallery />);

    await waitFor(() => {
      expect(screen.getByText('Template Marketplace')).toBeInTheDocument();
    });
  });

  it('switches between grid and list views', async () => {
    render(<TemplateGallery />);

    const listButton = screen.getByLabelText('List view');
    fireEvent.click(listButton);

    // List view should be active
    expect(listButton).toHaveClass('bg-purple-500');
  });

  it('filters templates by category', async () => {
    render(<TemplateGallery />);

    await waitFor(() => {
      const categoryButton = screen.getByText('Business Automation');
      fireEvent.click(categoryButton);
    });

    // Should filter templates
    await waitFor(() => {
      expect(screen.getByText(/templates found/)).toBeInTheDocument();
    });
  });

  it('searches templates', async () => {
    render(<TemplateGallery />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/Search templates/i);
      fireEvent.change(searchInput, { target: { value: 'automation' } });
    });

    // Should filter by search query
    await waitFor(() => {
      expect(screen.getByText(/templates found/)).toBeInTheDocument();
    });
  });

  it('handles template selection', async () => {
    const onSelect = vi.fn();
    render(<TemplateGallery onTemplateSelect={onSelect} />);

    await waitFor(() => {
      const template = screen.getByText('Test Template 1');
      fireEvent.click(template);
    });

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'template-1'
    }));
  });

  it('clears filters', async () => {
    render(<TemplateGallery />);

    await waitFor(() => {
      // Apply some filters
      const difficultySelect = screen.getByLabelText('Difficulty');
      fireEvent.change(difficultySelect, { target: { value: 'beginner' } });
    });

    // Clear filters
    const clearButton = screen.getByText(/Clear/i);
    fireEvent.click(clearButton);

    // Filters should be reset
    await waitFor(() => {
      expect(screen.queryByText(/Clear \(\d+\)/)).not.toBeInTheDocument();
    });
  });

  it('paginates results', async () => {
    // Mock many templates
    const manyTemplates = Array.from({ length: 25 }, (_, i) => ({
      ...mockTemplates[0],
      id: `template-${i}`,
      name: `Template ${i}`
    }));

    (global.fetch as any).mockResolvedValue({
      json: async () => ({ templates: manyTemplates })
    });

    render(<TemplateGallery />);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
    });

    // Navigate to next page
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();
    });
  });

  it('sorts templates', async () => {
    render(<TemplateGallery />);

    await waitFor(() => {
      const sortSelect = screen.getByDisplayValue('Most Popular');
      fireEvent.change(sortSelect, { target: { value: 'rating' } });
    });

    // Should re-sort templates
    await waitFor(() => {
      expect(screen.getByDisplayValue('Highest Rated')).toBeInTheDocument();
    });
  });
});
