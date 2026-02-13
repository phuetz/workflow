/**
 * QueryParser - SQL query parsing for security analytics
 */

import type {
  ParsedQuery,
  QueryCondition,
  JoinClause,
  OrderByClause
} from './types';

export class QueryParser {
  parse(sql: string): ParsedQuery {
    const normalized = sql.trim().toUpperCase();
    const type = this.detectQueryType(normalized);

    return {
      type,
      tables: this.extractTables(sql),
      columns: this.extractColumns(sql),
      conditions: this.extractConditions(sql),
      joins: this.extractJoins(sql),
      groupBy: this.extractGroupBy(sql),
      orderBy: this.extractOrderBy(sql),
      limit: this.extractLimit(sql),
      offset: this.extractOffset(sql),
      parameters: this.extractParameters(sql)
    };
  }

  private detectQueryType(sql: string): ParsedQuery['type'] {
    if (sql.startsWith('SELECT')) return 'select';
    if (sql.startsWith('INSERT')) return 'insert';
    if (sql.startsWith('UPDATE')) return 'update';
    if (sql.startsWith('DELETE')) return 'delete';
    if (sql.startsWith('CREATE')) return 'create';
    if (sql.startsWith('DROP')) return 'drop';
    return 'select';
  }

  private extractTables(sql: string): string[] {
    const tables: string[] = [];
    const fromMatch = sql.match(/FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    const joinMatch = sql.match(/JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);

    if (fromMatch) {
      fromMatch.forEach(m => {
        const table = m.replace(/FROM\s+/i, '');
        if (!tables.includes(table)) tables.push(table);
      });
    }

    if (joinMatch) {
      joinMatch.forEach(m => {
        const table = m.replace(/JOIN\s+/i, '');
        if (!tables.includes(table)) tables.push(table);
      });
    }

    return tables;
  }

  private extractColumns(sql: string): string[] {
    const selectMatch = sql.match(/SELECT\s+([\s\S]*?)\s+FROM/i);
    if (!selectMatch) return ['*'];

    const columnsPart = selectMatch[1];
    if (columnsPart.trim() === '*') return ['*'];

    return columnsPart
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);
  }

  private extractConditions(sql: string): QueryCondition[] {
    const conditions: QueryCondition[] = [];
    const whereMatch = sql.match(/WHERE\s+([\s\S]*?)(?:GROUP BY|ORDER BY|LIMIT|$)/i);

    if (whereMatch) {
      const wherePart = whereMatch[1];
      const conditionPatterns = wherePart.split(/\s+(AND|OR)\s+/i);

      let conjunction: 'AND' | 'OR' = 'AND';
      for (const part of conditionPatterns) {
        if (part.toUpperCase() === 'AND' || part.toUpperCase() === 'OR') {
          conjunction = part.toUpperCase() as 'AND' | 'OR';
          continue;
        }

        const operatorMatch = part.match(
          /([a-zA-Z_][a-zA-Z0-9_.]*)\s*(=|!=|<>|>=|<=|>|<|LIKE|IN|NOT IN|IS NULL|IS NOT NULL)\s*(.*)/i
        );
        if (operatorMatch) {
          conditions.push({
            field: operatorMatch[1],
            operator: operatorMatch[2],
            value: operatorMatch[3]?.trim(),
            conjunction
          });
        }
      }
    }

    return conditions;
  }

  private extractJoins(sql: string): JoinClause[] {
    const joins: JoinClause[] = [];
    const joinPattern =
      /(INNER|LEFT|RIGHT|FULL)?\s*JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:AS\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*ON\s+([^JOIN]*?)(?=(?:INNER|LEFT|RIGHT|FULL)?\s*JOIN|WHERE|GROUP|ORDER|LIMIT|$)/gi;

    let match;
    while ((match = joinPattern.exec(sql)) !== null) {
      joins.push({
        type: (match[1]?.toUpperCase() || 'INNER') as JoinClause['type'],
        table: match[2],
        condition: match[3].trim()
      });
    }

    return joins;
  }

  private extractGroupBy(sql: string): string[] {
    const groupMatch = sql.match(/GROUP BY\s+([\s\S]*?)(?:HAVING|ORDER BY|LIMIT|$)/i);
    if (!groupMatch) return [];

    return groupMatch[1]
      .split(',')
      .map(g => g.trim())
      .filter(g => g.length > 0);
  }

  private extractOrderBy(sql: string): OrderByClause[] {
    const orderMatch = sql.match(/ORDER BY\s+([\s\S]*?)(?:LIMIT|OFFSET|$)/i);
    if (!orderMatch) return [];

    return orderMatch[1].split(',').map(o => {
      const parts = o.trim().split(/\s+/);
      return {
        field: parts[0],
        direction: (parts[1]?.toUpperCase() || 'ASC') as 'ASC' | 'DESC'
      };
    });
  }

  private extractLimit(sql: string): number | undefined {
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    return limitMatch ? parseInt(limitMatch[1], 10) : undefined;
  }

  private extractOffset(sql: string): number | undefined {
    const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
    return offsetMatch ? parseInt(offsetMatch[1], 10) : undefined;
  }

  private extractParameters(sql: string): Map<string, unknown> {
    const params = new Map<string, unknown>();
    const paramPattern = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;

    let match;
    while ((match = paramPattern.exec(sql)) !== null) {
      params.set(match[1], undefined);
    }

    return params;
  }
}
