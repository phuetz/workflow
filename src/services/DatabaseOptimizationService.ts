/**
 * PLAN C PHASE 3 - Service d'Optimisation des Requêtes Database
 * Optimisation des 50 requêtes les plus lentes
 */

import { logger } from './SimpleLogger';
import { cacheLayer } from './CacheLayer';

// Types

/**
 * Connection pool entry for database connections
 */
interface ConnectionPoolEntry {
  id: number;
  inUse: boolean;
  lastUsed: number;
}

export interface QueryMetrics {
  query: string;
  executionTime: number;
  rowsExamined: number;
  rowsReturned: number;
  timestamp: Date;
  frequency: number;
  optimizationPotential: 'high' | 'medium' | 'low';
}

export interface QueryOptimization {
  original: string;
  optimized: string;
  indexes?: string[];
  estimatedImprovement: number; // percentage
  explanation: string;
}

export interface DatabaseStats {
  slowQueries: QueryMetrics[];
  totalQueries: number;
  averageExecutionTime: number;
  cacheHitRate: number;
  connectionPoolUsage: number;
}

/**
 * Service d'optimisation des requêtes database
 */
export class DatabaseOptimizationService {
  private static instance: DatabaseOptimizationService;
  private queryMetrics: Map<string, QueryMetrics> = new Map();
  private connectionPool: ConnectionPoolEntry[] = [];
  private maxPoolSize = 20;
  
  // Seuils de performance
  private readonly SLOW_QUERY_THRESHOLD = 100; // ms
  private readonly CACHE_TTL = 300; // 5 minutes
  
  private constructor() {
    this.initializeMonitoring();
  }
  
  static getInstance(): DatabaseOptimizationService {
    if (!DatabaseOptimizationService.instance) {
      DatabaseOptimizationService.instance = new DatabaseOptimizationService();
    }
    return DatabaseOptimizationService.instance;
  }
  
  /**
   * Initialiser le monitoring des requêtes
   */
  private initializeMonitoring(): void {
    logger.info('Database optimization service initialized');
    
    // Simuler un pool de connexions
    for (let i = 0; i < this.maxPoolSize; i++) {
      this.connectionPool.push({
        id: i,
        inUse: false,
        lastUsed: Date.now()
      });
    }
  }
  
