import { describe, it, expect } from 'vitest';
import { nodeTypes } from '../data/nodeTypes';

describe('nodeTypes', () => {
  it('contains trigger node', () => {
    expect(nodeTypes.trigger.label).toBe('Déclencheur HTTP');
  });
});
