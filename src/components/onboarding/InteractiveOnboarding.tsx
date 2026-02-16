/**
 * Interactive Onboarding Component
 * Progressive onboarding system with guided tutorials and interactive elements
 */

import * as React from 'react';
import { useState, useRef } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Play,
  CheckCircle,
  Circle,
  ArrowRight,
  Lightbulb,
  Target,
  Zap,
  BookOpen,
  Users,
  Star,
  Award,
  Clock,
  TrendingUp,
  Settings,
  Database,
  MessageSquare,
  Mail,
  Calendar,
  X,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  ExternalLink,
  Download,
  Eye,
  Plus
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  type: 'intro' | 'tutorial' | 'interactive' | 'template' | 'completion';
  duration?: number; // seconds
  requiredAction?: string;
  nextStepCondition?: () => boolean;
  tips?: string[];
  links?: Array<{ title: string; url: string }>;
}

interface InteractiveOnboardingProps {
  onComplete?: () => void;
  onSkip?: () => void;
  onClose?: () => void;
  userProfile?: {
    name?: string;
    role?: string;
    experience?: 'beginner' | 'intermediate' | 'advanced';
    interests?: string[];
  };
}

export const InteractiveOnboarding: React.FC<InteractiveOnboardingProps> = ({
  onComplete,
  onSkip,
  onClose,
  userProfile
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [_isPlaying, _setIsPlaying] = useState(false);  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [_showTranscript, _setShowTranscript] = useState(false);  
  const [interactionData, setInteractionData] = useState<Record<string, unknown>>({});
  const videoRef = useRef<HTMLVideoElement>(null);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: `Welcome${userProfile?.name ? `, ${userProfile.name}` : ''}!`,
      description: 'Let\'s get you started with workflow automation',
      type: 'intro',
      content: (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Zap className="w-12 h-12 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to Workflow Automation
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              In the next few minutes, you'll learn how to create powerful automated workflows 
              that save time and eliminate repetitive tasks.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">Learn Basics</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <Play className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-gray-600">Build Workflow</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm text-gray-600">Go Live</span>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-sm text-blue-800">
                This tour takes about 5-7 minutes to complete
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'concepts',
      title: 'Understanding Workflows',
      description: 'Learn the core concepts of workflow automation',
      type: 'tutorial',
      duration: 45,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">What is a Workflow?</h3>
            <p className="text-gray-700 mb-4">
              A workflow is a sequence of automated tasks that are triggered by specific events. 
              Think of it as a digital assembly line where data flows through different processes.
            </p>
            
            <div className="flex items-center justify-center space-x-4 my-6">
              <div className="bg-green-100 px-3 py-2 rounded-lg text-center">
                <div className="w-8 h-8 bg-green-500 rounded-full mx-auto mb-1 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium">Trigger</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <div className="bg-blue-100 px-3 py-2 rounded-lg text-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-1 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium">Process</span>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <div className="bg-purple-100 px-3 py-2 rounded-lg text-center">
                <div className="w-8 h-8 bg-purple-500 rounded-full mx-auto mb-1 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium">Action</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Example: Email Notifications
              </h4>
              <p className="text-sm text-gray-600">
                When a new customer signs up → Send welcome email → Add to CRM
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                <Database className="w-4 h-4 mr-2" />
                Example: Data Sync
              </h4>
              <p className="text-sm text-gray-600">
                Every day at 9 AM → Fetch sales data → Update spreadsheet
              </p>
            </div>
          </div>
        </div>
      ),
      tips: [
        'Start with simple workflows and gradually build complexity',
        'Use templates to get started quickly',
        'Test workflows thoroughly before going live'
      ]
    },
    {
      id: 'interface-tour',
      title: 'Platform Overview',
      description: 'Get familiar with the main interface',
      type: 'tutorial',
      duration: 60,
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-900 text-white p-4">
              <h3 className="font-semibold">Workflow Builder Interface</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Left Panel</h4>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Node Library
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Templates
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      Credentials
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Center Canvas</h4>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Drag & Drop Nodes
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Connect Workflows
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      Visual Flow
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Right Panel</h4>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Node Settings
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Data Preview
                    </div>
                    <div className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      Test Results
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <Lightbulb className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-800 mb-1">Pro Tip</h4>
                <p className="text-sm text-yellow-700">
                  Use keyboard shortcuts to speed up your workflow creation. 
                  Press 'Ctrl+?' to see all available shortcuts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'first-workflow',
      title: 'Build Your First Workflow',
      description: 'Create a simple workflow step by step',
      type: 'interactive',
      requiredAction: 'create_workflow',
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Let's Build: Welcome Email Automation</h3>
            <p className="text-gray-700 mb-4">
              We'll create a workflow that automatically sends a welcome email when someone 
              fills out a contact form on your website.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-bold">1</span>
                </div>
                <span className="text-sm font-medium">Add a Webhook Trigger</span>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
                <span className="text-sm font-medium">Configure Email Settings</span>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm font-bold">3</span>
                </div>
                <span className="text-sm font-medium">Test & Activate</span>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center">
                <Plus className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Ready to Start Building?</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Click the button below to open the workflow builder and follow along.
                </p>
                <button 
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => {
                    setInteractionData(prev => ({ ...prev, workflowStarted: true }));
                    // In real implementation, would open workflow builder
                  }}
                >
                  Open Workflow Builder
                </button>
              </div>
            </div>
          </div>

          {interactionData.workflowStarted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm text-green-800 font-medium">
                  Great! The workflow builder is now open. Follow the guided steps to build your first workflow.
                </span>
              </div>
            </div>
          )}
        </div>
      ),
      nextStepCondition: () => !!interactionData.workflowStarted
    },
    {
      id: 'templates',
      title: 'Explore Templates',
      description: 'Discover pre-built workflows to get started faster',
      type: 'template',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Speed Up with Templates</h3>
            <p className="text-gray-600">
              Don't start from scratch! Browse our library of pre-built workflow templates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Social Media Posting</h4>
                  <div className="flex items-center text-sm text-gray-500">
                    <Star className="w-3 h-3 mr-1 fill-current text-yellow-400" />
                    4.8 • 1,247 downloads
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Automatically post content across Twitter, LinkedIn, and Facebook.
              </p>
              <div className="flex space-x-2">
                <button className="flex-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                  <Eye className="w-3 h-3 inline mr-1" />
                  Preview
                </button>
                <button className="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                  <Download className="w-3 h-3 inline mr-1" />
                  Use Template
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Lead Qualification</h4>
                  <div className="flex items-center text-sm text-gray-500">
                    <Star className="w-3 h-3 mr-1 fill-current text-yellow-400" />
                    4.6 • 892 downloads
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Score and route leads automatically based on custom criteria.
              </p>
              <div className="flex space-x-2">
                <button className="flex-1 px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                  <Eye className="w-3 h-3 inline mr-1" />
                  Preview
                </button>
                <button className="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                  <Download className="w-3 h-3 inline mr-1" />
                  Use Template
                </button>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <BookOpen className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-800 mb-1">Template Categories</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                  <div>• Marketing Automation</div>
                  <div>• Customer Support</div>
                  <div>• Data Processing</div>
                  <div>• Social Media</div>
                  <div>• E-commerce</div>
                  <div>• Business Operations</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'completion',
      title: 'You\'re All Set!',
      description: 'Congratulations on completing the onboarding',
      type: 'completion',
      content: (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Congratulations! 🎉
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              You've completed the onboarding tour and are ready to build powerful workflows. 
              Here are some next steps to get you started.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Create Workflow</h4>
              <p className="text-sm text-gray-600">Start building your first custom workflow from scratch.</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Browse Templates</h4>
              <p className="text-sm text-gray-600">Explore our library of pre-built workflow templates.</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Join Community</h4>
              <p className="text-sm text-gray-600">Connect with other users and share workflows.</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-3">Need Help Getting Started?</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <a href="#" className="flex items-center text-blue-600 hover:text-blue-800">
                <ExternalLink className="w-4 h-4 mr-2" />
                Documentation & Guides
              </a>
              <a href="#" className="flex items-center text-blue-600 hover:text-blue-800">
                <MessageSquare className="w-4 h-4 mr-2" />
                Community Forum
              </a>
              <a href="#" className="flex items-center text-blue-600 hover:text-blue-800">
                <Mail className="w-4 h-4 mr-2" />
                Email Support
              </a>
              <a href="#" className="flex items-center text-blue-600 hover:text-blue-800">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Demo
              </a>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (currentStepData.nextStepCondition && !currentStepData.nextStepCondition()) {
      return; // Don't proceed if condition is not met
    }

    if (!isLastStep) {
      setCurrentStep(prev => prev + 1);
      setCompletedSteps(prev => new Set(prev).add(currentStepData.id));
    } else {
      onComplete?.();
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const getStepStatus = (stepId: string, stepIndex: number): 'completed' | 'current' | 'pending' => {
    if (completedSteps.has(stepId)) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'pending';
  };

  return (
    <div className={`fixed inset-0 z-50 ${isFullscreen ? 'bg-white' : 'bg-black bg-opacity-50'} flex items-center justify-center`}>
      <div className={`bg-white rounded-lg shadow-xl ${isFullscreen ? 'w-full h-full' : 'w-full max-w-4xl h-5/6'} flex flex-col`}>
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-4">
              <h2 className="text-lg font-semibold">{currentStepData.title}</h2>
              <p className="text-sm text-gray-600">{currentStepData.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id, index);
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => handleStepClick(index)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      status === 'current' 
                        ? 'bg-blue-100 text-blue-700' 
                        : status === 'completed'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      {status === 'completed' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Circle className={`w-4 h-4 ${status === 'current' ? 'fill-current' : ''}`} />
                      )}
                      <span className="ml-2 hidden md:inline">{step.title}</span>
                    </div>
                  </button>
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                Skip Tour
              </button>
            )}
            
            {currentStepData.tips && (
              <div className="text-xs text-gray-500">
                💡 Tip: {currentStepData.tips[0]}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              {currentStep + 1} of {steps.length}
            </span>
            
            <div className="flex space-x-2">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
              
              <button
                onClick={handleNext}
                disabled={currentStepData.nextStepCondition && !currentStepData.nextStepCondition()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLastStep ? 'Complete' : 'Next'}
                {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveOnboarding;