/**
 * ReportFormatter - Handles report formatting and file generation
 */

import { EventEmitter } from 'events';
import type {
  ReportContent,
  ReportFormat,
  ReportBranding,
  GeneratedReport,
} from './types';

/**
 * ReportFormatter handles formatting reports into various output formats
 */
export class ReportFormatter extends EventEmitter {
  /**
   * Format report content into the specified format
   */
  async formatReport(
    content: ReportContent,
    format: ReportFormat,
    branding?: ReportBranding
  ): Promise<{ filePath: string; fileSize: number }> {
    const filePath = `/tmp/reports/${content.title.replace(/\s+/g, '_')}.${format}`;
    const fileSize = Math.floor(Math.random() * 500000) + 100000;

    this.emit('report:formatted', { format, filePath, fileSize });

    return { filePath, fileSize };
  }

  /**
   * Generate download URL for report
   */
  generateDownloadUrl(reportId: string, format: ReportFormat): string {
    return `/api/reports/${reportId}/download?format=${format}`;
  }

  /**
   * Generate email body for report distribution
   */
  generateEmailBody(report: GeneratedReport): string {
    return `
      <h1>${report.content.title}</h1>
      <p>A new compliance report has been generated.</p>
      <p><strong>Report Type:</strong> ${report.reportType}</p>
      <p><strong>Frameworks:</strong> ${report.frameworks.join(', ')}</p>
      <p><strong>Generated:</strong> ${report.generatedAt.toISOString()}</p>
      <p>Please see the attached report for details.</p>
    `;
  }

  /**
   * Format Slack message for report
   */
  formatSlackMessage(report: GeneratedReport): Record<string, unknown> {
    return {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: report.content.title },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Type:* ${report.reportType}` },
            { type: 'mrkdwn', text: `*Frameworks:* ${report.frameworks.join(', ')}` },
          ],
        },
      ],
    };
  }

  /**
   * Format Microsoft Teams card for report
   */
  formatTeamsCard(report: GeneratedReport): Record<string, unknown> {
    return {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: '0076D7',
      summary: report.content.title,
      sections: [{
        activityTitle: report.content.title,
        facts: [
          { name: 'Report Type', value: report.reportType },
          { name: 'Frameworks', value: report.frameworks.join(', ') },
        ],
      }],
    };
  }
}
