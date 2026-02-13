/**
 * Misc Templates Module
 *
 * Barrel export for miscellaneous workflow templates.
 *
 * @module data/templates/misc
 */

// Export template arrays
export { UTILITY_TEMPLATES } from './UtilityTemplates';
export { INTEGRATION_TEMPLATES } from './IntegrationTemplates';
export { DATA_TEMPLATES } from './DataTemplates';
export { AUTOMATION_TEMPLATES } from './AutomationTemplates';

// Import for combined export
import { UTILITY_TEMPLATES } from './UtilityTemplates';
import { INTEGRATION_TEMPLATES } from './IntegrationTemplates';
import { DATA_TEMPLATES } from './DataTemplates';
import { AUTOMATION_TEMPLATES } from './AutomationTemplates';

import type { WorkflowTemplate } from '../../../types/templates';

/**
 * Combined array of all misc templates
 */
export const MISC_TEMPLATES: WorkflowTemplate[] = [
  ...INTEGRATION_TEMPLATES,
  ...UTILITY_TEMPLATES,
  ...AUTOMATION_TEMPLATES,
  ...DATA_TEMPLATES
];

export default MISC_TEMPLATES;
