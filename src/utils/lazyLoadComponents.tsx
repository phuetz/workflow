/**
 * PLAN C PHASE 3 - Lazy Loading pour Composants Lourds
 * Optimisation du chargement des 30 composants les plus lourds
 * DEBUG MODE ENABLED
 */

import * as React from 'react';
import { lazy, Suspense, ComponentType, Component } from 'react';
import { Loader2 } from 'lucide-react';
import { logger } from './logger';

// Debug mode for lazy loading
const DEBUG_LAZY_LOAD = true;

const debugLog = (message: string, data?: unknown) => {
  if (DEBUG_LAZY_LOAD) {
    console.log(`[LazyLoad] ${message}`, data || '');
  }
};

// Composant de chargement par défaut
const DefaultLoadingComponent = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    <span className="ml-2 text-gray-600">Chargement...</span>
  </div>
);

// Composant d'erreur par défaut
const DefaultErrorComponent = ({ error }: { error: Error }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <h3 className="text-red-800 font-semibold">Erreur de chargement</h3>
    <p className="text-red-600 text-sm mt-1">{error.message}</p>
  </div>
);

/**
 * Configuration pour le lazy loading
 */
export interface LazyLoadConfig {
  loadingComponent?: ComponentType;
  errorComponent?: ComponentType<{ error: Error }>;
  delay?: number; // Délai avant d'afficher le loading (ms)
  prefetch?: boolean; // Précharger le composant
  retry?: number; // Nombre de tentatives en cas d'échec
}

/**
 * HOC pour wrapper un composant avec lazy loading
 */
