import { useState, useEffect, useCallback } from 'react';
import { testingService, TestCase, TestSuite, TestExecution } from '../../../services/TestingService';
import { logger } from '../../../services/SimpleLogger';

export interface UseTestingFrameworkResult {
  testCases: TestCase[];
  testSuites: TestSuite[];
  executions: TestExecution[];
  selectedTest: TestCase | null;
  isCreatingTest: boolean;
  isRunningTest: boolean;
  isLoading: boolean;
  setSelectedTest: (test: TestCase | null) => void;
  setIsCreatingTest: (value: boolean) => void;
  runTest: (testId: string) => Promise<void>;
  runAllTests: () => void;
  refreshData: () => Promise<void>;
  saveTestCase: (formData: Partial<TestCase>) => Promise<void>;
}

export function useTestingFramework(isOpen: boolean): UseTestingFrameworkResult {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = useCallback(async () => {
    const [testCasesData, testSuitesData, executionsData] = await Promise.all([
      testingService.getTestCases(),
      testingService.getTestSuites(),
      testingService.getTestExecutions({ limit: 50 })
    ]);
    setTestCases(testCasesData);
    setTestSuites(testSuitesData);
    setExecutions(executionsData);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [testCasesData, testSuitesData, executionsData] = await Promise.all([
          testingService.getTestCases(),
          testingService.getTestSuites(),
          testingService.getTestExecutions({ limit: 50 })
        ]);

        if (!cancelled) {
          setTestCases(testCasesData);
          setTestSuites(testSuitesData);
          setExecutions(executionsData);
        }
      } catch (error) {
        if (!cancelled) {
          logger.error('Failed to load testing data:', error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const runTest = useCallback(async (testId: string) => {
    setIsRunningTest(true);
    try {
      await refreshData();
      logger.info('Test execution completed:', testId);
    } catch (error) {
      logger.error('Failed to run test:', error);
    } finally {
      setIsRunningTest(false);
    }
  }, [refreshData]);

  const runAllTests = useCallback(() => {
    testCases.filter(t => t.enabled).forEach(test => runTest(test.id));
  }, [testCases, runTest]);

  const saveTestCase = useCallback(async (formData: Partial<TestCase>) => {
    try {
      if (selectedTest) {
        await testingService.updateTestCase(selectedTest.id, formData);
      } else {
        await testingService.createTestCase(formData as Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>);
      }
      setIsCreatingTest(false);
      setSelectedTest(null);
      await refreshData();
    } catch (error) {
      logger.error('Failed to save test case:', error);
    }
  }, [selectedTest, refreshData]);

  return {
    testCases,
    testSuites,
    executions,
    selectedTest,
    isCreatingTest,
    isRunningTest,
    isLoading,
    setSelectedTest,
    setIsCreatingTest,
    runTest,
    runAllTests,
    refreshData,
    saveTestCase
  };
}
