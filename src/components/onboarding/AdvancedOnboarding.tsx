import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { ConfigHelpers } from '../../config/environment';
import { 
  ArrowRight, 
  CheckCircle, 
  Rocket,
  MousePointer,
  Keyboard,
  Eye
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
  highlight?: boolean;
}

export default function AdvancedOnboarding() {
  const { darkMode, nodes } = useWorkflowStore();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: '🎉 Bienvenue dans WorkflowBuilder Pro',
      description: 'Découvrez comment créer des automatisations puissantes en quelques clics. Ce tour guidé ne prendra que 3 minutes.',
      target: 'body',
      position: 'top'
    },
    {
      id: 'sidebar',
      title: '📚 Bibliothèque de nœuds',
      description: 'Plus de 150 nœuds organisés par catégories. Glissez-déposez pour ajouter à votre workflow.',
      target: '[data-tour="sidebar"]',
      position: 'right',
      highlight: true
    },
    {
      id: 'ai-generator',
      title: '🤖 Génération IA',
      description: 'Créez des workflows complets en décrivant simplement ce que vous voulez automatiser.',
      target: '[data-tour="ai-generator"]',
      position: 'right',
      action: () => {
        // Highlight AI generator button
        const button = document.querySelector('[data-tour="ai-generator"]');
        if (button) {
          (button as HTMLElement).style.animation = 'pulse 2s infinite';
        }
      }
    },
    {
      id: 'canvas',
      title: '🎨 Canvas de workflow',
      description: 'Votre espace de création. Connectez les nœuds pour définir le flux d\'exécution.',
      target: '.react-flow',
      position: 'top',
      highlight: true
    },
    {
      id: 'execute-bar',
      title: '⚡ Barre d\'exécution',
      description: 'Exécutez, sauvegardez et gérez vos workflows. Choisissez votre environnement (dev/staging/prod).',
      target: '[data-tour="execute-bar"]',
      position: 'bottom'
    },
    {
      id: 'optimizer',
      title: '🔥 Optimiseur AFLOW',
      description: 'Notre IA analyse votre workflow et propose des optimisations pour réduire les coûts et améliorer les performances.',
      target: '[data-tour="optimizer"]',
      position: 'left'
    },
    {
      id: 'plugins',
      title: '📦 Hot-Reload Plugins',
      description: 'Chargez de nouveaux nœuds instantanément sans redémarrer. Sécurité garantie par signature cryptographique.',
      target: '[data-tour="plugins"]',
      position: 'right'
    },
    {
      id: 'voice',
      title: '🎙️ Assistant vocal',
      description: 'Contrôlez votre workflow par la voix. "État du workflow", "Dernière exécution", "Sauvegarder"...',
      target: '[data-tour="voice"]',
      position: 'right'
    },
    {
      id: 'collaboration',
      title: '👥 Collaboration temps réel',
      description: 'Travaillez en équipe avec des curseurs colorés, commentaires et édition simultanée.',
      target: '[data-tour="collaboration"]',
      position: 'left'
    },
    {
      id: 'shortcuts',
      title: '⌨️ Raccourcis clavier',
      description: 'Pressez "?" pour voir tous les raccourcis. Ctrl+S sauvegarder, Ctrl+E exporter, Delete supprimer...',
      target: 'body',
      position: 'top',
      action: () => {
        // Show keyboard shortcuts briefly
        const event = new KeyboardEvent('keydown', { key: '?' });
        window.dispatchEvent(event);
        setTimeout(() => {
          const closeBtn = document.querySelector('.shortcuts-modal-close');
          if (closeBtn) (closeBtn as HTMLElement).click();
        }, 3000);
      }
    },
    {
      id: 'complete',
      title: '🚀 Vous êtes prêt !',
      description: 'Vous maîtrisez maintenant WorkflowBuilder Pro. Créez votre premier workflow avec l\'IA ou explorez les templates.',
      target: 'body',
      position: 'top'
    }
  ];

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('workflowbuilder_onboarding_completed') === 'true';
    if (!hasSeenOnboarding && nodes.length === 0) {
      const timeout = setTimeout(() => {
        setIsActive(true);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [nodes.length]);

  useEffect(() => {
    if (isActive) {
      // Add data-tour attributes to elements
      addTourAttributes();
      
      // Add overlay
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = 'auto';
        removeTourAttributes();
      };
    }
  }, [isActive]);

  const addTourAttributes = () => {
    // Add tour identifiers to elements
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.setAttribute('data-tour', 'sidebar');
    
    const aiGenerator = document.querySelector('[aria-label="AI Workflow Generator"]');
    if (aiGenerator) aiGenerator.setAttribute('data-tour', 'ai-generator');
    
    const executeBar = document.querySelector('.execute-bar');
    if (executeBar) executeBar.setAttribute('data-tour', 'execute-bar');
    
    const optimizer = document.querySelector('[aria-label="Optimizer"]');
    if (optimizer) optimizer.setAttribute('data-tour', 'optimizer');
    
    const plugins = document.querySelector('[aria-label="Plugin Manager"]');
    if (plugins) plugins.setAttribute('data-tour', 'plugins');
    
    const voice = document.querySelector('[aria-label="Voice Assistant"]');
    if (voice) voice.setAttribute('data-tour', 'voice');
    
    const collaboration = document.querySelector('[aria-label="Collaboration"]');
    if (collaboration) collaboration.setAttribute('data-tour', 'collaboration');
  };

  const removeTourAttributes = () => {
    document.querySelectorAll('[data-tour]').forEach(el => {
      el.removeAttribute('data-tour');
    });
  };

  const handleNext = () => {
    const step = onboardingSteps[currentStep];
    if (currentStep < onboardingSteps.length - 1) {
      if (step.action) step.action();
      
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = () => {
    setIsCompleted(true);
    localStorage.setItem('workflowbuilder_onboarding_completed', 'true');
    
    setTimeout(() => {
      setIsActive(false);
      setIsCompleted(false);
      setCurrentStep(0);
    }, 2000);
  };

  const getTargetElement = (step: OnboardingStep): Element | null => {
    if (step.target === 'body') return document.body;
    return document.querySelector(step.target);
  };

  const getTooltipPosition = (element: Element | null, placement: string) => {
    if (!element || element === document.body) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const rect = element.getBoundingClientRect();
    const positions = {
      top: {
        top: rect.top - 20,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, -100%)'
      },
      bottom: {
        top: rect.bottom + 20,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, 0)'
      },
      left: {
        top: rect.top + rect.height / 2,
        left: rect.left - 20,
        transform: 'translate(-100%, -50%)'
      },
      right: {
        top: rect.top + rect.height / 2,
        left: rect.right + 20,
        transform: 'translate(0, -50%)'
      }
    };

    return positions[placement] || positions.bottom;
  };

  if (!isActive) return null;

  // Get current step data
  const currentStepData = onboardingSteps[currentStep];

  // Get current step element
  const getCurrentStepElement = () => getTargetElement(currentStepData);

  // Calculate progress
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  // Get tooltip position for current step
  const getTooltipPositionForCurrentStep = () => {
    const element = getCurrentStepElement();
    return getTooltipPosition(element, currentStepData.position);
  };

  // Handler for next step
  const nextStep = () => handleNext();

  // Handler for skipping onboarding
  const skipOnboarding = () => handleSkip();

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50">
        {/* Highlight current element */}
        {currentStepData.highlight && getCurrentStepElement() && (
          <div
            className="absolute border-4 border-yellow-400 rounded-lg shadow-lg pointer-events-none"
            style={{
              top: (getCurrentStepElement()?.getBoundingClientRect().top ?? 0) - 8,
              left: (getCurrentStepElement()?.getBoundingClientRect().left ?? 0) - 8,
              width: (getCurrentStepElement()?.getBoundingClientRect().width ?? 0) + 16,
              height: (getCurrentStepElement()?.getBoundingClientRect().height ?? 0) + 16,
              animation: 'pulse 2s infinite'
            }}
          />
        )}

        {/* Tooltip */}
        <div
          className={`absolute z-50 max-w-sm ${
            darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          } rounded-xl shadow-2xl p-6 border`}
          style={getTooltipPositionForCurrentStep()}
        >
          {isCompleted ? (
            <div className="text-center">
              <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
              <h3 className="text-xl font-bold mb-2">🎉 Onboarding terminé !</h3>
              <p className="text-sm">
                Vous êtes maintenant prêt à créer des workflows extraordinaires !
              </p>
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Étape {currentStep + 1} sur {onboardingSteps.length}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Content */}
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-2">{currentStepData.title}</h3>
                <p className="text-sm opacity-90">{currentStepData.description}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={skipOnboarding}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Passer le tour
                </button>
                
                <div className="flex items-center space-x-3">
                  {currentStep === onboardingSteps.length - 1 ? (
                    <button
                      onClick={completeOnboarding}
                      className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2 hover:shadow-lg transition-all"
                    >
                      <Rocket size={16} />
                      <span>Commencer !</span>
                    </button>
                  ) : (
                    <button
                      onClick={nextStep}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2 hover:shadow-lg transition-all"
                    >
                      <span>Suivant</span>
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick tips floating */}
        {!isCompleted && (
          <div className="absolute bottom-8 left-8 space-y-2">
            <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg flex items-center space-x-2 text-sm`}>
              <MousePointer size={14} />
              <span>Utilisez votre souris pour explorer</span>
            </div>
            <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg flex items-center space-x-2 text-sm`}>
              <Keyboard size={14} />
              <span>Pressez "?" pour les raccourcis</span>
            </div>
            <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg flex items-center space-x-2 text-sm`}>
              <Eye size={14} />
              <span>Regardez les animations</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </>
  );
}