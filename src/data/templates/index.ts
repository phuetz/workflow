/**
 * Workflow Templates Index
 * Exports all template categories
 */

import { AI_TEMPLATES } from './ai';
import { ANALYTICS_TEMPLATES } from './analytics';
import { BUSINESS_AUTOMATION_TEMPLATES } from './businessAutomation';
import { COMMUNICATION_TEMPLATES } from './communication';
import { DATA_PROCESSING_TEMPLATES } from './dataProcessing';
import { DEVOPS_TEMPLATES } from './devops';
import { ECOMMERCE_TEMPLATES } from './ecommerce';
import { FINANCE_TEMPLATES } from './finance';
import { HR_TEMPLATES } from './hr';
import { IOT_TEMPLATES } from './iot';
import { MARKETING_TEMPLATES } from './marketing';
import { MISC_TEMPLATES } from './misc';
import { MONITORING_TEMPLATES } from './monitoring';
import { PRODUCTIVITY_TEMPLATES } from './productivity';
import { SECURITY_TEMPLATES } from './security';
import { SOCIAL_TEMPLATES } from './social';
import { SUPPORT_TEMPLATES } from './support';
import { N8N_PARITY_TEMPLATES } from './n8nParity';
import { POPULAR_N8N_TEMPLATES } from './popularN8n';
import { ENTERPRISE_TEMPLATES } from './enterpriseTemplates';
import { INTEGRATION_TEMPLATES } from './integrationTemplates';

// Re-export individual categories
export { AI_TEMPLATES };
export { ANALYTICS_TEMPLATES };
export { BUSINESS_AUTOMATION_TEMPLATES };
export { COMMUNICATION_TEMPLATES };
export { DATA_PROCESSING_TEMPLATES };
export { DEVOPS_TEMPLATES };
export { ECOMMERCE_TEMPLATES };
export { FINANCE_TEMPLATES };
export { HR_TEMPLATES };
export { IOT_TEMPLATES };
export { MARKETING_TEMPLATES };
export { MISC_TEMPLATES };
export { MONITORING_TEMPLATES };
export { PRODUCTIVITY_TEMPLATES };
export { SECURITY_TEMPLATES };
export { SOCIAL_TEMPLATES };
export { SUPPORT_TEMPLATES };
export { N8N_PARITY_TEMPLATES };
export { POPULAR_N8N_TEMPLATES };
export { ENTERPRISE_TEMPLATES };
export { INTEGRATION_TEMPLATES };

// Combined export
export const WORKFLOW_TEMPLATES = [
  ...AI_TEMPLATES,
  ...ANALYTICS_TEMPLATES,
  ...BUSINESS_AUTOMATION_TEMPLATES,
  ...COMMUNICATION_TEMPLATES,
  ...DATA_PROCESSING_TEMPLATES,
  ...DEVOPS_TEMPLATES,
  ...ECOMMERCE_TEMPLATES,
  ...FINANCE_TEMPLATES,
  ...HR_TEMPLATES,
  ...IOT_TEMPLATES,
  ...MARKETING_TEMPLATES,
  ...MISC_TEMPLATES,
  ...MONITORING_TEMPLATES,
  ...PRODUCTIVITY_TEMPLATES,
  ...SECURITY_TEMPLATES,
  ...SOCIAL_TEMPLATES,
  ...SUPPORT_TEMPLATES,
  ...N8N_PARITY_TEMPLATES,
  ...POPULAR_N8N_TEMPLATES,
  ...ENTERPRISE_TEMPLATES,
  ...INTEGRATION_TEMPLATES,
];

export default WORKFLOW_TEMPLATES;
