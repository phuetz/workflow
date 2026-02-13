/**
 * Onboarding Flow Component
 * Interactive guided tour for new users following 2025 UX best practices
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ChevronRight, ChevronLeft, Check, Sparkles,
  Workflow, Plus, Play, Settings, Zap
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for spotlight
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
  icon?: React.ReactNode;
}

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Workflow Builder Pro! 🎉',
    description: 'Let\'s take a quick tour to help you get started. You\'ll learn how to create powerful automations in minutes.',
    icon: <Sparkles className="w-8 h-8 text-primary-500" />,
  },
  {
    id: 'canvas',
    title: 'Your Workflow Canvas',
    description: 'This is where the magic happens. Drag nodes from the sidebar and connect them to build your automation.',
    target: '.react-flow',
    position: 'right',
    icon: <Workflow className="w-6 h-6 text-primary-500" />,
  },
  {
    id: 'add-node',
    title: 'Add Your First Node',
    description: 'Click the + button or drag a node from the sidebar to add triggers and actions to your workflow.',
    target: '[data-testid="add-node-button"]',
    position: 'bottom',
    icon: <Plus className="w-6 h-6 text-primary-500" />,
  },
  {
    id: 'execute',
    title: 'Run Your Workflow',
    description: 'Once your workflow is ready, click the Play button to execute it. You can also schedule it to run automatically.',
    target: '[data-testid="execute-button"]',
    position: 'bottom',
    icon: <Play className="w-6 h-6 text-success-500" />,
  },
  {
    id: 'templates',
    title: 'Start with Templates',
    description: 'Don\'t want to start from scratch? Browse our template library for pre-built workflows.',
    target: '[data-testid="templates-button"]',
    position: 'bottom',
    icon: <Zap className="w-6 h-6 text-warning-500" />,
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    description: 'You\'re ready to build amazing automations. Need help? Check out our documentation or reach out to support.',
    icon: <Check className="w-8 h-8 text-success-500" />,
  },
];

interface OnboardingFlowProps {
  steps?: OnboardingStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  steps = DEFAULT_STEPS,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Find target element for spotlight
  useEffect(() => {
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [step.target]);

  const handleNext = useCallback(() => {
    if (step.action) {
      step.action();
    }
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [step, isLastStep]);

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  }, [isFirstStep]);

  const handleComplete = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem('onboarding_completed', 'true');
    onComplete?.();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem('onboarding_skipped', 'true');
    onSkip?.();
  }, [onSkip]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleSkip]);

  if (!isVisible) return null;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 20;
    const tooltipWidth = 360;

    switch (step.position) {
      case 'top':
        return {
          bottom: `${window.innerHeight - targetRect.top + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          right: `${window.innerWidth - targetRect.left + padding}px`,
          transform: 'translateY(-50%)',
        };
      case 'right':
      default:
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.right + padding}px`,
          transform: 'translateY(-50%)',
          maxWidth: `${Math.min(tooltipWidth, window.innerWidth - targetRect.right - padding * 2)}px`,
        };
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleSkip}
      />

      {/* Spotlight */}
      {targetRect && (
        <div
          className="absolute bg-transparent rounded-lg transition-all duration-300"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm animate-fade-in-up"
        style={getTooltipStyle()}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-700 rounded-t-2xl overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Skip tour"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="pt-4">
          {/* Icon */}
          {step.icon && (
            <div className="mb-4 flex justify-center">
              <div className="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                {step.icon}
              </div>
            </div>
          )}

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1 mb-3">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? 'w-6 bg-primary-500'
                    : index < currentStep
                    ? 'w-1.5 bg-primary-300'
                    : 'w-1.5 bg-gray-200 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
            {step.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
            {step.description}
          </p>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-3">
            {!isFirstStep ? (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Skip tour
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isLastStep ? (
                <>
                  Get Started
                  <Check className="w-4 h-4" />
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

        {/* Keyboard hints */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="kbd">←</kbd>
            <kbd className="kbd">→</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="kbd">Esc</kbd>
            Skip
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Hook to check if onboarding should be shown
export function useOnboarding() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    const skipped = localStorage.getItem('onboarding_skipped');

    if (!completed && !skipped) {
      // Show onboarding after a short delay for better UX
      const timer = setTimeout(() => setShouldShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('onboarding_skipped');
    setShouldShow(true);
  }, []);

  return { shouldShow, setShouldShow, resetOnboarding };
}

export default OnboardingFlow;
