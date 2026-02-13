import { TestCase, TestSuite, TestExecution } from '../../../services/TestingService';

export interface TestingFrameworkProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface TestCardProps {
  test: TestCase;
  darkMode: boolean;
  isSelected: boolean;
  isRunningTest: boolean;
  onSelect: (test: TestCase) => void;
  onRunTest: (testId: string) => void;
  onEditTest: (test: TestCase) => void;
}

export interface TestBuilderProps {
  darkMode: boolean;
  selectedTest: TestCase | null;
  workflows: unknown[];
  onClose: () => void;
  onSave: (formData: Partial<TestCase>) => Promise<void>;
}

export interface TestsTabProps {
  darkMode: boolean;
  testCases: TestCase[];
  executions: TestExecution[];
  isRunningTest: boolean;
  onCreateTest: () => void;
  onRunTest: (testId: string) => void;
  onRunAllTests: () => void;
  onSelectTest: (test: TestCase) => void;
  onEditTest: (test: TestCase) => void;
  selectedTest: TestCase | null;
}

export interface ExecutionsTabProps {
  darkMode: boolean;
  testCases: TestCase[];
  executions: TestExecution[];
}

export interface TestStatisticsProps {
  darkMode: boolean;
  testCases: TestCase[];
  executions: TestExecution[];
}

export interface StatusIconProps {
  status?: string;
  className: string;
  size: number;
}

export type TabId = 'tests' | 'suites' | 'executions' | 'reports' | 'environments';

export interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

export { TestCase, TestSuite, TestExecution };