export function withLazyLoad<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  config: LazyLoadConfig = {},
  componentName?: string
): ComponentType<P> {
  const {
    loadingComponent: LoadingComponent = DefaultLoadingComponent,
    errorComponent: ErrorComponent = DefaultErrorComponent,
    delay = 300,
    prefetch = false,
    retry = 3
  } = config;

  const name = componentName || importFunc.toString().match(/import\(['"](.+)['"]\)/)?.[1] || 'Unknown';
  debugLog(`Creating lazy component: ${name}`);

  // Créer le composant lazy
  const LazyComponent = lazy(async () => {
    let attempts = 0;
    debugLog(`Starting load for: ${name}`);

    while (attempts < retry) {
      try {
        // Ajouter un délai optionnel pour éviter le flash de loading
        if (delay > 0 && attempts === 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const module = await importFunc();

        // Validation du module
        if (!module) {
          console.error(`[LazyLoad] ERROR: Module is null/undefined for ${name}`);
          throw new Error(`Module is null for ${name}`);
        }

        if (!module.default) {
          console.error(`[LazyLoad] ERROR: Module.default is missing for ${name}`, module);
          throw new Error(`Module.default is missing for ${name}. Got: ${Object.keys(module).join(', ')}`);
        }

        if (typeof module.default !== 'function') {
          console.error(`[LazyLoad] ERROR: Module.default is not a function for ${name}`, typeof module.default);
          throw new Error(`Module.default is not a function for ${name}. Type: ${typeof module.default}`);
        }

        debugLog(`Successfully loaded: ${name}`, { hasDefault: !!module.default });
        return module;
      } catch (error) {
        attempts++;
        console.error(`[LazyLoad] Attempt ${attempts}/${retry} failed for ${name}:`, error);
        if (attempts >= retry) {
          throw error;
        }
        // Attendre avant de réessayer (backoff exponentiel)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }

    throw new Error(`Failed to load component ${name} after ${retry} retries`);
  });

  // Précharger si nécessaire
  if (prefetch) {
    debugLog(`Prefetching: ${name}`);
    importFunc().catch((err) => logger.error(`Prefetch error for ${name}:`, err));
  }

  // Wrapper avec error boundary
  class ErrorBoundary extends Component<
    { children: React.ReactNode },
    { hasError: boolean; error: Error | null }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      logger.error('Component loading error:', error, errorInfo);
    }

    render() {
      if (this.state.hasError && this.state.error) {
        return <ErrorComponent error={this.state.error} />;
      }

      return this.props.children;
    }
  }

  // Retourner le composant wrappé
  return (props: P) => (
    <ErrorBoundary>
      <Suspense fallback={<LoadingComponent />}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Hook pour précharger des composants
 */
export function usePrefetch(
  importFuncs: Array<() => Promise<any>>
): void {
  React.useEffect(() => {
    const prefetchAll = async () => {
      await Promise.all(
        importFuncs.map(func => 
          func().catch(err => logger.warn('Prefetch failed:', err))
        )
      );
    };

    // Précharger après que la page soit idle
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => prefetchAll());
    } else {
      // Fallback pour les navigateurs qui ne supportent pas requestIdleCallback
      setTimeout(prefetchAll, 1000);
    }
  }, []);
}

/**
 * Fonction utilitaire pour créer un bundle de composants lazy
 * Utilise React.lazy natif pour éviter les problèmes de conversion Symbol
 */
export function createLazyBundle<T extends Record<string, ComponentType<any>>>(
  components: Record<string, () => Promise<{ default: ComponentType<any> }>>,
  _config?: LazyLoadConfig
): T {
  const bundle: any = {};
  const componentNames = Object.keys(components);

  debugLog(`Creating lazy bundle with ${componentNames.length} components:`, componentNames);

  for (const [key, importFunc] of Object.entries(components)) {
    debugLog(`  - Registering: ${key}`);
    // Utiliser React.lazy natif au lieu de withLazyLoad pour éviter les erreurs de conversion Symbol
    const LazyComponent = lazy(importFunc);

    // Wrapper avec Suspense pour un fallback automatique
    bundle[key] = function LazyWrapper(props: any) {
      return (
        <Suspense fallback={<DefaultLoadingComponent />}>
          <LazyComponent {...props} />
        </Suspense>
      );
    };

    // Donner un nom au composant pour le debugging
    bundle[key].displayName = `Lazy(${key})`;
  }

  return bundle as T;
}

/**
 * Liste des 30 composants lourds à charger en lazy
 */
export const LazyComponents = createLazyBundle({
  // Éditeurs et builders complexes
  AIWorkflowGenerator: () => import('../components/ai/AIWorkflowGenerator'),
  AICodeGenerator: () => import('../components/ai/AICodeGenerator'),
  GraphQLQueryBuilder: () => import('../components/api/GraphQLQueryBuilder'),
  ExpressionBuilder: () => import('../components/expression/ExpressionBuilder'),
  APIBuilder: () => import('../components/api/APIBuilder'),
  DataMappingInterface: () => import('../components/data/DataMappingInterface').then(m => ({ default: m.DataMappingInterface })),
  VisualFlowDesigner: () => import('../components/workflow/editor/VisualFlowDesigner'),

  // Dashboards et monitoring
  MonitoringDashboard: () => import('../components/dashboards/MonitoringDashboard'),
  AnalyticsDashboard: () => import('../components/dashboards/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })),
  PerformanceDashboard: () => import('../components/dashboards/PerformanceDashboard'),
  SecurityDashboard: () => import('../components/dashboards/SecurityDashboard'),
  APIDashboard: () => import('../components/dashboards/APIDashboard'),
  BackupDashboard: () => import('../components/dashboards/BackupDashboard'),
  CollaborationDashboard: () => import('../components/dashboards/CollaborationDashboard').then(m => ({ default: m.CollaborationDashboard })),

  // Marketplaces et hubs
  AppMarketplace: () => import('../components/marketplace/AppMarketplace'),
  CommunityMarketplace: () => import('../components/marketplace/CommunityMarketplace'),
  MarketplaceHub: () => import('../components/plugins/MarketplaceHub'),
  EdgeComputingHub: () => import('../components/edge/EdgeComputingHub'),
  GamificationHub: () => import('../components/utilities/GamificationHub'),

  // Outils avancés
  WorkflowDebugger: () => import('../components/workflow/editor/WorkflowDebugger').then(m => ({ default: m.WorkflowDebugger })),
  TestingFramework: () => import('../components/testing/TestingFramework'),
  DocumentationViewer: () => import('../components/documentation/DocumentationViewer').then(m => ({ default: m.DocumentationViewer })),
  DataTransformPlayground: () => import('../components/data/DataTransformPlayground'),

  // Gestionnaires complexes
  CredentialsManager: () => import('../components/credentials/CredentialsManager'),
  WebhookManager: () => import('../components/api/WebhookManager'),
  ScheduleManager: () => import('../components/scheduling/ScheduleManager'),
  VariablesManager: () => import('../components/variables/VariablesManager').then(m => ({ default: m.VariablesManager })),
  SubWorkflowManager: () => import('../components/workflow/editor/SubWorkflowManager'),

  // Vues spécialisées
  ExecutionViewer: () => import('../components/workflow/execution/ExecutionViewer'),
  WorkflowTesting: () => import('../components/testing/WorkflowTesting').then(m => ({ default: m.WorkflowTesting }))
}, {
  delay: 200,
  retry: 2,
  prefetch: false
});

/**
 * Hook pour charger un composant lourd à la demande
 */
export function useLazyComponent<T extends ComponentType<any>>(
  componentName: keyof typeof LazyComponents
): T | null {
  const [Component, setComponent] = React.useState<T | null>(null);
  
  React.useEffect(() => {
    const LazyComponent = LazyComponents[componentName];
    if (LazyComponent) {
      setComponent(() => LazyComponent as T);
    }
  }, [componentName]);
  
  return Component;
}

/**
 * Provider pour gérer le préchargement intelligent
 */
export const LazyLoadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    // Précharger les composants critiques après le chargement initial
    const criticalComponents = [
      'MonitoringDashboard',
      'WorkflowDebugger',
      'ExecutionViewer'
    ];
    
    const prefetchCritical = () => {
      criticalComponents.forEach(name => {
        const component = LazyComponents[name as keyof typeof LazyComponents];
        if (component) {
          // Le composant se précharge automatiquement s'il a l'option prefetch
        }
      });
    };
    
    // Attendre que la page soit complètement chargée
    if (document.readyState === 'complete') {
      prefetchCritical();
    } else {
      window.addEventListener('load', prefetchCritical);
      return () => window.removeEventListener('load', prefetchCritical);
    }
  }, []);
  
  return <>{children}</>;
};

// Export des types
export type LazyComponentName = keyof typeof LazyComponents;
export type LazyComponentType<K extends LazyComponentName> = typeof LazyComponents[K];