#!/usr/bin/env python3
"""
Test Failure Analysis Script
Analyze vitest output and categorize failures
"""

import re
import json
from collections import defaultdict
from pathlib import Path

def analyze_test_output(filepath):
    """Analyze test output file and categorize failures"""

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract summary
    summary_match = re.search(r'Test Files\s+(\d+)\s+passed.*?\((\d+)\)', content)
    tests_match = re.search(r'Tests\s+(\d+)\s+passed.*?\((\d+)\)', content)

    results = {
        'summary': {},
        'by_category': defaultdict(list),
        'by_file': defaultdict(lambda: {'passed': 0, 'failed': 0, 'failures': []}),
        'quick_wins': [],
        'recommendations': []
    }

    if summary_match:
        results['summary']['test_files_passed'] = int(summary_match.group(1))
        results['summary']['test_files_total'] = int(summary_match.group(2))

    if tests_match:
        results['summary']['tests_passed'] = int(tests_match.group(1))
        results['summary']['tests_total'] = int(tests_match.group(2))
        results['summary']['tests_failed'] = results['summary']['tests_total'] - results['summary']['tests_passed']
        results['summary']['pass_rate'] = (results['summary']['tests_passed'] / results['summary']['tests_total'] * 100) if results['summary']['tests_total'] > 0 else 0

    # Categorize failures
    timeout_failures = re.findall(r'×.*?Test timed out in (\d+)ms', content)
    unhandled_errors = re.findall(r'×.*?Unhandled error\. \((.*?)\)', content)
    assertion_failures = re.findall(r'×.*?expected (.*?) to (.*?)$', content, re.MULTILINE)
    variable_errors = re.findall(r'ReferenceError: (.*?) is not defined', content)

    results['by_category']['timeout'] = len(timeout_failures)
    results['by_category']['unhandled_error'] = len(unhandled_errors)
    results['by_category']['assertion'] = len(assertion_failures)
    results['by_category']['undefined_variable'] = len(variable_errors)

    # Find most failing files
    file_failures = re.findall(r'❯ (.*?\.test\.ts.*?) \((\d+) tests.*?(\d+) failed\)', content)
    for file_path, total, failed in file_failures:
        file_name = file_path.split('/')[-1]
        results['by_file'][file_name]['failed'] = int(failed)
        results['by_file'][file_name]['total'] = int(total)
        results['by_file'][file_name]['passed'] = int(total) - int(failed)

    # Generate recommendations
    if results['by_category']['timeout'] > 20:
        results['quick_wins'].append({
            'fix': 'Increase global timeout to 30s',
            'impact': f"+{min(results['by_category']['timeout'], 30)} tests",
            'priority': 1
        })

    if results['by_category']['unhandled_error'] > 10:
        results['quick_wins'].append({
            'fix': 'Add error handlers in test setup',
            'impact': f"+{results['by_category']['unhandled_error']} tests",
            'priority': 2
        })

    # Top failing files
    sorted_files = sorted(results['by_file'].items(), key=lambda x: x[1]['failed'], reverse=True)
    for file_name, stats in sorted_files[:5]:
        if stats['failed'] > 5:
            results['recommendations'].append({
                'file': file_name,
                'failed': stats['failed'],
                'action': 'Priority fix - multiple failures'
            })

    return results

def generate_report(results):
    """Generate markdown report"""

    report = []
    report.append("# TEST IMPROVEMENT ANALYSIS")
    report.append("")
    report.append("## Summary")
    report.append("")

    if 'summary' in results and results['summary']:
        s = results['summary']
        report.append(f"- **Total Tests**: {s.get('tests_total', 'N/A')}")
        report.append(f"- **Passed**: {s.get('tests_passed', 'N/A')} ({s.get('pass_rate', 0):.1f}%)")
        report.append(f"- **Failed**: {s.get('tests_failed', 'N/A')}")
        report.append(f"- **Target**: 90%+ ({int(s.get('tests_total', 0) * 0.9)} tests)")
        report.append(f"- **Gap**: Need to fix ~{s.get('tests_failed', 0) - int(s.get('tests_total', 0) * 0.1)} tests")

    report.append("")
    report.append("## Failure Categories")
    report.append("")

    for category, count in sorted(results['by_category'].items(), key=lambda x: x[1], reverse=True):
        if count > 0:
            report.append(f"- **{category.replace('_', ' ').title()}**: {count} tests")

    report.append("")
    report.append("## Quick Wins")
    report.append("")

    for win in results.get('quick_wins', []):
        report.append(f"### {win['fix']}")
        report.append(f"- **Impact**: {win['impact']}")
        report.append(f"- **Priority**: P{win['priority']}")
        report.append("")

    report.append("## Top Failing Files")
    report.append("")

    sorted_files = sorted(results['by_file'].items(), key=lambda x: x[1]['failed'], reverse=True)
    for file_name, stats in sorted_files[:10]:
        if stats['failed'] > 0:
            pass_rate = (stats['passed'] / stats['total'] * 100) if stats['total'] > 0 else 0
            report.append(f"### {file_name}")
            report.append(f"- Failed: {stats['failed']}/{stats['total']} ({100-pass_rate:.1f}% failure rate)")
            report.append("")

    report.append("## Recommendations")
    report.append("")

    for rec in results.get('recommendations', []):
        report.append(f"- **{rec['file']}**: {rec['action']} ({rec['failed']} failures)")

    return "\n".join(report)

if __name__ == '__main__':
    import sys

    input_file = sys.argv[1] if len(sys.argv) > 1 else 'test_output_initial.txt'

    if not Path(input_file).exists():
        print(f"Error: {input_file} not found")
        sys.exit(1)

    results = analyze_test_output(input_file)
    report = generate_report(results)

    print(report)

    # Save to file
    with open('TEST_ANALYSIS_REPORT.md', 'w') as f:
        f.write(report)

    print("\n\nReport saved to TEST_ANALYSIS_REPORT.md")
