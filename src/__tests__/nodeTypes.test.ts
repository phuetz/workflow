import { describe, it, expect } from 'vitest';
import { nodeTypes } from '../data/nodeTypes';

describe('nodeTypes', () => {
  it('contains trigger node', () => {
    expect(nodeTypes.trigger.label).toBe('Déclencheur HTTP');
  });

  it('includes Monday.com node', () => {
    expect(nodeTypes.monday.label).toBe('Monday.com');
  });

  it('includes QuickBooks node', () => {
    expect(nodeTypes.quickbooks.label).toBe('QuickBooks');
  });
});
