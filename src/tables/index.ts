/**
 * Workflow Tables Module
 * Built-in structured data storage (like Zapier Tables)
 */

export {
  WorkflowTablesManager,
  createWorkflowTables,
  type TableDefinition,
  type ColumnDefinition,
  type ColumnType,
  type ColumnOptions,
  type ColumnValidation,
  type IndexDefinition,
  type TablePermissions,
  type TableRow,
  type QueryOptions,
  type FilterCondition,
  type FilterOperator,
  type SortCondition,
  type QueryResult,
  type TableChange
} from './WorkflowTables';

// Re-export default
export { default } from './WorkflowTables';
