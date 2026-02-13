/**
 * Test utilities and helpers for component testing
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';

// All the providers for tests
export const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <ReactFlowProvider>
        {children}
      </ReactFlowProvider>
    </BrowserRouter>
  );
};

// Custom render method that includes all providers
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing library
export * from '@testing-library/react';
export { renderWithProviders as render };