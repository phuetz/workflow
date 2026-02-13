/**
 * Mutation Operators
 * Defines different types of mutations for mutation testing
 */

export interface Mutation {
  id: string;
  type: MutationType;
  original: string;
  mutated: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  operator: string;
  description: string;
}

export type MutationType =
  | 'arithmetic'
  | 'logical'
  | 'relational'
  | 'assignment'
  | 'unary'
  | 'conditional'
  | 'return'
  | 'literal'
  | 'array'
  | 'object';

export interface MutationOperator {
  name: string;
  type: MutationType;
  apply: (code: string) => Mutation[];
  description: string;
}

export class MutationOperators {
  /**
   * Get all mutation operators
   */
  static getAllOperators(): MutationOperator[] {
    return [
      ...this.getArithmeticOperators(),
      ...this.getLogicalOperators(),
      ...this.getRelationalOperators(),
      ...this.getAssignmentOperators(),
      ...this.getUnaryOperators(),
      ...this.getConditionalOperators(),
      ...this.getReturnOperators(),
      ...this.getLiteralOperators(),
      ...this.getArrayOperators(),
      ...this.getObjectOperators(),
    ];
  }

  /**
   * Arithmetic mutation operators
   */
  static getArithmeticOperators(): MutationOperator[] {
    return [
      {
        name: 'ArithmeticOperatorReplacement',
        type: 'arithmetic',
        description: 'Replace arithmetic operators (+, -, *, /, %)',
        apply: (code: string) => {
          const mutations: Mutation[] = [];
          const operators = [
            { from: '+', to: '-', desc: 'Replace + with -' },
            { from: '-', to: '+', desc: 'Replace - with +' },
            { from: '*', to: '/', desc: 'Replace * with /' },
            { from: '/', to: '*', desc: 'Replace / with *' },
            { from: '%', to: '*', desc: 'Replace % with *' },
            { from: '+', to: '*', desc: 'Replace + with *' },
            { from: '-', to: '*', desc: 'Replace - with *' },
          ];

          operators.forEach((op) => {
            const regex = new RegExp(`\\${op.from}(?!=)`, 'g');
            let match;
            while ((match = regex.exec(code)) !== null) {
              mutations.push({
                id: `arith_${mutations.length}`,
                type: 'arithmetic',
                original: op.from,
                mutated: op.to,
                location: {
                  file: 'unknown',
                  line: this.getLineNumber(code, match.index),
                  column: match.index,
                },
                operator: 'ArithmeticOperatorReplacement',
                description: op.desc,
              });
            }
          });

          return mutations;
        },
      },
    ];
  }

