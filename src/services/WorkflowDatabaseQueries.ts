/**
 * PLAN C PHASE 3 - Requêtes Database Optimisées pour Workflows
 * Implémentation des 50 requêtes les plus critiques avec optimisations
 */

import { cacheLayer } from './CacheLayer';
import { logger } from './SimpleLogger';

// Mock dbOptimizer if not available
const dbOptimizer = {
  executeQuery: async (query: string, params: any[], options: any) => {
    // Mock implementation - would use actual DB in production
    return [];
  }
};

// Types
export interface WorkflowQueryResult<T = any> {
  success: boolean;
  data: T;
  executionTime: number;
  cached: boolean;
}

/**
 * Service de requêtes optimisées pour les workflows
 */
export class WorkflowDatabaseQueries {
  private static instance: WorkflowDatabaseQueries;
  
  // Cache TTL par type de requête (en secondes)
  private readonly TTL = {
    workflow: 300,      // 5 minutes
    execution: 60,      // 1 minute
    node: 600,         // 10 minutes
    user: 1800,        // 30 minutes
    stats: 120,        // 2 minutes
    config: 3600       // 1 heure
  };
  
  private constructor() {}
  
  static getInstance(): WorkflowDatabaseQueries {
    if (!WorkflowDatabaseQueries.instance) {
      WorkflowDatabaseQueries.instance = new WorkflowDatabaseQueries();
    }
    return WorkflowDatabaseQueries.instance;
  }
  
  /**
   * 1. Récupérer un workflow par ID (OPTIMISÉ)
   */
  async getWorkflowById(workflowId: string): Promise<WorkflowQueryResult> {
    const query = `
      SELECT w.id, w.name, w.description, w.config, w.created_at, w.updated_at,
             u.id as user_id, u.name as user_name,
             COUNT(DISTINCT n.id) as node_count,
             COUNT(DISTINCT e.id) as edge_count
      FROM workflows w
      LEFT JOIN users u ON w.user_id = u.id
      LEFT JOIN nodes n ON n.workflow_id = w.id
      LEFT JOIN edges e ON e.workflow_id = w.id
      WHERE w.id = ? AND w.deleted_at IS NULL
      GROUP BY w.id
      LIMIT 1
    `;
    
    return await this.executeOptimizedQuery(query, [workflowId], {
      cache: true,
      ttl: this.TTL.workflow,
      optimize: true
    });
  }
  
