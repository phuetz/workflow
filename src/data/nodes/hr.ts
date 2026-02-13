import { NodeType } from '../../types/workflow';

export const HR_NODES: Record<string, NodeType> = {
  bamboohr: { type: 'bamboohr', label: 'BambooHR', icon: 'Users', color: 'bg-green-600', category: 'hr', inputs: 1, outputs: 1, description: 'HR management' },
    workday: { type: 'workday', label: 'Workday', icon: 'Briefcase', color: 'bg-blue-600', category: 'hr', inputs: 1, outputs: 1, description: 'Enterprise HR' },
  adp: { type: 'adp', label: 'ADP', icon: 'DollarSign', color: 'bg-red-600', category: 'hr', inputs: 1, outputs: 1, description: 'Payroll & HR' },
    greenhouse: { type: 'greenhouse', label: 'Greenhouse', icon: 'Users', color: 'bg-emerald-600', category: 'hr', inputs: 1, outputs: 1, description: 'Recruiting software' },
  lever: { type: 'lever', label: 'Lever', icon: 'Users', color: 'bg-purple-600', category: 'hr', inputs: 1, outputs: 1, description: 'Recruiting platform' },
    ashby: { type: 'ashby', label: 'Ashby', icon: 'Users', color: 'bg-indigo-600', category: 'hr', inputs: 1, outputs: 1, description: 'Recruiting software' },
  linkedintalent: { type: 'linkedintalent', label: 'LinkedIn Talent', icon: 'Linkedin', color: 'bg-blue-700', category: 'hr', inputs: 1, outputs: 1, description: 'Talent solutions' },
    indeed: { type: 'indeed', label: 'Indeed', icon: 'Search', color: 'bg-blue-600', category: 'hr', inputs: 1, outputs: 1, description: 'Job platform' },
  gusto: { type: 'gusto', label: 'Gusto', icon: 'DollarSign', color: 'bg-orange-600', category: 'hr', inputs: 1, outputs: 1, description: 'Payroll platform' },
    rippling: { type: 'rippling', label: 'Rippling', icon: 'Users', color: 'bg-violet-600', category: 'hr', inputs: 1, outputs: 1, description: 'HR & IT platform' }
};
