# Validation Loop - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Installation

Les fichiers sont déjà en place. Aucune installation supplémentaire nécessaire.

### 2. Configuration Rapide

```bash
# Créer une copie locale de la configuration
cp config/validation-loop.json config/validation-loop.local.json

# Configurer les variables d'environnement
cat > .env.local << EOF
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR_WEBHOOK
ALERT_EMAIL=your-email@company.com
PAGERDUTY_SERVICE_KEY=your_pagerduty_key
EOF
```

### 3. Premier Test

```typescript
// test-validation.ts
import { validationLoop } from './src/monitoring/ValidationLoop';

// Correction simple pour tester le système
const testCorrection = {
  id: 'test-001',
  type: 'auto',
  errorType: 'NETWORK_ERROR',
  method: 'retry',
  description: 'Test correction',
  apply: async () => {
    console.log('Applying correction...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      message: 'Test correction successful',
      changes: ['Test change applied']
    };
  }
};

// Exécuter la validation
const result = await validationLoop.validate(testCorrection);

console.log('✅ Validation Result:', {
  success: result.success,
  duration: `${result.duration}ms`,
  preChecks: `${result.preChecks.length} checks`,
  postChecks: `${result.postChecks.length} checks`,
  recommendations: result.recommendations
});
```

### 4. Lancer le Dashboard

```bash
# Le dashboard est intégré au projet
# Accéder via:
http://localhost:3000/validation-dashboard

# Ou ajouter la route dans votre App.tsx:
import ValidationDashboard from './components/ValidationDashboard';

<Route path="/validation-dashboard" element={<ValidationDashboard />} />
```

### 5. Run Tests

```bash
# Tests E2E complets
npm test src/__tests__/monitoring/validation-e2e.test.ts

# Avec logs détaillés
npm test src/__tests__/monitoring/validation-e2e.test.ts -- --verbose

# Avec coverage
npm run test:coverage -- src/monitoring
```

## 📋 Exemples d'Usage

### Exemple 1: Correction Simple

```typescript
import { validationLoop } from './src/monitoring/ValidationLoop';

const correction = {
  id: 'fix-cache-001',
  type: 'auto',
  errorType: 'CACHE_ERROR',
  method: 'clear_and_rebuild',
  description: 'Clear and rebuild cache',
  apply: async () => {
    // Votre logique ici
    await clearCache();
    await rebuildCache();
    return {
      success: true,
      message: 'Cache rebuilt successfully',
      changes: ['Cleared cache', 'Rebuilt indexes']
    };
  }
};

const result = await validationLoop.validate(correction);
```

### Exemple 2: Avec Prédiction

```typescript
import { validationLoop } from './src/monitoring/ValidationLoop';
import { correctionLearner } from './src/monitoring/LearningSystem';

// 1. Prédire le succès
const prediction = correctionLearner.predictSuccess(correction);

console.log(`Success probability: ${(prediction.successProbability * 100).toFixed(1)}%`);
console.log(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);

// 2. Décider d'appliquer ou non
if (prediction.successProbability > 0.7) {
  const result = await validationLoop.validate(correction);
} else {
  console.log('Low success probability. Alternatives:',
    prediction.alternativeMethods
  );
}
```

### Exemple 3: Avec Alertes

```typescript
import { intelligentAlerts } from './src/monitoring/AlertSystem';

const error = new Error('Database connection lost');
const errorType = 'DATABASE_ERROR';

// Vérifier si on doit alerter
if (await intelligentAlerts.shouldAlert(error, errorType)) {
  // Envoyer l'alerte
  await intelligentAlerts.sendAlert(error, errorType, ['slack', 'email']);
}

// Marquer auto-fix en cours (supprime les alertes)
intelligentAlerts.markAutoFixInProgress(errorType);

// Appliquer la correction
const result = await validationLoop.validate(correction);

// Marquer auto-fix terminé
intelligentAlerts.markAutoFixComplete(errorType);
```

### Exemple 4: Métriques Personnalisées

```typescript
import { validationMetrics } from './src/monitoring/ValidationMetrics';

// Enregistrer une validation
validationMetrics.recordValidation(
  'NETWORK_ERROR',
  true,  // success
  5000   // resolution time ms
);

// Enregistrer l'impact performance
validationMetrics.recordPerformanceImpact(
  15,    // CPU increase %
  10,    // Memory increase %
  100,   // Latency increase ms
  30000  // Duration ms
);

// Obtenir le snapshot complet
const snapshot = validationMetrics.getSnapshot();

console.log('Overall Stats:', {
  totalValidations: snapshot.overall.totalValidations,
  successRate: `${(snapshot.overall.overallSuccessRate * 100).toFixed(1)}%`,
  avgTime: `${(snapshot.overall.avgResolutionTime / 1000).toFixed(2)}s`
});

// Stats par type d'erreur
const errorStats = snapshot.byErrorType.get('NETWORK_ERROR');
console.log('Network Error Stats:', {
  successRate: `${(errorStats?.successRate * 100).toFixed(1)}%`,
  avgTime: `${(errorStats?.avgResolutionTime / 1000).toFixed(2)}s`,
  trend: errorStats?.trendDirection
});
```

