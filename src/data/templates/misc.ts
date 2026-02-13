/**
 * Workflow Templates - misc
 *
 * This file serves as a facade, re-exporting from modular components in ./misc/
 *
 * @module data/templates/misc
 */

// Re-export everything from the misc module
export {
  MISC_TEMPLATES,
  UTILITY_TEMPLATES,
  INTEGRATION_TEMPLATES,
  DATA_TEMPLATES,
  AUTOMATION_TEMPLATES
} from './misc/index';

// Default export for backward compatibility
export { MISC_TEMPLATES as default } from './misc/index';