  /**
   * Logical mutation operators
   */
  static getLogicalOperators(): MutationOperator[] {
    return [
      {
        name: 'LogicalOperatorReplacement',
        type: 'logical',
        description: 'Replace logical operators (&&, ||, !)',
        apply: (code: string) => {
          const mutations: Mutation[] = [];
          const operators = [
            { from: '&&', to: '||', desc: 'Replace && with ||' },
            { from: '||', to: '&&', desc: 'Replace || with &&' },
          ];

          operators.forEach((op) => {
            const regex = new RegExp(op.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            let match;
            while ((match = regex.exec(code)) !== null) {
              mutations.push({
                id: `logic_${mutations.length}`,
                type: 'logical',
                original: op.from,
                mutated: op.to,
                location: {
                  file: 'unknown',
                  line: this.getLineNumber(code, match.index),
                  column: match.index,
                },
                operator: 'LogicalOperatorReplacement',
                description: op.desc,
              });
            }
          });

          return mutations;
        },
      },
      {
        name: 'NegationOperator',
        type: 'logical',
        description: 'Add or remove negation operator (!)',
        apply: (code: string) => {
          const mutations: Mutation[] = [];

          // Find boolean expressions to negate
          const booleanPatterns = [
            /if\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)/g,
            /while\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)/g,
          ];

          booleanPatterns.forEach((pattern) => {
            let match;
            while ((match = pattern.exec(code)) !== null) {
              mutations.push({
                id: `negate_${mutations.length}`,
                type: 'logical',
                original: match[1],
                mutated: `!${match[1]}`,
                location: {
                  file: 'unknown',
                  line: this.getLineNumber(code, match.index),
                  column: match.index,
                },
                operator: 'NegationOperator',
                description: 'Negate boolean expression',
              });
            }
          });

          return mutations;
        },
      },
    ];
  }

  /**
   * Relational mutation operators
   */
  static getRelationalOperators(): MutationOperator[] {
    return [
      {
        name: 'RelationalOperatorReplacement',
        type: 'relational',
        description: 'Replace relational operators (<, >, <=, >=, ==, !=)',
        apply: (code: string) => {
          const mutations: Mutation[] = [];
          const operators = [
            { from: '<', to: '<=', desc: 'Replace < with <=' },
            { from: '>', to: '>=', desc: 'Replace > with >=' },
            { from: '<=', to: '<', desc: 'Replace <= with <' },
            { from: '>=', to: '>', desc: 'Replace >= with >' },
            { from: '===', to: '!==', desc: 'Replace === with !==' },
            { from: '!==', to: '===', desc: 'Replace !== with ===' },
            { from: '==', to: '!=', desc: 'Replace == with !=' },
            { from: '!=', to: '==', desc: 'Replace != with ==' },
            { from: '<', to: '>', desc: 'Replace < with >' },
            { from: '>', to: '<', desc: 'Replace > with <' },
          ];

          operators.forEach((op) => {
            const escaped = op.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'g');
            let match;
            while ((match = regex.exec(code)) !== null) {
              mutations.push({
                id: `rel_${mutations.length}`,
                type: 'relational',
                original: op.from,
                mutated: op.to,
                location: {
                  file: 'unknown',
                  line: this.getLineNumber(code, match.index),
                  column: match.index,
                },
                operator: 'RelationalOperatorReplacement',
                description: op.desc,
              });
            }
          });

          return mutations;
        },
      },
    ];
  }

  /**
   * Assignment mutation operators
   */
  static getAssignmentOperators(): MutationOperator[] {
    return [
      {
        name: 'AssignmentOperatorReplacement',
        type: 'assignment',
        description: 'Replace assignment operators (+=, -=, *=, /=)',
        apply: (code: string) => {
          const mutations: Mutation[] = [];
          const operators = [
            { from: '+=', to: '-=', desc: 'Replace += with -=' },
            { from: '-=', to: '+=', desc: 'Replace -= with +=' },
            { from: '*=', to: '/=', desc: 'Replace *= with /=' },
            { from: '/=', to: '*=', desc: 'Replace /= with *=' },
          ];

          operators.forEach((op) => {
            const regex = new RegExp(op.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            let match;
            while ((match = regex.exec(code)) !== null) {
              mutations.push({
                id: `assign_${mutations.length}`,
                type: 'assignment',
                original: op.from,
                mutated: op.to,
                location: {
                  file: 'unknown',
                  line: this.getLineNumber(code, match.index),
                  column: match.index,
                },
                operator: 'AssignmentOperatorReplacement',
                description: op.desc,
              });
            }
          });

          return mutations;
        },
      },
    ];
  }

  /**
   * Unary mutation operators
   */
  static getUnaryOperators(): MutationOperator[] {
    return [
      {
        name: 'UnaryOperatorReplacement',
        type: 'unary',
        description: 'Replace unary operators (++, --)',
        apply: (code: string) => {
          const mutations: Mutation[] = [];
          const operators = [
            { from: '++', to: '--', desc: 'Replace ++ with --' },
            { from: '--', to: '++', desc: 'Replace -- with ++' },
          ];

          operators.forEach((op) => {
            const regex = new RegExp(op.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            let match;
            while ((match = regex.exec(code)) !== null) {
              mutations.push({
                id: `unary_${mutations.length}`,
                type: 'unary',
                original: op.from,
                mutated: op.to,
                location: {
                  file: 'unknown',
                  line: this.getLineNumber(code, match.index),
                  column: match.index,
                },
                operator: 'UnaryOperatorReplacement',
                description: op.desc,
              });
            }
          });

          return mutations;
        },
      },
    ];
  }

  /**
   * Conditional mutation operators
   */
  static getConditionalOperators(): MutationOperator[] {
    return [
      {
        name: 'ConditionalBoundaryMutation',
        type: 'conditional',
        description: 'Mutate conditional boundaries',
        apply: (code: string) => {
          const mutations: Mutation[] = [];

          // Replace true with false and vice versa
          const truePattern = /\btrue\b/g;
          let match;
          while ((match = truePattern.exec(code)) !== null) {
            mutations.push({
              id: `cond_${mutations.length}`,
              type: 'conditional',
              original: 'true',
              mutated: 'false',
              location: {
                file: 'unknown',
                line: this.getLineNumber(code, match.index),
                column: match.index,
              },
              operator: 'ConditionalBoundaryMutation',
              description: 'Replace true with false',
            });
          }

          const falsePattern = /\bfalse\b/g;
          while ((match = falsePattern.exec(code)) !== null) {
            mutations.push({
              id: `cond_${mutations.length}`,
              type: 'conditional',
              original: 'false',
              mutated: 'true',
              location: {
                file: 'unknown',
                line: this.getLineNumber(code, match.index),
                column: match.index,
              },
              operator: 'ConditionalBoundaryMutation',
              description: 'Replace false with true',
            });
          }

          return mutations;
        },
      },
    ];
  }

  /**
   * Return statement mutation operators
   */
  static getReturnOperators(): MutationOperator[] {
    return [
      {
        name: 'ReturnValueMutation',
        type: 'return',
        description: 'Mutate return values',
        apply: (code: string) => {
          const mutations: Mutation[] = [];

          // Find return statements
          const returnPattern = /return\s+([^;]+);/g;
          let match;
          while ((match = returnPattern.exec(code)) !== null) {
            const value = match[1].trim();

            // Skip complex expressions
            if (value.length > 30) continue;

            mutations.push({
              id: `return_${mutations.length}`,
              type: 'return',
              original: value,
              mutated: this.getMutatedReturnValue(value),
              location: {
                file: 'unknown',
                line: this.getLineNumber(code, match.index),
                column: match.index,
              },
              operator: 'ReturnValueMutation',
              description: `Mutate return value: ${value}`,
            });
          }

          return mutations;
        },
      },
    ];
  }

  /**
   * Literal mutation operators
   */
  static getLiteralOperators(): MutationOperator[] {
    return [
      {
        name: 'NumberLiteralMutation',
        type: 'literal',
        description: 'Mutate number literals',
        apply: (code: string) => {
          const mutations: Mutation[] = [];

          // Find number literals
          const numberPattern = /\b(\d+)\b/g;
          let match;
          while ((match = numberPattern.exec(code)) !== null) {
            const num = parseInt(match[1], 10);

            mutations.push({
              id: `num_${mutations.length}`,
              type: 'literal',
              original: match[1],
              mutated: (num + 1).toString(),
              location: {
                file: 'unknown',
                line: this.getLineNumber(code, match.index),
                column: match.index,
              },
              operator: 'NumberLiteralMutation',
              description: `Increment ${match[1]} to ${num + 1}`,
            });

            if (num > 0) {
              mutations.push({
                id: `num_${mutations.length}`,
                type: 'literal',
                original: match[1],
                mutated: (num - 1).toString(),
                location: {
                  file: 'unknown',
                  line: this.getLineNumber(code, match.index),
                  column: match.index,
                },
                operator: 'NumberLiteralMutation',
                description: `Decrement ${match[1]} to ${num - 1}`,
              });
            }
          }

          return mutations;
        },
      },
      {
        name: 'StringLiteralMutation',
        type: 'literal',
        description: 'Mutate string literals',
        apply: (code: string) => {
          const mutations: Mutation[] = [];

          // Find string literals
          const stringPattern = /(['"`])([^'"`]*)\1/g;
          let match;
          while ((match = stringPattern.exec(code)) !== null) {
            const str = match[2];

            if (str.length > 0) {
              mutations.push({
                id: `str_${mutations.length}`,
                type: 'literal',
                original: str,
                mutated: '',
                location: {
                  file: 'unknown',
                  line: this.getLineNumber(code, match.index),
                  column: match.index,
                },
                operator: 'StringLiteralMutation',
                description: `Replace "${str}" with empty string`,
              });
            }
          }

          return mutations;
        },
      },
    ];
  }

  /**
   * Array mutation operators
   */
  static getArrayOperators(): MutationOperator[] {
    return [
      {
        name: 'ArrayMethodMutation',
        type: 'array',
        description: 'Mutate array methods',
        apply: (code: string) => {
          const mutations: Mutation[] = [];

          const arrayMethods = [
            { from: 'push', to: 'pop', desc: 'Replace push with pop' },
            { from: 'pop', to: 'push', desc: 'Replace pop with push' },
            { from: 'shift', to: 'unshift', desc: 'Replace shift with unshift' },
            { from: 'unshift', to: 'shift', desc: 'Replace unshift with shift' },
            { from: 'filter', to: 'map', desc: 'Replace filter with map' },
            { from: 'map', to: 'filter', desc: 'Replace map with filter' },
          ];

          arrayMethods.forEach((method) => {
            const regex = new RegExp(`\\.${method.from}\\(`, 'g');
            let match;
            while ((match = regex.exec(code)) !== null) {
              mutations.push({
                id: `array_${mutations.length}`,
                type: 'array',
                original: method.from,
                mutated: method.to,
                location: {
                  file: 'unknown',
                  line: this.getLineNumber(code, match.index),
                  column: match.index,
                },
                operator: 'ArrayMethodMutation',
                description: method.desc,
              });
            }
          });

          return mutations;
        },
      },
    ];
  }

  /**
   * Object mutation operators
   */
  static getObjectOperators(): MutationOperator[] {
    return [
      {
        name: 'ObjectKeyMutation',
        type: 'object',
        description: 'Mutate object keys',
        apply: (code: string) => {
          const mutations: Mutation[] = [];

          // Find object property access
          const propPattern = /\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
          let match;
          while ((match = propPattern.exec(code)) !== null) {
            mutations.push({
              id: `obj_${mutations.length}`,
              type: 'object',
              original: match[1],
              mutated: `${match[1]}_mutated`,
              location: {
                file: 'unknown',
                line: this.getLineNumber(code, match.index),
                column: match.index,
              },
              operator: 'ObjectKeyMutation',
              description: `Mutate property key ${match[1]}`,
            });
          }

          return mutations;
        },
      },
    ];
  }

  /**
   * Get line number from position
   */
  private static getLineNumber(code: string, position: number): number {
    return code.substring(0, position).split('\n').length;
  }

  /**
   * Get mutated return value
   */
  private static getMutatedReturnValue(value: string): string {
    if (value === 'true') return 'false';
    if (value === 'false') return 'true';
    if (value === 'null') return 'undefined';
    if (value === 'undefined') return 'null';
    if (value === '0') return '1';
    if (value === '1') return '0';
    if (/^\d+$/.test(value)) return '0';
    if (/^['"`].*['"`]$/.test(value)) return '""';
    if (value === '[]') return 'null';
    if (value === '{}') return 'null';
    return 'null';
  }
}

export default MutationOperators;
