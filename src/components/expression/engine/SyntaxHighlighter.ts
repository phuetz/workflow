/**
 * Syntax Highlighter
 * Provides syntax highlighting for expressions
 */

import type { SyntaxToken } from '../types';
import { ExpressionParser } from './ExpressionParser';

export class SyntaxHighlighter {
  private parser: ExpressionParser;

  constructor() {
    this.parser = new ExpressionParser();
  }

  tokenize(expression: string): SyntaxToken[] {
    return this.parser.tokenize(expression);
  }

  toHTML(tokens: SyntaxToken[], theme: string): string {
    const colors = this.getThemeColors(theme);
    let html = '<pre class="expression-editor">';

    for (const token of tokens) {
      const color = colors[token.type] || colors.default;
      html += `<span style="color: ${color}">${this.escapeHtml(token.value)}</span>`;
    }

    html += '</pre>';
    return html;
  }

  private getThemeColors(theme: string): Record<string, string> {
    if (theme === 'dark') {
      return {
        keyword: '#c678dd',
        identifier: '#e06c75',
        string: '#98c379',
        number: '#d19a66',
        boolean: '#56b6c2',
        operator: '#abb2bf',
        punctuation: '#abb2bf',
        comment: '#5c6370',
        variable: '#e5c07b',
        function: '#61afef',
        property: '#e06c75',
        default: '#abb2bf'
      };
    }

    // Light theme
    return {
      keyword: '#a626a4',
      identifier: '#e45649',
      string: '#50a14f',
      number: '#986801',
      boolean: '#0184bc',
      operator: '#383a42',
      punctuation: '#383a42',
      comment: '#a0a1a7',
      variable: '#c18401',
      function: '#4078f2',
      property: '#e45649',
      default: '#383a42'
    };
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