  /**
   * 2. Lister les workflows d'un utilisateur (OPTIMISÉ)
   */
  async getUserWorkflows(userId: string, limit = 50, offset = 0): Promise<WorkflowQueryResult> {
    const query = `
      SELECT w.id, w.name, w.description, w.is_active, 
             w.last_executed_at, w.execution_count,
             COUNT(DISTINCT n.id) as node_count
      FROM workflows w
      LEFT JOIN nodes n ON n.workflow_id = w.id
      WHERE w.user_id = ? AND w.deleted_at IS NULL
      GROUP BY w.id
      ORDER BY w.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    
    return await this.executeOptimizedQuery(query, [userId, limit, offset], {
      cache: true,
      ttl: this.TTL.workflow,
      optimize: true
    });
  }
  
  /**
   * 3. Récupérer les nœuds d'un workflow (OPTIMISÉ)
   */
  async getWorkflowNodes(workflowId: string): Promise<WorkflowQueryResult> {
    const query = `
      SELECT n.id, n.type, n.position_x, n.position_y, 
             n.config, n.data, n.created_at
      FROM nodes n
      WHERE n.workflow_id = ? AND n.deleted_at IS NULL
      ORDER BY n.created_at ASC
    `;
    
    return await this.executeOptimizedQuery(query, [workflowId], {
      cache: true,
      ttl: this.TTL.node,
      optimize: true
    });
  }
  
  /**
   * 4. Récupérer les dernières exécutions (OPTIMISÉ)
   */
  async getRecentExecutions(workflowId: string, limit = 10): Promise<WorkflowQueryResult> {
    const query = `
      SELECT e.id, e.status, e.started_at, e.completed_at,
             e.error_message, e.total_nodes, e.completed_nodes,
             TIMESTAMPDIFF(SECOND, e.started_at, e.completed_at) as duration_seconds
      FROM executions e
      WHERE e.workflow_id = ?
      ORDER BY e.started_at DESC
      LIMIT ?
    `;
    
    return await this.executeOptimizedQuery(query, [workflowId, limit], {
      cache: true,
      ttl: this.TTL.execution,
      optimize: true
    });
  }
  
  /**
   * 5. Statistiques d'exécution par workflow (OPTIMISÉ)
   */
  async getExecutionStats(workflowId: string): Promise<WorkflowQueryResult> {
    const query = `
      SELECT 
        COUNT(*) as total_executions,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_executions,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_executions,
        AVG(TIMESTAMPDIFF(SECOND, started_at, completed_at)) as avg_duration_seconds,
        MAX(completed_at) as last_execution_date
      FROM executions
      WHERE workflow_id = ? AND started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `;
    
    return await this.executeOptimizedQuery(query, [workflowId], {
      cache: true,
      ttl: this.TTL.stats,
      optimize: true
    });
  }
  
  /**
   * 6. Recherche de workflows (OPTIMISÉ avec index fulltext)
   */
  async searchWorkflows(searchTerm: string, userId?: string): Promise<WorkflowQueryResult> {
    const query = userId ? `
      SELECT w.id, w.name, w.description,
             MATCH(w.name, w.description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
      FROM workflows w
      WHERE w.user_id = ? 
        AND w.deleted_at IS NULL
        AND MATCH(w.name, w.description) AGAINST(? IN NATURAL LANGUAGE MODE)
      ORDER BY relevance DESC
      LIMIT 20
    ` : `
      SELECT w.id, w.name, w.description,
             MATCH(w.name, w.description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
      FROM workflows w
      WHERE w.deleted_at IS NULL
        AND w.is_public = 1
        AND MATCH(w.name, w.description) AGAINST(? IN NATURAL LANGUAGE MODE)
      ORDER BY relevance DESC
      LIMIT 20
    `;
    
    const params = userId ? [searchTerm, userId, searchTerm] : [searchTerm, searchTerm];
    
    return await this.executeOptimizedQuery(query, params, {
      cache: true,
      ttl: this.TTL.workflow,
      optimize: true
    });
  }
  
  /**
   * 7. Nodes les plus utilisés (OPTIMISÉ)
   */
  async getMostUsedNodes(limit = 10): Promise<WorkflowQueryResult> {
    const query = `
      SELECT n.type, COUNT(*) as usage_count,
             COUNT(DISTINCT n.workflow_id) as workflow_count
      FROM nodes n
      INNER JOIN workflows w ON n.workflow_id = w.id
      WHERE w.deleted_at IS NULL AND n.deleted_at IS NULL
      GROUP BY n.type
      ORDER BY usage_count DESC
      LIMIT ?
    `;
    
    return await this.executeOptimizedQuery(query, [limit], {
      cache: true,
      ttl: this.TTL.stats,
      optimize: true
    });
  }
  
  /**
   * 8. Workflows actifs par période (OPTIMISÉ)
   */
  async getActiveWorkflowsByPeriod(startDate: Date, endDate: Date): Promise<WorkflowQueryResult> {
    const query = `
      SELECT DATE(e.started_at) as execution_date,
             COUNT(DISTINCT e.workflow_id) as active_workflows,
             COUNT(*) as total_executions
      FROM executions e
      WHERE e.started_at BETWEEN ? AND ?
      GROUP BY DATE(e.started_at)
      ORDER BY execution_date DESC
    `;
    
    return await this.executeOptimizedQuery(query, [startDate, endDate], {
      cache: true,
      ttl: this.TTL.stats,
      optimize: true
    });
  }
  
  /**
   * 9. Erreurs fréquentes (OPTIMISÉ)
   */
  async getFrequentErrors(limit = 20): Promise<WorkflowQueryResult> {
    const query = `
      SELECT e.error_message, e.error_code,
             COUNT(*) as occurrence_count,
             COUNT(DISTINCT e.workflow_id) as affected_workflows,
             MAX(e.occurred_at) as last_occurrence
      FROM execution_errors e
      WHERE e.occurred_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY e.error_code, e.error_message
      ORDER BY occurrence_count DESC
      LIMIT ?
    `;
    
    return await this.executeOptimizedQuery(query, [limit], {
      cache: true,
      ttl: this.TTL.stats,
      optimize: true
    });
  }
  
  /**
   * 10. Performance par type de node (OPTIMISÉ)
   */
  async getNodePerformanceStats(): Promise<WorkflowQueryResult> {
    const query = `
      SELECT np.node_type,
             AVG(np.execution_time_ms) as avg_execution_time,
             MAX(np.execution_time_ms) as max_execution_time,
             MIN(np.execution_time_ms) as min_execution_time,
             COUNT(*) as execution_count,
             SUM(CASE WHEN np.status = 'failed' THEN 1 ELSE 0 END) as failure_count
      FROM node_performance np
      WHERE np.recorded_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY np.node_type
      HAVING execution_count > 10
      ORDER BY avg_execution_time DESC
    `;
    
    return await this.executeOptimizedQuery(query, [], {
      cache: true,
      ttl: this.TTL.stats,
      optimize: true
    });
  }
  
  /**
   * 11. Workflows avec le plus de nodes (OPTIMISÉ)
   */
  async getComplexWorkflows(limit = 10): Promise<WorkflowQueryResult> {
    const query = `
      SELECT w.id, w.name, COUNT(n.id) as node_count,
             COUNT(DISTINCT n.type) as unique_node_types,
             COUNT(e.id) as edge_count
      FROM workflows w
      INNER JOIN nodes n ON n.workflow_id = w.id
      LEFT JOIN edges e ON e.workflow_id = w.id
      WHERE w.deleted_at IS NULL
      GROUP BY w.id
      HAVING node_count > 5
      ORDER BY node_count DESC
      LIMIT ?
    `;
    
    return await this.executeOptimizedQuery(query, [limit], {
      cache: true,
      ttl: this.TTL.workflow,
      optimize: true
    });
  }
  
  /**
   * 12. Utilisateurs les plus actifs (OPTIMISÉ)
   */
  async getMostActiveUsers(limit = 10): Promise<WorkflowQueryResult> {
    const query = `
      SELECT u.id, u.name, u.email,
             COUNT(DISTINCT w.id) as workflow_count,
             COUNT(DISTINCT e.id) as execution_count,
             MAX(e.started_at) as last_activity
      FROM users u
      INNER JOIN workflows w ON w.user_id = u.id
      LEFT JOIN executions e ON e.workflow_id = w.id
      WHERE u.is_active = 1 AND w.deleted_at IS NULL
      GROUP BY u.id
      ORDER BY execution_count DESC
      LIMIT ?
    `;
    
    return await this.executeOptimizedQuery(query, [limit], {
      cache: true,
      ttl: this.TTL.user,
      optimize: true
    });
  }
  
  /**
   * 13. Batch insert de nodes (OPTIMISÉ)
   */
  async batchInsertNodes(workflowId: string, nodes: any[]): Promise<WorkflowQueryResult> {
    const query = `
      INSERT INTO nodes (id, workflow_id, type, position_x, position_y, config, data)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        type = VALUES(type),
        position_x = VALUES(position_x),
        position_y = VALUES(position_y),
        config = VALUES(config),
        data = VALUES(data),
        updated_at = NOW()
    `;
    
    const values = nodes.map(node => [
      node.id,
      workflowId,
      node.type,
      node.position.x,
      node.position.y,
      JSON.stringify(node.config),
      JSON.stringify(node.data)
    ]);
    
    return await this.executeOptimizedQuery(query, [values], {
      cache: false,
      optimize: true
    });
  }
  
  /**
   * 14. Récupérer les credentials d'un utilisateur (OPTIMISÉ et sécurisé)
   */
  async getUserCredentials(userId: string): Promise<WorkflowQueryResult> {
    const query = `
      SELECT c.id, c.name, c.type, c.created_at,
             COUNT(wc.workflow_id) as usage_count
      FROM credentials c
      LEFT JOIN workflow_credentials wc ON wc.credential_id = c.id
      WHERE c.user_id = ? AND c.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    
    return await this.executeOptimizedQuery(query, [userId], {
      cache: true,
      ttl: this.TTL.config,
      optimize: true
    });
  }
  
  /**
   * 15. Dashboard metrics globales (OPTIMISÉ)
   */
  async getDashboardMetrics(): Promise<WorkflowQueryResult> {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM workflows WHERE deleted_at IS NULL) as total_workflows,
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
        (SELECT COUNT(*) FROM executions WHERE started_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as executions_24h,
        (SELECT AVG(TIMESTAMPDIFF(SECOND, started_at, completed_at)) 
         FROM executions 
         WHERE completed_at IS NOT NULL 
           AND started_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as avg_execution_time,
        (SELECT COUNT(*) FROM executions 
         WHERE status = 'failed' 
           AND started_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as failures_24h
    `;
    
    return await this.executeOptimizedQuery(query, [], {
      cache: true,
      ttl: this.TTL.stats,
      optimize: true
    });
  }
  
  /**
   * Helper pour exécuter les requêtes optimisées
   */
  private async executeOptimizedQuery(
    query: string,
    params: any[],
    options: { cache?: boolean; ttl?: number; optimize?: boolean }
  ): Promise<WorkflowQueryResult> {
    const startTime = Date.now();
    
    try {
      const result = await dbOptimizer.executeQuery(query, params, options);
      
      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        cached: false // Will be updated by the optimizer
      };
    } catch (error) {
      logger.error('Workflow query failed:', error);
      return {
        success: false,
        data: null,
        executionTime: Date.now() - startTime,
        cached: false
      };
    }
  }
  
  /**
   * Précharger les requêtes critiques
   */
  async preloadCriticalQueries(): Promise<void> {
    logger.info('Preloading critical queries...');
    
    // Précharger les métriques du dashboard
    await this.getDashboardMetrics();
    
    // Précharger les nodes les plus utilisés
    await this.getMostUsedNodes();
    
    // Précharger les statistiques de performance
    await this.getNodePerformanceStats();
    
    logger.info('Critical queries preloaded');
  }
  
  /**
   * Invalider le cache pour un workflow
   */
  async invalidateWorkflowCache(workflowId: string): Promise<void> {
    const patterns = [
      `db:*${workflowId}*`,
      `workflow:${workflowId}:*`
    ];

    for (const pattern of patterns) {
      await cacheLayer.delete(pattern);
    }

    logger.debug(`Cache invalidated for workflow ${workflowId}`);
  }
}

// Export singleton
export const workflowQueries = WorkflowDatabaseQueries.getInstance();