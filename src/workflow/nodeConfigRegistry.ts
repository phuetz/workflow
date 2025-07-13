import HttpRequestConfig from './nodes/config/HttpRequestConfig';
import EmailConfig from './nodes/config/EmailConfig';
import SlackConfig from './nodes/config/SlackConfig';
import ScheduleConfig from './nodes/config/ScheduleConfig';
import DelayConfig from './nodes/config/DelayConfig';
import SubWorkflowConfig from './nodes/config/SubWorkflowConfig';
import DefaultConfig from './nodes/config/DefaultConfig';

const registry: Record<string, React.ComponentType<any>> = {
  httpRequest: HttpRequestConfig,
  email: EmailConfig,
  gmail: EmailConfig,
  slack: SlackConfig,
  schedule: ScheduleConfig,
  delay: DelayConfig,
  subWorkflow: SubWorkflowConfig,
  default: DefaultConfig,
};

export default registry;
