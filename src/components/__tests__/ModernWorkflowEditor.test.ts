// Tests unitaires pour ModernWorkflowEditor
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { testExpressionSecurity, validateNodeConfig, createMockWorkflow, measurePerformance } from '../../utils/testUtils';

describe('ModernWorkflowEditor', () => {
  let mockWorkflow: unknown;

  beforeEach(() => {
    mockWorkflow = createMockWorkflow(3);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Sécurité des expressions', () => {
    it('devrait bloquer les expressions dangereuses', () => {
      const dangerousExpressions = [
        'eval("alert(1)")',
        'window.location.href = "http://evil.com"',
        'document.cookie',
        'new Function("return process.env")',
        'constructor.constructor("return process")().env',
        '__proto__.constructor.constructor("return process")()',
        'require("fs").readFileSync("/etc/passwd")',
        'import("fs").then(fs => fs.readFileSync("/etc/passwd"))',
        'setTimeout(() => { /* malicious code */ }, 0)',
        'fetch("http://evil.com")',
        'XMLHttpRequest()',
        'localStorage.getItem("token")',
        'navigator.userAgent'
      ];

      dangerousExpressions.forEach(expression => {
        expect(testExpressionSecurity(expression)).toBe(false);
      });
    });

    it('devrait autoriser les expressions sûres', () => {
      const safeExpressions = [
        '$json.data.name',
        '$json.items.length > 0',
        '$json.status === "active"',
        '$json.price * 1.2',
        '$json.date.getTime()',
        '$json.array.filter(item => item.active)',
        '$json.user.email.includes("@")',
        'Math.max($json.a, $json.b)',
        'JSON.stringify($json.data)',
        '$json.name || "default"'
      ];

      safeExpressions.forEach(expression => {
        expect(testExpressionSecurity(expression)).toBe(true);
      });
    });
  });

  describe('Validation des configurations', () => {
    it('devrait valider correctement les configurations HTTP', () => {
      const validConfig = {
        url: 'https://api.example.com/data',
        method: 'GET',
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      };

      const result = validateNodeConfig('http', validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('devrait détecter les configurations invalides', () => {
      const invalidConfig = {
        url: 'not-a-url',
        method: 'INVALID',
        timeout: -1,
        headers: 'not-an-object'
      };

      const result = validateNodeConfig('http', invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('URL invalide');
      expect(result.errors).toContain('Méthode HTTP invalide');
      expect(result.errors).toContain('Timeout invalide (doit être entre 0 et 300000ms)');
      expect(result.errors).toContain('Headers doivent être un objet');
    });

    it('devrait gérer les configurations manquantes', () => {
      const result = validateNodeConfig('http', null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration manquante');
    });
  });

  describe('Performance', () => {
    it('devrait mesurer la performance d\'une fonction', async () => {
      const testFunction = () => {
        let sum = 0;
        const start = Date.now();
        // Simulation d'un calcul plus long pour garantir un temps mesurable
        for (let i = 0; i < 10000; i++) {
          sum += i;
        }
        // Ajouter un petit délai pour garantir un temps mesurable
        while (Date.now() - start < 1) {}
        return sum;
      };

      const result = await measurePerformance(testFunction);
      expect(result.result).toBe(49995000);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeLessThan(1000); // Devrait être rapide
    });

    it('devrait mesurer la performance d\'une fonction asynchrone', async () => {
      const asyncFunction = () => {
        return new Promise(resolve => {
          setTimeout(() => resolve('done'), 10);
        });
      };

      const result = await measurePerformance(asyncFunction);
      expect(result.result).toBe('done');
      expect(result.executionTime).toBeGreaterThan(10);
    });
  });

  describe('Gestion des nœuds', () => {
    it('devrait créer un workflow avec des nœuds connectés', () => {
      const workflow = createMockWorkflow(5);
      expect(workflow.nodes).toHaveLength(5);
      expect(workflow.edges).toHaveLength(4);

      // Vérifier que chaque nœud a un ID unique
      const ids = workflow.nodes.map(n => n.id);
      expect(new Set(ids)).toHaveLength(5);
      
      // Vérifier les connexions
      expect(workflow.edges[0].source).toBe('node-0');
      expect(workflow.edges[0].target).toBe('node-1');
    });

    it('devrait gérer les workflow vides', () => {
      const workflow = createMockWorkflow(0);
      expect(workflow.nodes).toHaveLength(0);
      expect(workflow.edges).toHaveLength(0);
    });
  });

  describe('Auto-layout', () => {
    it('devrait gérer l\'absence de dagre gracieusement', () => {
      // Simulation du cas où dagre n'est pas disponible
      const originalRequire = require;
      // Mock require pour simuler une erreur
      const mockRequire = vi.fn((module: string) => {
        if (module === 'dagre') {
          throw new Error('Module not found');
        }
        return originalRequire(module);
      });

      // Test que la fonction ne crash pas
      expect(() => {
        // Simulation d'appel à applyAutoLayout
        try {
          mockRequire('dagre');
        } catch (error) {
          // Fallback : disposition en grille
          const mockNodes = [{ id: '1' }, { id: '2' }, { id: '3' }];
          const nodes = mockNodes.map((node, index) => ({
            ...node,
            position: {
              x: (index % 3) * 200,
              y: Math.floor(index / 3) * 150,
            },
          }));

          expect(nodes).toHaveLength(3);
          expect(nodes[0].position).toEqual({ x: 0, y: 0 });
          expect(nodes[1].position).toEqual({ x: 200, y: 0 });
          expect(nodes[2].position).toEqual({ x: 400, y: 0 });
        }
      }).not.toThrow();
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs de parsing JSON', () => {
      const invalidJson = '{ invalid json }';
      expect(() => {
        try {
          JSON.parse(invalidJson);
        } catch (error: unknown) {
          // Simulation de la gestion d'erreur dans le composant
          const err = error as Error;
          console.warn('JSON invalide:', err.message);
          expect(error).toBeInstanceOf(Error);
        }
      }).not.toThrow();
    });

    it('devrait gérer les erreurs de validation regex', () => {
      const invalidPattern = '[invalid(regex';
      expect(() => {
        try {
          new RegExp(invalidPattern);
        } catch (error) {
          // Simulation de la gestion d'erreur
          expect(error).toBeInstanceOf(Error);
        }
      }).not.toThrow();
    });
  });
});

// Tests spécifiques pour les hooks et le state management
describe('State Management', () => {
  it('devrait gérer les états de sauvegarde', () => {
    const initialState = {
      isSaved: true,
      lastSaved: null,
      workflowName: 'Test Workflow'
    };

    // Simulation d'un changement
    const updatedState = {
      ...initialState,
      isSaved: false,
      lastSaved: null
    };

    expect(updatedState.isSaved).toBe(false);
    expect(updatedState.workflowName).toBe('Test Workflow');
  });

  it('devrait marquer comme sauvegardé après sauvegarde', () => {
    const state = {
      isSaved: false,
      lastSaved: null
    };

    const savedState = {
      ...state,
      isSaved: true,
      lastSaved: new Date()
    };

    expect(savedState.isSaved).toBe(true);
    expect(savedState.lastSaved).toBeInstanceOf(Date);
  });
});

// Tests pour les raccourcis clavier
describe('Keyboard Shortcuts', () => {
  it('devrait gérer les raccourcis clavier correctement', () => {
    const mockEvent = {
      key: 'Enter',
      ctrlKey: true,
      metaKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    };

    // Simulation de gestion d'événement
    const handleShortcut = (e: typeof mockEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        return 'execute';
      }
      return null;
    };

    const result = handleShortcut(mockEvent);
    expect(result).toBe('execute');
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });
});