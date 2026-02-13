#!/bin/bash

# Documentation Automation Tools
# Usage: ./scripts/documentation-tools.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Quick Wins - Execute all quick wins
quick_wins() {
    log_info "Executing Quick Wins (2 hours → +12 points)..."
    
    # 1. Copy existing files
    log_info "1/5: Copying existing documentation files..."
    if [ -f "docs/CONTRIBUTING.md" ]; then
        cp docs/CONTRIBUTING.md ./CONTRIBUTING.md
        log_success "Copied CONTRIBUTING.md"
    fi
    
    if [ -f "docs/QUICK_START.md" ]; then
        cp docs/QUICK_START.md ./QUICK_START.md
        log_success "Copied QUICK_START.md"
    fi
    
    if [ -f "docs/TESTING.md" ]; then
        mv docs/TESTING.md ./TESTING_GUIDE.md
        log_success "Moved TESTING.md to TESTING_GUIDE.md"
    fi
    
    # 2. Create LICENSE
    log_info "2/5: Creating LICENSE file..."
    if [ ! -f "LICENSE" ]; then
        cat > LICENSE << 'EOLIC'
MIT License

Copyright (c) 2025 WorkflowBuilder Pro

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOLIC
        log_success "Created LICENSE"
    else
        log_warning "LICENSE already exists"
    fi
    
    # 3. Create SECURITY.md
    log_info "3/5: Creating SECURITY.md..."
    if [ ! -f "SECURITY.md" ]; then
        cat > SECURITY.md << 'EOSEC'
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.1.x   | :white_check_mark: |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### 1. Do Not Publicly Disclose

Please do **not** create a public GitHub issue for security vulnerabilities.

### 2. Contact Us Securely

**Email**: security@workflowbuilder.com
**PGP Key**: [Available on request]

### 3. Provide Details

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### 4. Response Timeline

- **Initial Response**: Within 24 hours
- **Status Update**: Within 72 hours
- **Fix Timeline**: Depends on severity (1-30 days)

## Security Features

WorkflowBuilder Pro includes:
- **RBAC**: Role-based access control with granular permissions
- **Secrets Management**: Encrypted credential storage with rotation
- **Audit Trail**: Complete logging of all actions
- **Input Validation**: Strict validation on all inputs
- **Rate Limiting**: Protection against abuse
- **CSRF Protection**: Cross-site request forgery prevention
- **XSS Protection**: Cross-site scripting prevention
- **SQL Injection Protection**: Parameterized queries
- **Expression Security**: Sandboxed expression evaluation

## Security Best Practices

### For Administrators
1. Generate unique secrets for each environment
2. Rotate secrets every 90 days
3. Use strong passwords and enable MFA
4. Regularly review audit logs
5. Keep software up to date

### For Developers
1. Never commit `.env` files
2. Use environment variables for secrets
3. Follow the security guidelines in `docs/SECURITY_HARDENING.md`
4. Run security scans before deployment
5. Review dependencies for vulnerabilities

## Security Updates

Security updates are released as needed. Subscribe to security announcements:
- GitHub Security Advisories
- Security mailing list: security-announce@workflowbuilder.com

## Acknowledgments

We appreciate security researchers who responsibly disclose vulnerabilities. 
Contributors will be acknowledged in our security hall of fame (unless they prefer to remain anonymous).

---

Last Updated: 2025-10-23
EOSEC
        log_success "Created SECURITY.md"
    else
        log_warning "SECURITY.md already exists"
    fi
    
    # 4. Create GitHub templates
    log_info "4/5: Creating GitHub templates..."
    mkdir -p .github/ISSUE_TEMPLATE
    
    # Bug report template
    if [ ! -f ".github/ISSUE_TEMPLATE/bug_report.md" ]; then
        cat > .github/ISSUE_TEMPLATE/bug_report.md << 'EOBUG'
---
name: Bug Report
about: Report a bug to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description
A clear and concise description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Screenshots
If applicable, add screenshots.

## Environment
- OS: [e.g., Windows 10, macOS 12, Ubuntu 20.04]
- Browser: [e.g., Chrome 95, Firefox 93]
- Version: [e.g., 2.1.0]
- Node.js: [e.g., 18.x]

## Additional Context
Any other relevant information.

## Logs
```
Paste relevant logs here
```
EOBUG
        log_success "Created bug report template"
    fi
    
    # Feature request template
    if [ ! -f ".github/ISSUE_TEMPLATE/feature_request.md" ]; then
        cat > .github/ISSUE_TEMPLATE/feature_request.md << 'EOFEAT'
---
name: Feature Request
about: Suggest a new feature
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Feature Description
A clear description of the feature you'd like to see.

## Use Case
Explain the problem this feature would solve.

## Proposed Solution
How you envision this feature working.

## Alternatives Considered
Any alternative solutions you've thought about.

## Additional Context
Any other relevant information, mockups, or examples.
EOFEAT
        log_success "Created feature request template"
    fi
    
    # PR template
    if [ ! -f ".github/PULL_REQUEST_TEMPLATE.md" ]; then
        cat > .github/PULL_REQUEST_TEMPLATE.md << 'EOPR'
## Description
Brief description of the changes in this PR.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test coverage improvement

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Testing
Describe how you tested your changes.

## Screenshots (if applicable)
Add screenshots to demonstrate the changes.

## Related Issues
Closes #(issue number)
EOPR
        log_success "Created PR template"
    fi
    
    # 5. Quick stats
    log_info "5/5: Generating documentation stats..."
    generate_stats
    
    log_success "Quick Wins completed! (+12 points estimated)"
    log_info "Next: Review created files and commit to git"
}

