/**
 * Expression Parser
 * Parses {{ expression }} syntax into AST
 * PROJET SAUVÉ - Phase 5.1: Variables & Expressions System
 */

import { logger } from '../services/SimpleLogger';
import type { FoundExpression, ASTNode } from '../types/expressions';

export class ExpressionParser {
  private static readonly EXPRESSION_REGEX = /\{\{([^}]+)\}\}/g;

  /**
   * Find all {{ }} expressions in input string
   */
  findExpressions(input: string): FoundExpression[] {
    const expressions: FoundExpression[] = [];
    const regex = new RegExp(ExpressionParser.EXPRESSION_REGEX);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(input)) !== null) {
      expressions.push({
        fullMatch: match[0],
        expression: match[1].trim(),
        start: match.index,
        end: match.index + match[0].length
      });
    }

    return expressions;
  }

  /**
   * Parse expression into AST
   * Supports JavaScript-like syntax
   */
  parse(expression: string): ASTNode {
    try {
      const trimmed = expression.trim();

      if (!trimmed) {
        throw new Error('Empty expression');
      }

      const tokens = this.tokenize(trimmed);
      const ast = this.parseExpression(tokens, 0).node;

      return ast;

    } catch (error) {
      logger.error(`Failed to parse expression: ${expression}`, error);
      throw error;
    }
  }

  /**
   * Tokenize expression string
   */
  private tokenize(expression: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < expression.length) {
      const char = expression[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Numbers
      if (/\d/.test(char)) {
        let num = '';
        while (i < expression.length && /[\d.]/.test(expression[i])) {
          num += expression[i++];
        }
        tokens.push({ type: 'number', value: parseFloat(num) });
        continue;
      }

      // Strings
      if (char === '"' || char === "'") {
        const quote = char;
        let str = '';
        i++; // skip opening quote
        while (i < expression.length && expression[i] !== quote) {
          if (expression[i] === '\\' && i + 1 < expression.length) {
            i++; // skip escape
            str += expression[i++];
          } else {
            str += expression[i++];
          }
        }
        i++; // skip closing quote
        tokens.push({ type: 'string', value: str });
        continue;
      }

      // Identifiers and keywords
      if (/[a-zA-Z_$]/.test(char)) {
        let id = '';
        while (i < expression.length && /[a-zA-Z0-9_$]/.test(expression[i])) {
          id += expression[i++];
        }

        // Check for keywords
        if (id === 'true') {
          tokens.push({ type: 'boolean', value: true });
        } else if (id === 'false') {
          tokens.push({ type: 'boolean', value: false });
        } else if (id === 'null') {
          tokens.push({ type: 'null', value: null });
        } else if (id === 'undefined') {
          tokens.push({ type: 'undefined', value: undefined });
        } else {
          tokens.push({ type: 'identifier', value: id });
        }
        continue;
      }

      // Operators
      if ('+-*/%<>=!&|'.includes(char)) {
        let op = char;
        i++;

        // Two-character operators
        if (i < expression.length) {
          const next = expression[i];
          if (
            (char === '=' && next === '=') ||
            (char === '!' && next === '=') ||
            (char === '<' && next === '=') ||
            (char === '>' && next === '=') ||
            (char === '&' && next === '&') ||
            (char === '|' && next === '|') ||
            (char === '=' && next === '>')
          ) {
            op += next;
            i++;

            // Three-character operators
            if (op === '==' && i < expression.length && expression[i] === '=') {
              op += '=';
              i++;
            } else if (op === '!=' && i < expression.length && expression[i] === '=') {
              op += '=';
              i++;
            }
          }
        }

        tokens.push({ type: 'operator', value: op });
        continue;
      }

      // Punctuation
      if ('()[]{},.?:'.includes(char)) {
        tokens.push({ type: 'punctuation', value: char });
        i++;
        continue;
      }

      throw new Error(`Unexpected character: ${char}`);
    }

    return tokens;
  }

  /**
   * Parse expression from tokens
   */
  private parseExpression(tokens: Token[], start: number): { node: ASTNode; end: number } {
    return this.parseConditional(tokens, start);
  }

  /**
   * Parse conditional (ternary) expression
   */
  private parseConditional(tokens: Token[], start: number): { node: ASTNode; end: number } {
    const { node: test, end: end1 } = this.parseLogicalOr(tokens, start);

    if (end1 < tokens.length && tokens[end1].type === 'punctuation' && tokens[end1].value === '?') {
      const { node: consequent, end: end2 } = this.parseExpression(tokens, end1 + 1);

      if (end2 >= tokens.length || tokens[end2].type !== 'punctuation' || tokens[end2].value !== ':') {
        throw new Error('Expected : in conditional expression');
      }

      const { node: alternate, end: end3 } = this.parseExpression(tokens, end2 + 1);

      return {
        node: {
          type: 'ConditionalExpression',
          test,
          consequent,
          alternate
        },
        end: end3
      };
    }

    return { node: test, end: end1 };
  }

  /**
   * Parse logical OR (||)
   */
  private parseLogicalOr(tokens: Token[], start: number): { node: ASTNode; end: number } {
    let { node: left, end } = this.parseLogicalAnd(tokens, start);

    while (end < tokens.length && tokens[end].type === 'operator' && tokens[end].value === '||') {
      const { node: right, end: newEnd } = this.parseLogicalAnd(tokens, end + 1);
      left = {
        type: 'BinaryExpression',
        operator: '||',
        left,
        right
      };
      end = newEnd;
    }

    return { node: left, end };
  }

  /**
   * Parse logical AND (&&)
   */
  private parseLogicalAnd(tokens: Token[], start: number): { node: ASTNode; end: number } {
    let { node: left, end } = this.parseComparison(tokens, start);

    while (end < tokens.length && tokens[end].type === 'operator' && tokens[end].value === '&&') {
      const { node: right, end: newEnd } = this.parseComparison(tokens, end + 1);
      left = {
        type: 'BinaryExpression',
        operator: '&&',
        left,
        right
      };
      end = newEnd;
    }

    return { node: left, end };
  }

  /**
   * Parse comparison operators
   */
  private parseComparison(tokens: Token[], start: number): { node: ASTNode; end: number } {
    let { node: left, end } = this.parseAdditive(tokens, start);

    const comparisonOps = ['==', '===', '!=', '!==', '<', '<=', '>', '>=', 'in'];

    while (end < tokens.length && tokens[end].type === 'operator' && comparisonOps.includes(tokens[end].value as string)) {
      const operator = tokens[end].value as string;
      const { node: right, end: newEnd } = this.parseAdditive(tokens, end + 1);
      left = {
        type: 'BinaryExpression',
        operator,
        left,
        right
      };
      end = newEnd;
    }

    return { node: left, end };
  }

  /**
   * Parse additive operators (+, -)
   */
  private parseAdditive(tokens: Token[], start: number): { node: ASTNode; end: number } {
    let { node: left, end } = this.parseMultiplicative(tokens, start);

    while (end < tokens.length && tokens[end].type === 'operator' && ['+', '-'].includes(tokens[end].value as string)) {
      const operator = tokens[end].value as string;
      const { node: right, end: newEnd } = this.parseMultiplicative(tokens, end + 1);
      left = {
        type: 'BinaryExpression',
        operator,
        left,
        right
      };
      end = newEnd;
    }

    return { node: left, end };
  }

  /**
   * Parse multiplicative operators (*, /, %)
   */
  private parseMultiplicative(tokens: Token[], start: number): { node: ASTNode; end: number } {
    let { node: left, end } = this.parseUnary(tokens, start);

    while (end < tokens.length && tokens[end].type === 'operator' && ['*', '/', '%'].includes(tokens[end].value as string)) {
      const operator = tokens[end].value as string;
      const { node: right, end: newEnd } = this.parseUnary(tokens, end + 1);
      left = {
        type: 'BinaryExpression',
        operator,
        left,
        right
      };
      end = newEnd;
    }

    return { node: left, end };
  }

  /**
   * Parse unary operators (!, -, +, typeof)
   */
  private parseUnary(tokens: Token[], start: number): { node: ASTNode; end: number } {
    if (start >= tokens.length) {
      throw new Error('Unexpected end of expression');
    }

    if (tokens[start].type === 'operator' && ['!', '-', '+'].includes(tokens[start].value as string)) {
      const operator = tokens[start].value as string;
      const { node: argument, end } = this.parseUnary(tokens, start + 1);
      return {
        node: {
          type: 'UnaryExpression',
          operator,
          argument,
          prefix: true
        },
        end
      };
    }

    if (tokens[start].type === 'identifier' && tokens[start].value === 'typeof') {
      const { node: argument, end } = this.parseUnary(tokens, start + 1);
      return {
        node: {
          type: 'UnaryExpression',
          operator: 'typeof',
          argument,
          prefix: true
        },
        end
      };
    }

    return this.parsePostfix(tokens, start);
  }

  /**
   * Parse postfix expressions (member access, function calls)
   */
  private parsePostfix(tokens: Token[], start: number): { node: ASTNode; end: number } {
    let { node, end } = this.parsePrimary(tokens, start);

    while (end < tokens.length) {
      const token = tokens[end];

      // Member access: obj.prop
      if (token.type === 'punctuation' && token.value === '.') {
        if (end + 1 >= tokens.length || tokens[end + 1].type !== 'identifier') {
          throw new Error('Expected property name after .');
        }
        node = {
          type: 'MemberExpression',
          object: node,
          property: { type: 'Identifier', name: tokens[end + 1].value as string },
          computed: false
        };
        end += 2;
        continue;
      }

      // Computed member access: obj[expr]
      if (token.type === 'punctuation' && token.value === '[') {
        const { node: property, end: newEnd } = this.parseExpression(tokens, end + 1);
        if (newEnd >= tokens.length || tokens[newEnd].type !== 'punctuation' || tokens[newEnd].value !== ']') {
          throw new Error('Expected ] after computed member expression');
        }
        node = {
          type: 'MemberExpression',
          object: node,
          property,
          computed: true
        };
        end = newEnd + 1;
        continue;
      }

      // Function call: func(args)
      if (token.type === 'punctuation' && token.value === '(') {
        const args: ASTNode[] = [];
        let i = end + 1;

        // Parse arguments
        while (i < tokens.length && tokens[i].value !== ')') {
          const { node: arg, end: newEnd } = this.parseExpression(tokens, i);
          args.push(arg);
          i = newEnd;

          if (i < tokens.length && tokens[i].type === 'punctuation' && tokens[i].value === ',') {
            i++;
          }
        }

        if (i >= tokens.length || tokens[i].value !== ')') {
          throw new Error('Expected ) after function arguments');
        }

        node = {
          type: 'CallExpression',
          callee: node,
          arguments: args
        };
        end = i + 1;
        continue;
      }

      break;
    }

    return { node, end };
  }

  /**
   * Parse primary expressions (literals, identifiers, grouped expressions)
   */
  private parsePrimary(tokens: Token[], start: number): { node: ASTNode; end: number } {
    if (start >= tokens.length) {
      throw new Error('Unexpected end of expression');
    }

    const token = tokens[start];

    // Literals
    if (token.type === 'number' || token.type === 'string' || token.type === 'boolean' || token.type === 'null') {
      return {
        node: { type: 'Literal', value: token.value },
        end: start + 1
      };
    }

    // Identifier
    if (token.type === 'identifier') {
      return {
        node: { type: 'Identifier', name: token.value as string },
        end: start + 1
      };
    }

    // Grouped expression: (expr)
    if (token.type === 'punctuation' && token.value === '(') {
      const { node, end } = this.parseExpression(tokens, start + 1);
      if (end >= tokens.length || tokens[end].type !== 'punctuation' || tokens[end].value !== ')') {
        throw new Error('Expected ) after grouped expression');
      }
      return { node, end: end + 1 };
    }

    // Array literal: [1, 2, 3]
    if (token.type === 'punctuation' && token.value === '[') {
      const elements: ASTNode[] = [];
      let i = start + 1;

      while (i < tokens.length && tokens[i].value !== ']') {
        const { node: element, end: newEnd } = this.parseExpression(tokens, i);
        elements.push(element);
        i = newEnd;

        if (i < tokens.length && tokens[i].type === 'punctuation' && tokens[i].value === ',') {
          i++;
        }
      }

      if (i >= tokens.length || tokens[i].value !== ']') {
        throw new Error('Expected ] after array literal');
      }

      return {
        node: { type: 'ArrayExpression', elements },
        end: i + 1
      };
    }

    // Object literal: {key: value}
    if (token.type === 'punctuation' && token.value === '{') {
      const properties: any[] = [];
      let i = start + 1;

      while (i < tokens.length && tokens[i].value !== '}') {
        // Parse key
        if (tokens[i].type !== 'identifier' && tokens[i].type !== 'string') {
          throw new Error('Expected property name');
        }
        const key = {
          type: 'Identifier',
          name: tokens[i].type === 'identifier' ? tokens[i].value : tokens[i].value
        };
        i++;

        // Expect :
        if (i >= tokens.length || tokens[i].type !== 'punctuation' || tokens[i].value !== ':') {
          throw new Error('Expected : after property name');
        }
        i++;

        // Parse value
        const { node: value, end: newEnd } = this.parseExpression(tokens, i);
        properties.push({ type: 'Property', key, value });
        i = newEnd;

        if (i < tokens.length && tokens[i].type === 'punctuation' && tokens[i].value === ',') {
          i++;
        }
      }

      if (i >= tokens.length || tokens[i].value !== '}') {
        throw new Error('Expected } after object literal');
      }

      return {
        node: { type: 'ObjectExpression', properties },
        end: i + 1
      };
    }

    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }
}

interface Token {
  type: 'number' | 'string' | 'boolean' | 'null' | 'undefined' | 'identifier' | 'operator' | 'punctuation';
  value: any;
}