  /**
   * Exécuter une requête optimisée
   */
  async executeQuery<T = unknown>(
    query: string,
    params?: unknown[],
    options: {
      cache?: boolean;
      ttl?: number;
      optimize?: boolean;
    } = {}
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Optimiser la requête si demandé
      let finalQuery = query;
      if (options.optimize) {
        const optimization = this.optimizeQuery(query);
        finalQuery = optimization.optimized;
      }
      
      // Vérifier le cache
      if (options.cache) {
        const cacheKey = this.getCacheKey(finalQuery, params);
        const cached = await cacheLayer.get<T>(cacheKey);
        if (cached !== null) {
          logger.debug(`Cache hit for query: ${this.truncateQuery(finalQuery)}`);
          return cached;
        }
      }
      
      // Obtenir une connexion du pool
      const connection = await this.getConnection();
      
      try {
        // Simuler l'exécution de la requête
        const result = await this.simulateQueryExecution<T>(finalQuery, params);
        
        // Enregistrer les métriques
        const executionTime = Date.now() - startTime;
        this.recordMetrics(finalQuery, executionTime, result);
        
        // Mettre en cache si nécessaire
        if (options.cache) {
          const cacheKey = this.getCacheKey(finalQuery, params);
          await cacheLayer.set(cacheKey, result, options.ttl || this.CACHE_TTL);
        }
        
        return result;
      } finally {
        // Libérer la connexion
        this.releaseConnection(connection);
      }
      
    } catch (error) {
      logger.error('Query execution failed:', error);
      throw error;
    }
  }
  
  /**
   * Optimiser une requête SQL
   */
  optimizeQuery(query: string): QueryOptimization {
    const normalizedQuery = this.normalizeQuery(query);
    const optimizations: string[] = [];
    let optimized = normalizedQuery;
    
    // 1. Optimiser les SELECT *
    if (optimized.includes('SELECT *')) {
      optimized = optimized.replace('SELECT *', 'SELECT /* specify columns */');
      optimizations.push('Replace SELECT * with specific columns');
    }
    
    // 2. Ajouter des index hints
    if (optimized.includes('WHERE') && !optimized.includes('USE INDEX')) {
      const whereClause = optimized.match(/WHERE\s+(\w+)/);
      if (whereClause) {
        optimizations.push(`Consider adding index on ${whereClause[1]}`);
      }
    }
    
    // 3. Optimiser les JOINs
    if (optimized.includes('JOIN')) {
      // Convertir RIGHT JOIN en LEFT JOIN
      optimized = optimized.replace(/RIGHT\s+JOIN/gi, 'LEFT JOIN');
      if (normalizedQuery !== optimized) {
        optimizations.push('Converted RIGHT JOIN to LEFT JOIN');
      }
      
      // Suggérer l'ordre optimal des JOINs
      const joinCount = (optimized.match(/JOIN/g) || []).length;
      if (joinCount > 2) {
        optimizations.push('Consider reordering JOINs by selectivity');
      }
    }
    
    // 4. Limiter les résultats si pas de LIMIT
    if (!optimized.includes('LIMIT') && optimized.includes('SELECT')) {
      optimizations.push('Consider adding LIMIT clause');
    }
    
    // 5. Optimiser les sous-requêtes
    if (optimized.includes('IN (SELECT')) {
      optimized = optimized.replace('IN (SELECT', 'EXISTS (SELECT');
      optimizations.push('Converted IN subquery to EXISTS');
    }
    
    // 6. Éviter les fonctions sur les colonnes indexées
    const functionOnColumn = /WHERE\s+\w+\([^)]+\)/;
    if (functionOnColumn.test(optimized)) {
      optimizations.push('Avoid functions on indexed columns in WHERE clause');
    }
    
    // Calculer l'amélioration estimée
    const estimatedImprovement = optimizations.length * 15; // 15% par optimisation
    
    return {
      original: query,
      optimized,
      indexes: this.suggestIndexes(optimized),
      estimatedImprovement: Math.min(estimatedImprovement, 80),
      explanation: optimizations.join('; ')
    };
  }
  
  /**
   * Suggérer des index pour une requête
   */
  private suggestIndexes(query: string): string[] {
    const indexes: string[] = [];
    
    // Analyser les clauses WHERE
    const whereMatch = query.match(/WHERE\s+([^=\s]+)\s*=/g);
    if (whereMatch) {
      whereMatch.forEach(clause => {
        const column = clause.replace(/WHERE\s+|\s*=/g, '').trim();
        indexes.push(`CREATE INDEX idx_${column} ON table(${column})`);
      });
    }
    
    // Analyser les clauses JOIN
    const joinMatch = query.match(/ON\s+\w+\.(\w+)\s*=\s*\w+\.(\w+)/g);
    if (joinMatch) {
      joinMatch.forEach(clause => {
        const columns = clause.match(/\.(\w+)/g);
        if (columns) {
          columns.forEach(col => {
            const column = col.replace('.', '');
            indexes.push(`CREATE INDEX idx_${column} ON table(${column})`);
          });
        }
      });
    }
    
    // Analyser les clauses ORDER BY
    const orderMatch = query.match(/ORDER\s+BY\s+([^,\s]+)/);
    if (orderMatch) {
      const column = orderMatch[1].trim();
      indexes.push(`CREATE INDEX idx_${column}_sort ON table(${column})`);
    }
    
    return [...new Set(indexes)]; // Éliminer les doublons
  }
  
  /**
   * Obtenir les 50 requêtes les plus lentes
   */
  getSlowestQueries(limit: number = 50): QueryMetrics[] {
    const queries = Array.from(this.queryMetrics.values());
    
    return queries
      .filter(q => q.executionTime > this.SLOW_QUERY_THRESHOLD)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }
  
  /**
   * Générer un rapport d'optimisation
   */
  generateOptimizationReport(): {
    slowQueries: Array<{
      query: string;
      metrics: QueryMetrics;
      optimization: QueryOptimization;
    }>;
    summary: {
      totalSlowQueries: number;
      averageExecutionTime: number;
      potentialImprovement: number;
      recommendedActions: string[];
    };
  } {
    const slowQueries = this.getSlowestQueries();
    
    const optimizedQueries = slowQueries.map(metrics => ({
      query: metrics.query,
      metrics,
      optimization: this.optimizeQuery(metrics.query)
    }));
    
    const totalImprovement = optimizedQueries.reduce(
      (sum, q) => sum + q.optimization.estimatedImprovement,
      0
    ) / optimizedQueries.length;
    
    return {
      slowQueries: optimizedQueries,
      summary: {
        totalSlowQueries: slowQueries.length,
        averageExecutionTime: slowQueries.reduce((sum, q) => sum + q.executionTime, 0) / slowQueries.length,
        potentialImprovement: totalImprovement,
        recommendedActions: this.getRecommendedActions(slowQueries)
      }
    };
  }
  
  /**
   * Obtenir les actions recommandées
   */
  private getRecommendedActions(queries: QueryMetrics[]): string[] {
    const actions: string[] = [];
    
    // Analyser les patterns
    const hasSelectStar = queries.some(q => q.query.includes('SELECT *'));
    const hasNoLimit = queries.some(q => !q.query.includes('LIMIT'));
    const hasManyJoins = queries.some(q => (q.query.match(/JOIN/g) || []).length > 3);
    const hasSubqueries = queries.some(q => q.query.includes('(SELECT'));
    
    if (hasSelectStar) {
      actions.push('Replace SELECT * with specific column names in ' + 
        queries.filter(q => q.query.includes('SELECT *')).length + ' queries');
    }
    
    if (hasNoLimit) {
      actions.push('Add LIMIT clauses to unbounded queries');
    }
    
    if (hasManyJoins) {
      actions.push('Review and optimize complex JOIN operations');
    }
    
    if (hasSubqueries) {
      actions.push('Consider replacing subqueries with JOINs or CTEs');
    }
    
    // Recommandations générales
    if (queries.length > 10) {
      actions.push('Implement query result caching for frequently executed queries');
      actions.push('Consider database indexing review');
      actions.push('Enable query plan caching');
    }
    
    return actions;
  }
  
  /**
   * Batch optimization pour plusieurs requêtes
   */
  async batchOptimize(queries: string[]): Promise<QueryOptimization[]> {
    return queries.map(query => this.optimizeQuery(query));
  }
  
  /**
   * Connection pooling
   */
  private async getConnection(): Promise<ConnectionPoolEntry> {
    // Trouver une connexion disponible
    const connection = this.connectionPool.find(c => !c.inUse);

    if (!connection) {
      // Attendre qu'une connexion se libère
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.getConnection();
    }

    connection.inUse = true;
    connection.lastUsed = Date.now();
    return connection;
  }

  private releaseConnection(connection: ConnectionPoolEntry | null): void {
    if (connection) {
      connection.inUse = false;
    }
  }
  
  /**
   * Helpers
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\n/g, ' ')
      .trim()
      .toUpperCase();
  }
  
  private getCacheKey(query: string, params?: unknown[]): string {
    const normalizedQuery = this.normalizeQuery(query);
    const paramsKey = params ? JSON.stringify(params) : '';
    return `db:${normalizedQuery}:${paramsKey}`;
  }
  
  private truncateQuery(query: string): string {
    return query.length > 50 ? query.substring(0, 50) + '...' : query;
  }
  
  private recordMetrics(query: string, executionTime: number, result: unknown): void {
    const normalizedQuery = this.normalizeQuery(query);

    const existing = this.queryMetrics.get(normalizedQuery);

    if (existing) {
      existing.executionTime = (existing.executionTime + executionTime) / 2;
      existing.frequency++;
    } else {
      this.queryMetrics.set(normalizedQuery, {
        query: normalizedQuery,
        executionTime,
        rowsExamined: 0, // Would be from actual DB
        rowsReturned: Array.isArray(result) ? result.length : 1,
        timestamp: new Date(),
        frequency: 1,
        optimizationPotential: executionTime > 200 ? 'high' :
                              executionTime > 100 ? 'medium' : 'low'
      });
    }

    // Log slow queries
    if (executionTime > this.SLOW_QUERY_THRESHOLD) {
      logger.warn(`Slow query detected (${executionTime}ms): ${this.truncateQuery(query)}`);
    }
  }

  private async simulateQueryExecution<T>(query: string, _params?: unknown[]): Promise<T> {
    // Simuler l'exécution avec un délai variable
    const baseTime = query.includes('JOIN') ? 50 : 20;
    const randomDelay = Math.random() * 100;
    
    await new Promise(resolve => setTimeout(resolve, baseTime + randomDelay));
    
    // Retourner des données simulées
    return {
      success: true,
      data: [],
      rowCount: Math.floor(Math.random() * 100)
    } as unknown as T;
  }
  
  /**
   * Obtenir les statistiques de la base de données
   */
  getStats(): DatabaseStats {
    const queries = Array.from(this.queryMetrics.values());
    const slowQueries = queries.filter(q => q.executionTime > this.SLOW_QUERY_THRESHOLD);
    
    return {
      slowQueries,
      totalQueries: queries.length,
      averageExecutionTime: queries.reduce((sum, q) => sum + q.executionTime, 0) / queries.length || 0,
      cacheHitRate: 0.75, // Simulated
      connectionPoolUsage: this.connectionPool.filter(c => c.inUse).length / this.maxPoolSize
    };
  }
}

// Export singleton instance
export const dbOptimizer = DatabaseOptimizationService.getInstance();