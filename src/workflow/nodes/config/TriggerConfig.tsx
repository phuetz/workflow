/**
 * HTTP Trigger Node Configuration
 * Generic HTTP trigger configuration
 * AGENT 9: Node Library Expansion - Phase 1
 */

import React from 'react';
import { WebhookTriggerConfig } from './WebhookTriggerConfig';
import type { NodeConfig } from '../../../types/workflow';

// HTTP Trigger uses the same config as Webhook Trigger
export const TriggerConfig = WebhookTriggerConfig;

export default TriggerConfig;
