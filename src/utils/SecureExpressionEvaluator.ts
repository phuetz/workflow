/**
 * Secure Expression Evaluator
 * Safe alternative to eval() and new Function() for evaluating user expressions
 */

import { logger } from '../services/SimpleLogger';
// Removed unused imports: validateInput, ValidationResult

export interface EvaluationContext {
  variables?: Record<string, unknown>;
  functions?: Record<string, (...args: unknown[]) => unknown>;
  maxDepth?: number;
  timeout?: number;
}

interface Token {
  type: string;
  value: string;
}

interface ASTNode {
  type: string;
  [key: string]: unknown;
}

export interface EvaluationResult {
  success: boolean;
  value?: unknown;
  error?: string;
  executionTime?: number;
}

export class SecureExpressionEvaluator {
  private static readonly BLOCKED_KEYWORDS = [
    'eval',
    'Function',
    'constructor',
    'prototype',
    '__proto__',
    'require',
    'import',
    'process',
    'global',
    'window',
    'document',
    'fetch',
    'XMLHttpRequest',
    'setTimeout',
    'setInterval',
    'setImmediate'
  ];

  private static readonly ALLOWED_MATH_FUNCTIONS = [
    'abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos',
    'exp', 'floor', 'log', 'max', 'min', 'pow', 'random',
    'round', 'sin', 'sqrt', 'tan'
  ];

  private static readonly ALLOWED_STRING_METHODS = [
    'charAt', 'charCodeAt', 'concat', 'includes', 'indexOf',
    'lastIndexOf', 'length', 'match', 'padEnd', 'padStart',
    'repeat', 'replace', 'slice', 'split', 'startsWith',
    'substring', 'toLowerCase', 'toUpperCase', 'trim'
  ];

  private static readonly ALLOWED_ARRAY_METHODS = [
    'concat', 'every', 'filter', 'find', 'findIndex',
    'includes', 'indexOf', 'join', 'lastIndexOf', 'length',
    'map', 'reduce', 'reduceRight', 'reverse', 'slice',
    'some', 'sort'
  ];

