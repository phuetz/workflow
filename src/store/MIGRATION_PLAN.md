# WorkflowStore Migration Plan

## Current State
- **workflowStore.ts**: 2357 lines (monolithic)
- **slices/**: 8 pre-created slices (unused)
- **Imports**: 100+ files depend on workflowStore

## Pre-created Slices (Ready for Migration)
1. `nodeSlice.ts` - Nodes, edges, groups, sticky notes
2. `executionSlice.ts` - Execution state, results, logs
3. `uiSlice.ts` - UI state (dark mode, alerts)
4. `workflowSlice.ts` - Workflow CRUD, templates
5. `credentialsSlice.ts` - Credentials, environments
6. `historySlice.ts` - Undo/redo functionality
7. `multiSelectSlice.ts` - Multi-selection, bulk ops
8. `debugSlice.ts` - Breakpoints, debug sessions

## Migration Strategy

### Phase 1: Preparation (Low Risk)
1. Audit all state properties in workflowStore.ts
2. Map each property to its corresponding slice
3. Ensure type compatibility between store and slices
4. Write tests for current store behavior

### Phase 2: Gradual Migration (Medium Risk)
1. Start with smallest slice (debugSlice)
2. Create adapter layer that exports both old and new APIs
3. Migrate imports file-by-file
4. Run tests after each migration

### Phase 3: Consolidation (High Risk)
1. Remove deprecated properties from main store
2. Update persistence layer to use slices
3. Final cleanup and optimization

## Immediate Improvements (Applied)
- Created execution engines index for unified access
- Removed unused duplicate files
- Documented slice structure

## Files to Update (Top 10 by Impact)
1. `src/components/core/ModernSidebar.tsx`
2. `src/components/core/Header.tsx`
3. `src/components/nodes/WorkflowNode.tsx`
4. `src/components/workflow/editor/ModernWorkflowEditor.tsx` (implicit)
5. `src/hooks/useWorkflowExecution.ts`
6. `src/services/WorkflowService.ts`
7. `src/components/debugging/DebugPanel.tsx`
8. `src/components/utilities/UndoRedoManager.tsx`
9. `src/components/ai/AIWorkflowGenerator.tsx`
10. `src/components/collaboration/CollaborationPanel.tsx`

## Risk Assessment
- **Breaking Changes**: HIGH - 100+ files depend on current API
- **Data Loss**: MEDIUM - Persistence layer modifications needed
- **Testing Coverage**: MEDIUM - Existing tests may need updates

## Recommendation
Migrate incrementally with feature flags. Keep both APIs available during transition.
