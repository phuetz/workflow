/**
 * RatingSystem Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RatingSystem } from '../../components/marketplace/RatingSystem';

global.fetch = vi.fn();

describe('RatingSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      json: async () => ({
        reviews: [
          {
            id: '1',
            templateId: 'test-template',
            userId: 'user-1',
            userName: 'John Doe',
            rating: 5,
            title: 'Great template!',
            body: 'Very useful',
            pros: ['Easy to use'],
            cons: [],
            verifiedInstall: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            helpfulVotes: 10,
            unhelpfulVotes: 1,
            reportCount: 0,
            moderationStatus: 'approved'
          }
        ],
        distribution: {
          1: 0,
          2: 0,
          3: 2,
          4: 5,
          5: 10,
          average: 4.5,
          total: 17
        }
      })
    });
  });

  it('renders rating overview', async () => {
    render(<RatingSystem templateId="test-template" />);

    await waitFor(() => {
      expect(screen.getByText('4.5')).toBeInTheDocument();
      expect(screen.getByText(/17 reviews/)).toBeInTheDocument();
    });
  });

  it('displays reviews list', async () => {
    render(<RatingSystem templateId="test-template" />);

    await waitFor(() => {
      expect(screen.getByText('Great template!')).toBeInTheDocument();
      expect(screen.getByText('Very useful')).toBeInTheDocument();
    });
  });

  it('filters reviews by sentiment', async () => {
    render(<RatingSystem templateId="test-template" />);

    await waitFor(() => {
      const sentimentFilter = screen.getByDisplayValue('All Reviews');
      fireEvent.change(sentimentFilter, { target: { value: 'positive' } });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('sentiment=positive'),
      expect.any(Object)
    );
  });

  it('sorts reviews', async () => {
    render(<RatingSystem templateId="test-template" />);

    await waitFor(() => {
      const sortSelect = screen.getByDisplayValue('Most Recent');
      fireEvent.change(sortSelect, { target: { value: 'helpful' } });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('sortBy=helpful'),
      expect.any(Object)
    );
  });

  it('opens write review form', async () => {
    render(<RatingSystem templateId="test-template" />);

    await waitFor(() => {
      const writeButton = screen.getByText('Write a Review');
      fireEvent.click(writeButton);
    });

    expect(screen.getByText('Write a Review')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Summarize your experience')).toBeInTheDocument();
  });

  it('submits a review', async () => {
    const onSubmit = vi.fn();
    render(<RatingSystem templateId="test-template" onSubmitReview={onSubmit} />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Write a Review'));
    });

    // Fill in review form
    fireEvent.change(screen.getByPlaceholderText('Summarize your experience'), {
      target: { value: 'Test Title' }
    });
    fireEvent.change(screen.getByPlaceholderText('Share your experience with this template'), {
      target: { value: 'Test body' }
    });

    // Submit
    fireEvent.click(screen.getByText('Submit Review'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Title',
        body: 'Test body'
      }));
    });
  });

  it('votes on review', async () => {
    render(<RatingSystem templateId="test-template" />);

    await waitFor(() => {
      const helpfulButton = screen.getByText(/Helpful/);
      fireEvent.click(helpfulButton);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/vote'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ helpful: true })
      })
    );
  });

  it('reports review', async () => {
    global.alert = vi.fn();
    render(<RatingSystem templateId="test-template" />);

    await waitFor(() => {
      const reportButton = screen.getByText('Report');
      fireEvent.click(reportButton);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/report'),
      expect.objectContaining({ method: 'POST' })
    );

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Review reported for moderation');
    });
  });

  it('displays rating distribution', async () => {
    render(<RatingSystem templateId="test-template" />);

    await waitFor(() => {
      // Should show rating bars
      const ratingBars = screen.getAllByRole('button');
      expect(ratingBars.length).toBeGreaterThan(0);
    });
  });

  it('filters by verified reviews only', async () => {
    render(<RatingSystem templateId="test-template" />);

    await waitFor(() => {
      const verifiedCheckbox = screen.getByLabelText('Verified only');
      fireEvent.click(verifiedCheckbox);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('verified=true'),
      expect.any(Object)
    );
  });
});