  /**
   * Safely evaluate an expression
   */
  static evaluate(expression: string, context: EvaluationContext = {}): EvaluationResult {
    const validation = this.validateExpression(expression);
    try {
      // Validate expression
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Parse and evaluate
      const startTime = performance.now();
      const ast = this.parseExpression(expression);
      const value = this.evaluateAST(ast, context);
      const executionTime = performance.now() - startTime;

      // Check timeout
      if (context.timeout && executionTime > context.timeout) {
        return {
          success: false,
          error: `Execution timeout exceeded (${executionTime}ms > ${context.timeout}ms)`
        };
      }

      return {
        success: true,
        value,
        executionTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Expression evaluation failed', {
        expression,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Validate expression for security concerns
   */
  private static validateExpression(expression: string): { isValid: boolean; error?: string } {
    // Check for empty expression
    if (!expression || expression.trim().length === 0) {
      return { isValid: false, error: 'Empty expression' };
    }

    // Check length
    if (expression.length > 1000) {
      return { isValid: false, error: 'Expression too long (max 1000 characters)' };
    }

    // Check for blocked keywords
    const lowerExpr = expression.toLowerCase();
    for (const keyword of this.BLOCKED_KEYWORDS) {
      if (lowerExpr.includes(keyword.toLowerCase())) {
        return { 
          isValid: false, 
          error: `Blocked keyword detected: ${keyword}` 
        };
      }
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\bthis\b/,           // Prevent access to 'this'
      /\bnew\s+/,           // Prevent object construction
      /\.\s*constructor/,   // Prevent constructor access
      /__proto__/,          // Prevent prototype pollution
      /\[["']\w+["']\]/,    // Limit property access patterns
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(expression)) {
        return { 
          isValid: false, 
          error: `Suspicious pattern detected: ${pattern}` 
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Parse expression into AST with proper security checks
   */
  private static parseExpression(expression: string): ASTNode {
    try {
      return this.buildAST(this.tokenize(expression));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse expression: ${errorMessage}`);
    }
  }

  /**
   * Tokenize expression into secure tokens
   */
  private static tokenize(expression: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < expression.length) {
      const char = expression[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Numbers (including decimals)
      if (/\d/.test(char)) {
        let num = '';
        while (i < expression.length && /[\d.]/.test(expression[i])) {
          num += expression[i++];
        }
        tokens.push({ type: 'NUMBER', value: num });
        continue;
      }

      // String literals
      if (char === '"' || char === "'") {
        const quote = char;
        let str = '';
        i++; // Skip opening quote
        while (i < expression.length && expression[i] !== quote) {
          if (expression[i] === '\\' && i + 1 < expression.length) {
            i++; // Skip escape character
            const escaped = expression[i];
            switch (escaped) {
              case 'n': str += '\n'; break;
              case 't': str += '\t'; break;
              case 'r': str += '\r'; break;
              case '\\': str += '\\'; break;
              case quote: str += quote; break;
              default: str += escaped; break;
            }
          } else {
            str += expression[i];
          }
          i++;
        }
        if (i >= expression.length) {
          throw new Error('Unterminated string literal');
        }
        i++; // Skip closing quote
        tokens.push({ type: 'STRING', value: str });
        continue;
      }

      // Identifiers and keywords
      if (/[a-zA-Z_$]/.test(char)) {
        let ident = '';
        while (i < expression.length && /[a-zA-Z0-9_$]/.test(expression[i])) {
          ident += expression[i++];
        }

        // Check for keywords
        const type = ['true', 'false', 'null', 'undefined'].includes(ident) ? 'KEYWORD' : 'IDENTIFIER';
        tokens.push({ type, value: ident });
        continue;
      }

      // Operators and symbols
      if (i + 1 < expression.length) {
        const twoChar = expression.slice(i, i + 2);
        const twoCharOps = ['==', '!=', '<=', '>=', '&&', '||', '===', '!=='];
        if (twoCharOps.includes(twoChar)) {
          tokens.push({ type: 'OPERATOR', value: twoChar });
          i += 2;
          continue;
        }
      }

      // Single character operators and symbols
      const singleCharOps = ['+', '-', '*', '/', '%', '<', '>', '(', ')', '[', ']', ',', '.', '!'];
      if (singleCharOps.includes(char)) {
        tokens.push({ type: char === '(' || char === ')' || char === '[' || char === ']' ? 'SYMBOL' : 'OPERATOR', value: char });
        i++;
        continue;
      }
      
      throw new Error(`Unexpected character: ${char}`);
    }
    
    return tokens;
  }

  /**
   * Build AST from tokens with security validation
   */
  private static buildAST(tokens: Token[]): ASTNode {
    let position = 0;

    const parseExpression = (): ASTNode => {
      return parseLogicalOr();
    };

    const parseLogicalOr = (): ASTNode => {
      let left = parseLogicalAnd();
      while (position < tokens.length && tokens[position].value === '||') {
        position++; // consume '||'
        const right = parseLogicalAnd();
        left = { type: 'BinaryExpression', operator: '||', left, right };
      }
      return left;
    };

    const parseLogicalAnd = (): ASTNode => {
      let left = parseEquality();
      while (position < tokens.length && tokens[position].value === '&&') {
        position++; // consume '&&'
        const right = parseEquality();
        left = { type: 'BinaryExpression', operator: '&&', left, right };
      }
      return left;
    };

    const parseEquality = (): ASTNode => {
      let left = parseRelational();
      while (position < tokens.length) {
        const op = tokens[position].value;
        if (['==', '===', '!=', '!=='].includes(op)) {
          position++; // consume operator
          const right = parseRelational();
          left = { type: 'BinaryExpression', operator: op, left, right };
        } else {
          break;
        }
      }
      return left;
    };

    const parseRelational = (): ASTNode => {
      let left = parseAdditive();
      while (position < tokens.length) {
        const op = tokens[position].value;
        if (['<', '<=', '>', '>='].includes(op)) {
          position++; // consume operator
          const right = parseAdditive();
          left = { type: 'BinaryExpression', operator: op, left, right };
        } else {
          break;
        }
      }
      return left;
    };

    const parseAdditive = (): ASTNode => {
      let left = parseMultiplicative();
      while (position < tokens.length) {
        const op = tokens[position].value;
        if (['+', '-'].includes(op)) {
          position++; // consume operator
          const right = parseMultiplicative();
          left = { type: 'BinaryExpression', operator: op, left, right };
        } else {
          break;
        }
      }
      return left;
    };

    const parseMultiplicative = (): ASTNode => {
      let left = parsePrimary();
      while (position < tokens.length) {
        const op = tokens[position].value;
        if (['*', '/', '%'].includes(op)) {
          position++; // consume operator
          const right = parsePrimary();
          left = { type: 'BinaryExpression', operator: op, left, right };
        } else {
          break;
        }
      }
      return left;
    };

    const parsePrimary = (): ASTNode => {
      if (position >= tokens.length) {
        throw new Error('Unexpected end of expression');
      }

      const token = tokens[position];

      // Parentheses
      if (token.type === 'SYMBOL' && token.value === '(') {
        position++; // consume '('
        const expr = parseExpression();
        if (position >= tokens.length || tokens[position].value !== ')') {
          throw new Error('Missing closing parenthesis');
        }
        position++; // consume ')'
        return expr;
      }

      // Numbers
      if (token.type === 'NUMBER') {
        position++;
        return { type: 'Literal', value: parseFloat(token.value), raw: token.value };
      }

      // Strings
      if (token.type === 'STRING') {
        position++;
        return { type: 'Literal', value: token.value, raw: `"${token.value}"` };
      }

      // Keywords (true, false, null, undefined)
      if (token.type === 'KEYWORD') {
        position++;
        let value: unknown;
        switch (token.value) {
          case 'true': value = true; break;
          case 'false': value = false; break;
          case 'null': value = null; break;
          case 'undefined': value = undefined; break;
          default: throw new Error(`Unknown keyword: ${token.value}`);
        }
        return { type: 'Literal', value, raw: token.value };
      }

      // Identifiers (property access)
      if (token.type === 'IDENTIFIER') {
        position++;
        let node: ASTNode = { type: 'Identifier', name: token.value };

        // Handle property access (obj.prop)
        while (position < tokens.length && tokens[position].value === '.') {
          position++; // consume '.'
          if (position >= tokens.length || tokens[position].type !== 'IDENTIFIER') {
            throw new Error('Expected property name after "."');
          }
          const property = tokens[position].value;
          position++;
          node = { type: 'MemberExpression', object: node, property: { type: 'Identifier', name: property } };
        }

        return node;
      }

      throw new Error(`Unexpected token: ${token.value}`);
    };

    const ast = parseExpression();

    // Ensure all tokens were consumed
    if (position < tokens.length) {
      throw new Error(`Unexpected token: ${tokens[position].value}`);
    }

    return ast;
  }

  /**
   * Evaluate AST safely with proper traversal
   */
  private static evaluateAST(ast: ASTNode, context: EvaluationContext): unknown {
    const maxDepth = context.maxDepth || 100;
    const sandbox = this.createSandbox(context);

    const evaluate = (node: ASTNode, depth = 0): unknown => {
      // Prevent deep recursion attacks
      if (depth > maxDepth) {
        throw new Error('Maximum evaluation depth exceeded');
      }

      switch (node.type) {
        case 'Literal':
          return node.value;

        case 'Identifier':
          if (!Object.prototype.hasOwnProperty.call(sandbox, node.name as string)) {
            throw new Error(`Variable '${node.name}' is not defined or not allowed`);
          }
          return sandbox[node.name as string];

        case 'MemberExpression': {
          const obj = evaluate(node.object as ASTNode, depth + 1);
          if (obj == null) {
            return undefined;
          }

          if ((node.property as ASTNode).type !== 'Identifier') {
            throw new Error('Only simple property access is allowed');
          }

          const propName = (node.property as ASTNode).name as string;

          // Whitelist allowed properties based on object type
          if (typeof obj === 'string') {
            if (!this.ALLOWED_STRING_METHODS.includes(propName)) {
              throw new Error(`String method '${propName}' is not allowed`);
            }
            return (obj as unknown as Record<string, unknown>)[propName];
          }

          if (Array.isArray(obj)) {
            if (!this.ALLOWED_ARRAY_METHODS.includes(propName) && propName !== 'length') {
              throw new Error(`Array method '${propName}' is not allowed`);
            }
            return (obj as unknown as Record<string, unknown>)[propName];
          }

          // For plain objects, allow any property access
          if (obj && typeof obj === 'object' && obj.constructor === Object) {
            return (obj as Record<string, unknown>)[propName];
          }

          throw new Error(`Property access on ${typeof obj} is not allowed`);
        }

        case 'BinaryExpression': {
          const operator = node.operator as string;
          const left = evaluate(node.left as ASTNode, depth + 1);

          // Short-circuit evaluation for logical operators
          if (operator === '&&') {
            return left && evaluate(node.right as ASTNode, depth + 1);
          }
          if (operator === '||') {
            return left || evaluate(node.right as ASTNode, depth + 1);
          }

          const right = evaluate(node.right as ASTNode, depth + 1);

          switch (operator) {
            // Arithmetic
            case '+': return (left as number) + (right as number);
            case '-': return (left as number) - (right as number);
            case '*': return (left as number) * (right as number);
            case '/':
              if (right === 0) throw new Error('Division by zero');
              return (left as number) / (right as number);
            case '%': return (left as number) % (right as number);

            // Comparison
            case '<': return (left as number) < (right as number);
            case '<=': return (left as number) <= (right as number);
            case '>': return (left as number) > (right as number);
            case '>=': return (left as number) >= (right as number);
            case '==': return left == right;
            case '===': return left === right;
            case '!=': return left != right;
            case '!==': return left !== right;

            default:
              throw new Error(`Operator '${operator}' is not supported`);
          }
        }

        default:
          throw new Error(`AST node type '${(node as ASTNode).type}' is not supported`);
      }
    };

    return evaluate(ast);
  }

  /**
   * Create sandboxed environment
   */
  private static createSandbox(context: EvaluationContext): Record<string, unknown> {
    const sandbox: Record<string, unknown> = {
      // Math functions
      Math: Object.fromEntries(
        this.ALLOWED_MATH_FUNCTIONS.map(fn => [fn, (Math as unknown as Record<string, unknown>)[fn]])
      ),
      
      // Safe number operations
      parseInt: (val: unknown, radix?: number) => parseInt(String(val), radix),
      parseFloat: (val: unknown) => parseFloat(String(val)),
      isNaN: (val: unknown) => isNaN(Number(val)),
      isFinite: (val: unknown) => isFinite(Number(val)),
      
      // Safe string operations
      String: (val: unknown) => String(val),
      
      // Safe array operations
      Array: {
        isArray: Array.isArray,
        from: Array.from
      },
      
      // User-provided variables
      ...(context.variables || {}),
      
      // User-provided functions (validated)
      ...(this.validateFunctions(context.functions || {}))
    };

    // Freeze sandbox to prevent modifications
    return this.deepFreeze(sandbox);
  }








  /**
   * Validate user-provided functions
   */
  private static validateFunctions(functions: Record<string, (...args: unknown[]) => unknown>): Record<string, (...args: unknown[]) => unknown> {
    const validated: Record<string, (...args: unknown[]) => unknown> = {};
    
    for (const [name, fn] of Object.entries(functions)) {
      if (typeof fn !== 'function') continue;
      
      // Wrap function to prevent access to global scope
      validated[name] = (...args: unknown[]) => {
        try {
          return fn(...args);
        } catch (error) {
          logger.error(`User function '${name}' threw error`, { error });
          throw new Error(`Function '${name}' failed`);
        }
      };
    }
    
    return validated;
  }

  /**
   * Deep freeze object to prevent modifications
   */
  private static deepFreeze<T>(obj: T): T {
    Object.freeze(obj);

    if (obj !== null && typeof obj === 'object') {
      Object.getOwnPropertyNames(obj).forEach(prop => {
        const value = (obj as Record<string, unknown>)[prop];
        if (value !== null &&
            (typeof value === 'object' || typeof value === 'function') &&
            !Object.isFrozen(value)) {
          this.deepFreeze(value);
        }
      });
    }

    return obj;
  }
}

// Export convenience function
export function evaluateExpression(
  expression: string, 
  variables?: Record<string, unknown>,
  options?: Omit<EvaluationContext, 'variables'>
): EvaluationResult {
  return SecureExpressionEvaluator.evaluate(expression, {
    variables,
    ...options
  });
}

// Export type-safe evaluation functions
export const SafeMath = {
  evaluate: (expression: string): number | null => {
    const result = SecureExpressionEvaluator.evaluate(expression, {
      variables: { PI: Math.PI, E: Math.E }
    });
    return result.success ? (result.value as number) : null;
  }
};

export const SafeCondition = {
  evaluate: (condition: string, data: unknown): boolean => {
    const result = SecureExpressionEvaluator.evaluate(condition, {
      variables: { data }
    });
    return result.success ? !!result.value : false;
  }
};

export const SafeTransform = {
  evaluate: (expression: string, input: unknown, context?: EvaluationContext): unknown => {
    const result = SecureExpressionEvaluator.evaluate(expression, {
      variables: { input, context: context || {} }
    });
    return result.success ? result.value : null;
  }
};