### Exemple 5: Tests de Régression

```typescript
import { regressionTester } from './src/monitoring/RegressionTests';

// Après une correction, run les tests
const testResult = await regressionTester.runAfterCorrection(correction);

console.log('Test Results:', {
  success: testResult.success,
  passed: `${testResult.passedTests}/${testResult.totalTests}`,
  failed: testResult.failedTests,
  duration: `${(testResult.duration / 1000).toFixed(2)}s`
});

if (!testResult.success) {
  console.error('Critical failures:', testResult.criticalFailures);
}

// Tester un endpoint spécifique
const healthCheck = await regressionTester.testEndpoint('/api/health');
console.log('Health check:', healthCheck.success);
```

## 🎯 Use Cases Communs

### Use Case 1: Auto-Correction Réseau

```typescript
// Détecter une erreur réseau
const error = new Error('Network timeout');

// Créer la correction
const correction = {
  id: `fix-network-${Date.now()}`,
  type: 'auto',
  errorType: 'NETWORK_ERROR',
  method: 'retry_with_backoff',
  description: 'Retry with exponential backoff',
  apply: async () => {
    let retries = 0;
    let delay = 1000;

    while (retries < 3) {
      try {
        await performNetworkRequest();
        return {
          success: true,
          message: 'Network request successful',
          changes: [`Succeeded after ${retries} retries`]
        };
      } catch (err) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }

    return {
      success: false,
      message: 'Network request failed after 3 retries',
      changes: []
    };
  },
  rollback: async () => {
    // Reset network state if needed
  }
};

// Valider et appliquer
const result = await validationLoop.validate(correction);
```

### Use Case 2: Auto-Correction Database

```typescript
const databaseCorrection = {
  id: `fix-db-${Date.now()}`,
  type: 'auto',
  errorType: 'DATABASE_ERROR',
  method: 'reconnect_and_retry',
  description: 'Reconnect to database',
  apply: async () => {
    // 1. Fermer la connexion existante
    await db.close();

    // 2. Attendre un peu
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Reconnecter
    await db.connect();

    // 4. Valider la connexion
    const isHealthy = await db.ping();

    if (!isHealthy) {
      throw new Error('Database reconnection failed');
    }

    return {
      success: true,
      message: 'Database reconnected successfully',
      changes: ['Closed old connection', 'Established new connection']
    };
  },
  rollback: async () => {
    // Try to restore old connection if available
  }
};

const result = await validationLoop.validate(databaseCorrection);
```

### Use Case 3: Monitoring avec Apprentissage

```typescript
import { validationLoop } from './src/monitoring/ValidationLoop';
import { correctionLearner } from './src/monitoring/LearningSystem';
import { validationMetrics } from './src/monitoring/ValidationMetrics';

// Boucle de monitoring continue
setInterval(async () => {
  // 1. Vérifier la santé du système
  const health = monitoringSystem.getHealthStatus();

  if (health.status !== 'healthy') {
    // 2. Obtenir la meilleure stratégie
    const strategy = correctionLearner.getBestStrategy('SYSTEM_HEALTH_ERROR');

    if (strategy) {
      // 3. Créer la correction
      const correction = {
        id: `auto-heal-${Date.now()}`,
        type: 'auto',
        errorType: 'SYSTEM_HEALTH_ERROR',
        method: strategy.method,
        description: `Auto-healing with ${strategy.method}`,
        apply: async () => {
          // Appliquer la meilleure stratégie
          return await applyStrategy(strategy);
        }
      };

      // 4. Prédire le succès
      const prediction = correctionLearner.predictSuccess(correction);

      if (prediction.successProbability > 0.6) {
        // 5. Appliquer la correction
        const result = await validationLoop.validate(correction);

        // 6. Enregistrer les métriques
        validationMetrics.recordValidation(
          correction.errorType,
          result.success,
          result.duration
        );
      }
    }
  }
}, 60000); // Check every minute
```

## 🔧 Configuration Personnalisée

### Ajouter une Règle de Validation

