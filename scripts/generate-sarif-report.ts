#!/usr/bin/env tsx

/**
 * SARIF Report Generator for Secret Scanning
 *
 * Converts secret scan results to SARIF format for GitHub Code Scanning
 * SARIF (Static Analysis Results Interchange Format) is a standard format
 * for static analysis tools output
 *
 * Usage: tsx scripts/generate-sarif-report.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface ScanMatch {
  file: string;
  line: number;
  column?: number;
  patternName: string;
  severity: string;
  confidence: string;
  category: string;
  match: string;
}

interface ScanReport {
  timestamp: string;
  scannedFiles: number;
  matchesFound: number;
  matches: ScanMatch[];
}

interface SARIFReport {
  version: string;
  $schema: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: Array<{
          id: string;
          name: string;
          shortDescription: { text: string };
          fullDescription: { text: string };
          defaultConfiguration: { level: string };
          properties: {
            tags: string[];
            precision: string;
          };
        }>;
      };
    };
    results: Array<{
      ruleId: string;
      level: string;
      message: { text: string };
      locations: Array<{
        physicalLocation: {
          artifactLocation: { uri: string };
          region: {
            startLine: number;
            startColumn?: number;
          };
        };
      }>;
    }>;
  }>;
}

function severityToSARIFLevel(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'error';
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'note';
    default:
      return 'warning';
  }
}

function confidenceToPrecision(confidence: string): string {
  switch (confidence) {
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
      return 'low';
    default:
      return 'medium';
  }
}

async function generateSARIF(): Promise<void> {
  try {
    // Read the scan report
    const reportPath = 'secret-scan-report.json';
    if (!fs.existsSync(reportPath)) {
      console.error('❌ No scan report found. Run ci-secret-scan.ts first.');
      process.exit(1);
    }

    const scanReport: ScanReport = JSON.parse(
      fs.readFileSync(reportPath, 'utf8')
    );

    console.log('📄 Converting scan results to SARIF format...\n');

    // Extract unique rules from matches
    const rulesMap = new Map<string, ScanMatch>();
    for (const match of scanReport.matches) {
      if (!rulesMap.has(match.patternName)) {
        rulesMap.set(match.patternName, match);
      }
    }

    // Build SARIF rules
    const rules = Array.from(rulesMap.values()).map(match => ({
      id: match.patternName.toLowerCase().replace(/\s+/g, '-'),
      name: match.patternName,
      shortDescription: {
        text: `${match.patternName} detected`
      },
      fullDescription: {
        text: `Potential ${match.patternName} found in source code. This could be a security vulnerability if it's a real credential.`
      },
      defaultConfiguration: {
        level: severityToSARIFLevel(match.severity)
      },
      properties: {
        tags: ['security', 'secrets', match.category.toLowerCase()],
        precision: confidenceToPrecision(match.confidence)
      }
    }));

    // Build SARIF results
    const results = scanReport.matches.map(match => ({
      ruleId: match.patternName.toLowerCase().replace(/\s+/g, '-'),
      level: severityToSARIFLevel(match.severity),
      message: {
        text: `${match.patternName} detected: ${match.match.substring(0, 50)}${match.match.length > 50 ? '...' : ''}`
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: match.file
            },
            region: {
              startLine: match.line,
              startColumn: match.column || 1
            }
          }
        }
      ]
    }));

    // Build complete SARIF report
    const sarifReport: SARIFReport = {
      version: '2.1.0',
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      runs: [
        {
          tool: {
            driver: {
              name: 'Workflow Platform Secret Scanner',
              version: '1.0.0',
              informationUri: 'https://github.com/yourusername/workflow-platform',
              rules
            }
          },
          results
        }
      ]
    };

    // Write SARIF report
    const sarifPath = 'secret-scan-results.sarif';
    fs.writeFileSync(sarifPath, JSON.stringify(sarifReport, null, 2));

    console.log(`✅ SARIF report generated: ${sarifPath}`);
    console.log(`   Rules: ${rules.length}`);
    console.log(`   Results: ${results.length}\n`);

    console.log('📤 To upload to GitHub Code Scanning:');
    console.log('   Use the github/codeql-action/upload-sarif action');
    console.log('   or manually upload via Security tab\n');

  } catch (error) {
    console.error('❌ Error generating SARIF report:', error);
    process.exit(1);
  }
}

generateSARIF();