# Generate documentation statistics
generate_stats() {
    local total_files=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | wc -l)
    local files_with_jsdoc=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "^/\*\*" {} \; 2>/dev/null | wc -l)
    local coverage=$(awk "BEGIN {printf \"%.1f\", ($files_with_jsdoc / $total_files) * 100}")
    
    echo ""
    echo "=== Documentation Statistics ==="
    echo "Total TypeScript files: $total_files"
    echo "Files with JSDoc: $files_with_jsdoc"
    echo "JSDoc Coverage: $coverage%"
    echo ""
    
    # Standard files check
    echo "=== Standard Files Status ==="
    for file in CONTRIBUTING.md CHANGELOG.md CODE_OF_CONDUCT.md SECURITY.md LICENSE AUTHORS.md; do
        if [ -f "$file" ]; then
            echo "✓ $file"
        else
            echo "✗ $file (missing)"
        fi
    done
    echo ""
}

# Validate JSDoc
validate_jsdoc() {
    log_info "Validating JSDoc..."
    
    if ! command -v npx &> /dev/null; then
        log_error "npx not found. Please install Node.js."
        exit 1
    fi
    
    # Run ESLint with JSDoc plugin
    npx eslint --plugin jsdoc src/ --ext .ts,.tsx
    
    if [ $? -eq 0 ]; then
        log_success "JSDoc validation passed"
    else
        log_error "JSDoc validation failed"
        exit 1
    fi
}

# Check missing documentation
check_missing() {
    log_info "Checking for missing documentation..."
    
    echo ""
    echo "=== Files Without JSDoc (Sample) ==="
    find src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/__tests__/*" | while read -r file; do
        if ! grep -q "^/\*\*" "$file"; then
            echo "  $file"
        fi
    done | head -20
    echo "  ... (run full scan for complete list)"
    echo ""
}

# Show help
show_help() {
    cat << EOF
Documentation Automation Tools

Usage:
  ./scripts/documentation-tools.sh [command]

Commands:
  quick-wins      Execute all quick wins (2 hours)
  stats           Show documentation statistics
  validate        Validate JSDoc comments
  check-missing   List files without documentation
  help            Show this help message

Examples:
  ./scripts/documentation-tools.sh quick-wins
  ./scripts/documentation-tools.sh stats
  ./scripts/documentation-tools.sh validate

For detailed information, see:
  - AUDIT_DOCUMENTATION_100.md
  - DOCUMENTATION_QUICK_START.md
  - JSDOC_PRIORITY_LIST.md