```typescript
import { validationLoop } from './src/monitoring/ValidationLoop';

validationLoop.addRule({
  id: 'api-latency-check',
  name: 'API Latency Check',
  type: 'post-check',
  severity: 'warning',
  enabled: true,
  timeout: 5000,
  check: async (context) => {
    const start = Date.now();
    const response = await fetch('/api/health');
    const latency = Date.now() - start;

    return {
      passed: latency < 500,
      message: `API latency: ${latency}ms`,
      metrics: { latency }
    };
  }
});
```

### Ajouter un Canal d'Alerte

```typescript
import { intelligentAlerts } from './src/monitoring/AlertSystem';

intelligentAlerts.addChannel({
  name: 'teams',
  type: 'webhook',
  enabled: true,
  config: {
    webhookUrl: 'https://outlook.office.com/webhook/...'
  },
  send: async (alert) => {
    const message = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: alert.title,
      themeColor: alert.severity === 'critical' ? 'FF0000' : 'FFA500',
      sections: [{
        activityTitle: alert.title,
        activitySubtitle: alert.description,
        facts: [
          { name: 'Severity', value: alert.severity },
          { name: 'Error Type', value: alert.errorType },
          { name: 'Time', value: alert.timestamp.toLocaleString() }
        ]
      }]
    };

    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  }
});
```

### Ajouter une Suite de Tests

```typescript
import { regressionTester } from './src/monitoring/RegressionTests';

regressionTester.addTestSuite({
  name: 'Custom API Tests',
  parallel: true,
  timeout: 30000,
  critical: true,
  tests: [
    {
      name: 'Test authentication',
      run: async () => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: 'test', password: 'test' })
        });

        return {
          success: response.ok,
          testName: 'Authentication',
          duration: 0,
          details: { status: response.status }
        };
      },
      critical: true
    },
    {
      name: 'Test data access',
      run: async () => {
        const response = await fetch('/api/data');

        return {
          success: response.ok && response.status === 200,
          testName: 'Data Access',
          duration: 0
        };
      },
      critical: true
    }
  ]
});
```

## 📊 Dashboard Utilisation

### Accéder au Dashboard

1. Naviguer vers `http://localhost:3000/validation-dashboard`
2. Le dashboard se rafraîchit automatiquement toutes les 5 secondes
3. Sélectionner la plage de temps (1h/24h/7d)

### Sections du Dashboard

1. **Metrics Overview**: Vue d'ensemble des métriques clés
2. **Success Rate Chart**: Graphique du taux de succès
3. **Resolution Time Chart**: Graphique des temps de résolution
4. **Error Type Breakdown**: Tableau détaillé par type d'erreur
5. **Recent Corrections**: 20 dernières corrections
6. **Learning Progress**: État du système d'apprentissage
7. **System Health**: Health checks en temps réel
8. **Alerts Panel**: Statistiques d'alerting
9. **Performance Impact**: Impact sur les performances
10. **User Impact**: Impact utilisateur
11. **Recommendations**: Recommandations AI

## 🐛 Troubleshooting

### Problème: Tests échouent

```bash
# Vérifier que le backend est lancé
npm run dev:backend

# Vérifier les health checks
curl http://localhost:3001/api/health

# Run tests avec logs
npm test src/__tests__/monitoring/validation-e2e.test.ts -- --verbose
```

### Problème: Dashboard ne charge pas

```typescript
// Vérifier les imports
import ValidationDashboard from './src/components/ValidationDashboard';

// Vérifier que les singletons sont importés
import { validationLoop } from './src/monitoring/ValidationLoop';
import { validationMetrics } from './src/monitoring/ValidationMetrics';

// Vérifier dans la console du navigateur
console.log('ValidationLoop:', validationLoop);
console.log('ValidationMetrics:', validationMetrics);
```

### Problème: Alertes ne sont pas envoyées

```typescript
// Vérifier la configuration
const stats = intelligentAlerts.getStatistics();
console.log('Alert stats:', stats);

// Vérifier les channels
intelligentAlerts.channels.forEach((channel, name) => {
  console.log(`Channel ${name}: enabled=${channel.enabled}`);
});

// Tester manuellement
const testError = new Error('Test alert');
await intelligentAlerts.sendAlert(testError, 'TEST_ERROR', ['slack']);
```

## 📚 Ressources

- [Documentation complète](./VALIDATION_LOOP_IMPLEMENTATION.md)
- [Guide de delivery](./VALIDATION_LOOP_DELIVERY.md)
- [Tests E2E](./src/__tests__/monitoring/validation-e2e.test.ts)
- [Configuration](./config/validation-loop.json)

## 🆘 Support

Pour toute question ou problème:
1. Consulter la documentation complète
2. Vérifier les tests E2E pour des exemples
3. Regarder les logs du système
4. Vérifier la configuration

---

**Prêt à utiliser le système de Validation Loop! 🚀**
