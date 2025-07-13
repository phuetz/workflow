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

  it('includes Pipedrive node', () => {
    expect(nodeTypes.pipedrive.label).toBe('Pipedrive');
  });

  it('includes ETL node', () => {
    expect(nodeTypes.etl.label).toBe('ETL Pipeline');
  });

  it('includes forEach node', () => {
    expect(nodeTypes.forEach.label).toBe('For Each');
  });

  it('includes subWorkflow node', () => {
    expect(nodeTypes.subWorkflow.label).toBe('Sub-workflow');
  });
});
