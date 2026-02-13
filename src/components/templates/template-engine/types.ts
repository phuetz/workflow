import { LucideIcon } from 'lucide-react';
import { WorkflowNode, WorkflowEdge } from '../../../types/workflow';

export interface TemplateCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

export interface IntelligentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  popularity: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  tags: string[];
  aiGenerated: boolean;
  optimizationScore: number;
  estimatedCost: number;
  reliability: number;
  useCases: string[];
  requirements: string[];
  benefits: string[];
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface TemplateFilters {
  category: string;
  searchTerm: string;
}
