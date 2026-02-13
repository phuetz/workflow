/**
 * TemplateCard Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TemplateCard } from '../../components/marketplace/TemplateCard';
import { WorkflowTemplate } from '../../types/templates';

const mockTemplate: WorkflowTemplate = {
  id: 'template-1',
  name: 'Test Template',
  description: 'Test description for template',
  category: 'business_automation',
  author: 'Test Author',
  authorType: 'verified',
  tags: ['automation', 'workflow', 'test'],
  difficulty: 'intermediate',
  workflow: { nodes: [], edges: [] },
  version: '1.0.0',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  downloads: 5420,
  rating: 4.5,
  reviewCount: 124,
  featured: true,
  requiredIntegrations: ['Slack', 'Salesforce'],
  requiredCredentials: ['slack', 'salesforce'],
  estimatedSetupTime: 15,
  documentation: { overview: 'Test overview', setup: [], usage: 'Test usage' },
  screenshots: ['https://example.com/screenshot1.png'],
  customizableFields: [],
  pricing: 'free'
} as WorkflowTemplate;

describe('TemplateCard', () => {
  it('renders template information in grid view', () => {
    render(<TemplateCard template={mockTemplate} />);

    expect(screen.getByText('Test Template')).toBeInTheDocument();
    expect(screen.getByText(/Test description/)).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText(/5.4K/)).toBeInTheDocument(); // Downloads
  });

  it('renders in compact list view', () => {
    render(<TemplateCard template={mockTemplate} compact />);

    expect(screen.getByText('Test Template')).toBeInTheDocument();
    expect(screen.getByText('Install')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const onClick = vi.fn();
    render(<TemplateCard template={mockTemplate} onClick={onClick} />);

    fireEvent.click(screen.getByText('Test Template'));
    expect(onClick).toHaveBeenCalled();
  });

  it('handles favorite toggle', () => {
    const onFavorite = vi.fn();
    render(<TemplateCard template={mockTemplate} onFavorite={onFavorite} />);

    const favoriteButton = screen.getAllByRole('button')[0]; // Heart icon button
    fireEvent.click(favoriteButton);

    expect(onFavorite).toHaveBeenCalledWith(mockTemplate);
  });

  it('handles install action', () => {
    const onInstall = vi.fn();
    render(<TemplateCard template={mockTemplate} onInstall={onInstall} compact />);

    const installButton = screen.getByText('Install');
    fireEvent.click(installButton);

    expect(onInstall).toHaveBeenCalledWith(mockTemplate);
  });

  it('shows featured badge', () => {
    render(<TemplateCard template={mockTemplate} />);

    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('shows verified author badge', () => {
    render(<TemplateCard template={mockTemplate} />);

    // Verified badge should be present
    const badges = screen.getAllByRole('img', { hidden: true });
    expect(badges.length).toBeGreaterThan(0);
  });

  it('displays tags', () => {
    render(<TemplateCard template={mockTemplate} />);

    expect(screen.getByText('automation')).toBeInTheDocument();
    expect(screen.getByText('workflow')).toBeInTheDocument();
  });

  it('shows difficulty level with correct styling', () => {
    render(<TemplateCard template={mockTemplate} />);

    const difficultyBadge = screen.getByText('intermediate');
    expect(difficultyBadge).toHaveClass('text-yellow-500');
  });

  it('formats large numbers correctly', () => {
    const templateWithBigNumbers = {
      ...mockTemplate,
      downloads: 1500000,
      reviewCount: 5432
    };

    render(<TemplateCard template={templateWithBigNumbers} />);

    expect(screen.getByText('1.5M')).toBeInTheDocument();
    expect(screen.getByText('5.4K')).toBeInTheDocument();
  });

  it('shows premium badge for paid templates', () => {
    const premiumTemplate = {
      ...mockTemplate,
      pricing: 'premium',
      price: 9.99
    };

    render(<TemplateCard template={premiumTemplate} />);

    expect(screen.getByText(/premium/i)).toBeInTheDocument();
  });

  it('handles image load errors gracefully', () => {
    render(<TemplateCard template={mockTemplate} />);

    const images = screen.queryAllByRole('img');
    images.forEach(img => {
      fireEvent.error(img);
    });

    // Should still render the card without crashing
    expect(screen.getByText('Test Template')).toBeInTheDocument();
  });

  it('shows hover effects', () => {
    const { container } = render(<TemplateCard template={mockTemplate} />);

    const card = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(card);

    // Should show quick install button on hover
    expect(card).toHaveClass('shadow-xl');
  });
});
