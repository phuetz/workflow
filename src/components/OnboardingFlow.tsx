/**
 * Onboarding Flow System
 * Interactive product tours and user onboarding
 */

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export interface OnboardingStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for highlighting element
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    label: string;
    onClick: () => void | Promise<void>;
  };
  skippable?: boolean;
  showProgress?: boolean;
}

export interface OnboardingFlow {
  id: string;
  name: string;
  steps: OnboardingStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}

interface OnboardingFlowProps {
  flow: OnboardingFlow;
  isActive: boolean;
  onClose: () => void;
}

export function OnboardingFlow({ flow, isActive, onClose }: OnboardingFlowProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);

  const currentStep = flow.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === flow.steps.length - 1;

  useEffect(() => {
    if (!isActive || !currentStep) return;

    // Highlight target element
    if (currentStep.target) {
      const element = document.querySelector(currentStep.target) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setHighlightedElement(null);
    }

    // Track onboarding progress
    trackOnboardingStep(flow.id, currentStep.id);

    return () => {
      setHighlightedElement(null);
    };
  }, [currentStep, isActive, flow.id]);

  if (!isActive || !currentStep) return null;

  const handleNext = async () => {
    if (currentStep.action) {
      await currentStep.action.onClick();
    }

    setCompletedSteps(prev => new Set([...prev, currentStep.id]));

    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    flow.onSkip?.();
    markOnboardingComplete(flow.id, false);
    onClose();
  };

  const handleComplete = () => {
    flow.onComplete?.();
    markOnboardingComplete(flow.id, true);
    onClose();
  };

  const getTooltipPosition = (): React.CSSProperties => {
    if (!highlightedElement) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const rect = highlightedElement.getBoundingClientRect();
    const position = currentStep.position || 'bottom';

    const positions: Record<string, React.CSSProperties> = {
      top: {
        position: 'fixed',
        bottom: `${window.innerHeight - rect.top + 16}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: 'translateX(-50%)'
      },
      bottom: {
        position: 'fixed',
        top: `${rect.bottom + 16}px`,
        left: `${rect.left + rect.width / 2}px`,
        transform: 'translateX(-50%)'
      },
      left: {
        position: 'fixed',
        top: `${rect.top + rect.height / 2}px`,
        right: `${window.innerWidth - rect.left + 16}px`,
        transform: 'translateY(-50%)'
      },
      right: {
        position: 'fixed',
        top: `${rect.top + rect.height / 2}px`,
        left: `${rect.right + 16}px`,
        transform: 'translateY(-50%)'
      },
      center: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }
    };

    return positions[position];
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={handleSkip} />

      {/* Spotlight effect on target element */}
      {highlightedElement && (
        <div
          className="fixed z-40 pointer-events-none"
          style={{
            top: highlightedElement.getBoundingClientRect().top - 4,
            left: highlightedElement.getBoundingClientRect().left - 4,
            width: highlightedElement.getBoundingClientRect().width + 8,
            height: highlightedElement.getBoundingClientRect().height + 8,
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.5)',
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-50 w-96 max-w-[90vw] bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-4"
        style={getTooltipPosition()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentStep.title}
            </h3>
            {currentStep.showProgress !== false && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Step {currentStepIndex + 1} of {flow.steps.length}
              </p>
            )}
          </div>
          {currentStep.skippable !== false && (
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {currentStep.content}
          </p>
        </div>

        {/* Progress indicator */}
        {currentStep.showProgress !== false && (
          <div className="mb-6">
            <div className="flex gap-1">
              {flow.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    index <= currentStepIndex
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isFirstStep
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            {isLastStep ? (
              <>
                Complete
                <Check className="w-4 h-4" />
              </>
            ) : currentStep.action ? (
              <>
                {currentStep.action.label}
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * Onboarding Manager
 */
class OnboardingManager {
  private completedFlows: Set<string> = new Set();
  private flowProgress: Map<string, number> = new Map();

  constructor() {
    this.loadProgress();
  }

  /**
   * Check if flow is completed
   */
  isCompleted(flowId: string): boolean {
    return this.completedFlows.has(flowId);
  }

  /**
   * Mark flow as completed
   */
  markCompleted(flowId: string): void {
    this.completedFlows.add(flowId);
    this.saveProgress();
  }

  /**
   * Reset flow
   */
  reset(flowId: string): void {
    this.completedFlows.delete(flowId);
    this.flowProgress.delete(flowId);
    this.saveProgress();
  }

  /**
   * Reset all flows
   */
  resetAll(): void {
    this.completedFlows.clear();
    this.flowProgress.clear();
    this.saveProgress();
  }

  /**
   * Track step progress
   */
  trackStep(flowId: string, stepIndex: number): void {
    this.flowProgress.set(flowId, stepIndex);
    this.saveProgress();
  }

  /**
   * Get flow progress
   */
  getProgress(flowId: string): number {
    return this.flowProgress.get(flowId) || 0;
  }

  /**
   * Load progress from localStorage
   */
  private loadProgress(): void {
    try {
      const completed = localStorage.getItem('onboarding_completed');
      if (completed) {
        this.completedFlows = new Set(JSON.parse(completed));
      }

      const progress = localStorage.getItem('onboarding_progress');
      if (progress) {
        this.flowProgress = new Map(Object.entries(JSON.parse(progress)));
      }
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
    }
  }

  /**
   * Save progress to localStorage
   */
  private saveProgress(): void {
    try {
      localStorage.setItem(
        'onboarding_completed',
        JSON.stringify(Array.from(this.completedFlows))
      );

      localStorage.setItem(
        'onboarding_progress',
        JSON.stringify(Object.fromEntries(this.flowProgress))
      );
    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
    }
  }
}

export const onboardingManager = new OnboardingManager();

/**
 * Helper functions
 */
function trackOnboardingStep(flowId: string, stepId: string): void {
  // Send analytics event
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track('onboarding_step_viewed', {
      flowId,
      stepId
    });
  }
}

function markOnboardingComplete(flowId: string, completed: boolean): void {
  onboardingManager.markCompleted(flowId);

  // Send analytics event
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track('onboarding_completed', {
      flowId,
      completed
    });
  }
}

/**
 * Pre-built onboarding flows
 */
export const defaultOnboardingFlows: Record<string, OnboardingFlow> = {
  firstWorkflow: {
    id: 'first-workflow',
    name: 'Create Your First Workflow',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to WorkflowBuilder Pro!',
        content: 'Let\'s create your first automated workflow. It only takes a few minutes.',
        position: 'center',
        showProgress: true
      },
      {
        id: 'add-trigger',
        title: 'Add a Trigger',
        content: 'Every workflow starts with a trigger. Drag a trigger node from the sidebar to get started.',
        target: '[data-node-type="trigger"]',
        position: 'right'
      },
      {
        id: 'add-action',
        title: 'Add an Action',
        content: 'Now add an action that should happen when the trigger fires. Try adding an Email node.',
        target: '[data-node-type="action"]',
        position: 'right'
      },
      {
        id: 'connect-nodes',
        title: 'Connect Nodes',
        content: 'Connect your trigger to the action by dragging from one node to another.',
        position: 'center'
      },
      {
        id: 'test-workflow',
        title: 'Test Your Workflow',
        content: 'Click the Test button to see your workflow in action!',
        target: '[data-action="test-workflow"]',
        position: 'bottom',
        action: {
          label: 'Run Test',
          onClick: async () => {
            // Trigger test execution
            console.log('Testing workflow...');
          }
        }
      }
    ]
  },

  templates: {
    id: 'templates',
    name: 'Explore Templates',
    steps: [
      {
        id: 'template-library',
        title: 'Template Library',
        content: 'Browse our library of pre-built workflow templates for common use cases.',
        target: '[data-section="templates"]',
        position: 'right'
      },
      {
        id: 'use-template',
        title: 'Use a Template',
        content: 'Click on any template to use it as a starting point for your workflow.',
        target: '[data-template-card]',
        position: 'bottom'
      }
    ]
  },

  collaboration: {
    id: 'collaboration',
    name: 'Collaborate with Your Team',
    steps: [
      {
        id: 'share-workflow',
        title: 'Share Workflows',
        content: 'Share your workflows with team members for collaboration.',
        target: '[data-action="share"]',
        position: 'bottom'
      },
      {
        id: 'comments',
        title: 'Add Comments',
        content: 'Add comments to nodes to discuss changes with your team.',
        target: '[data-action="comment"]',
        position: 'bottom'
      },
      {
        id: 'version-history',
        title: 'Version History',
        content: 'View and restore previous versions of your workflow.',
        target: '[data-section="versions"]',
        position: 'left'
      }
    ]
  }
};

/**
 * React hook for onboarding
 */
export function useOnboarding(flowId: string) {
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    setIsCompleted(onboardingManager.isCompleted(flowId));
  }, [flowId]);

  const start = () => setIsActive(true);
  const close = () => setIsActive(false);
  const reset = () => {
    onboardingManager.reset(flowId);
    setIsCompleted(false);
  };

  return {
    isActive,
    isCompleted,
    start,
    close,
    reset
  };
}

export default OnboardingFlow;
