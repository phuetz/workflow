# Security Policy

## Our Commitment to Security

We take the security of our workflow automation platform seriously. We appreciate the security research community's efforts in helping us maintain a secure environment for all users.

This document outlines our security policy, supported versions, and how to report security vulnerabilities responsibly.

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          | End of Support |
| ------- | ------------------ | -------------- |
| 1.0.x   | :white_check_mark: | TBD            |
| 0.9.x   | :white_check_mark: | 2025-06-30     |
| 0.8.x   | :x:                | 2025-01-31     |
| < 0.8   | :x:                | Not supported  |

**Recommendation**: Always use the latest stable version for the best security and features.

## Reporting a Vulnerability

**Please DO NOT report security vulnerabilities through public GitHub issues.**

We appreciate responsible disclosure. If you discover a security vulnerability, please report it privately.

### Reporting Process

1. **Email**: Send details to **security@example.com**
2. **Encryption**: Use our PGP key (see below) for sensitive information
3. **Response Time**: We will acknowledge your report within 48 hours
4. **Investigation**: We typically investigate and respond within 7 business days
5. **Resolution**: Critical issues are prioritized and patched within 72 hours when possible

### What to Include in Your Report

To help us understand and resolve the issue quickly, please include:

* **Vulnerability Type**: (e.g., SQL injection, XSS, CSRF, authentication bypass)
* **Affected Component**: Which part of the system (frontend, backend, API, specific node type)
* **Attack Scenario**: How the vulnerability could be exploited
* **Impact Assessment**: What an attacker could achieve
* **Proof of Concept**: Steps to reproduce (code, screenshots, videos)
* **Affected Versions**: Which versions are vulnerable
* **Suggested Fix**: (optional) Your recommendation for remediation
* **Your Details**: Name/handle and contact info (for credit and follow-up)

**Example Report**:
```
Subject: [SECURITY] SQL Injection in Workflow Search API

Vulnerability Type: SQL Injection
Affected Component: /api/workflows/search endpoint
Severity: High
Affected Versions: 0.9.0 - 1.0.0

Description:
The workflow search endpoint does not properly sanitize the 'query'
parameter, allowing SQL injection attacks.

Proof of Concept:
curl -X POST http://localhost:5000/api/workflows/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test' OR 1=1--"}'

Impact:
An authenticated attacker could read, modify, or delete arbitrary
database records, including sensitive workflow configurations and
credentials.

Suggested Fix:
Use Prisma's parameterized queries instead of raw SQL.

Researcher: John Doe (john@example.com)
```

### Our PGP Key

```
-----BEGIN PGP PUBLIC KEY BLOCK-----

[Your actual PGP public key would go here]

-----END PGP PUBLIC KEY BLOCK-----
```

Download: [security-pgp-key.asc](https://example.com/security-pgp-key.asc)

## Disclosure Policy

### Our Commitment

* **Acknowledgment**: Within 48 hours of report
* **Initial Assessment**: Within 7 business days
* **Regular Updates**: We'll keep you informed of our progress
* **Fix Timeline**:
  * Critical vulnerabilities: 72 hours (best effort)
  * High severity: 30 days
  * Medium severity: 60 days
  * Low severity: 90 days
* **Public Disclosure**: Coordinated disclosure 90 days after patch release
* **Credit**: We'll credit you in our security advisories (unless you prefer anonymity)

### Coordinated Disclosure

We follow a coordinated disclosure process:

1. **Private Fix**: We develop and test a patch privately
2. **Security Advisory**: We prepare a security advisory (CVE if applicable)
3. **Patch Release**: We release a patched version
4. **Public Disclosure**: We publish the advisory 7-14 days after patch release
5. **Credit**: We credit the researcher (with permission)

**Timeline**:
* Day 0: Vulnerability reported
* Day 1-7: Investigation and validation
* Day 8-30: Patch development and testing
* Day 31: Patch released to affected versions
* Day 38-45: Public disclosure and advisory

We request that you:
* Allow us reasonable time to address the issue before public disclosure
* Do not exploit the vulnerability beyond proof of concept
* Do not access, modify, or delete other users' data
* Do not perform testing on production systems (use local instances)

## Security Measures

### Platform Security

Our platform implements multiple layers of security:

#### Authentication & Authorization

* **Multi-factor Authentication (MFA)**: TOTP-based 2FA
* **Session Management**: Secure, HTTP-only cookies with CSRF tokens
* **Password Security**: bcrypt hashing with salt (cost factor: 12)
* **OAuth2/OIDC**: Support for enterprise SSO providers
* **LDAP/Active Directory**: Enterprise directory integration
* **API Keys**: Scoped API keys with expiration
* **Role-Based Access Control (RBAC)**: Granular permissions system

#### Data Protection

* **Encryption at Rest**: AES-256 encryption for sensitive data
* **Encryption in Transit**: TLS 1.3 for all communications
* **Credential Management**: Encrypted credential storage with key rotation
* **Secrets Management**: Integration with HashiCorp Vault, AWS Secrets Manager
* **PII Detection**: Automatic detection and handling of personal data
* **Data Residency**: Geographic controls for compliance (GDPR, SOC2)

#### Application Security

* **Input Validation**: All user inputs sanitized and validated
* **Expression Security**: No eval() or Function() constructor usage
* **SQL Injection Prevention**: Parameterized queries via Prisma ORM
* **XSS Prevention**: React's built-in escaping + Content Security Policy
* **CSRF Protection**: Token-based CSRF protection on all state-changing operations
* **Rate Limiting**: API rate limits to prevent abuse (100 req/min/user, 1000 req/min/IP)
* **Security Headers**: Helmet.js for security headers (CSP, X-Frame-Options, etc.)

#### Infrastructure Security

* **Container Security**: Minimal base images, non-root users, read-only filesystems
* **Network Isolation**: Backend services not directly exposed to internet
* **Dependency Scanning**: Automated scanning with npm audit and Snyk
* **Secrets Management**: No secrets in code or version control
* **Audit Logging**: Comprehensive audit trail for all security-relevant events

#### Plugin/Extension Security

* **Sandboxing**: VM2 sandboxing for custom code execution
* **Resource Limits**: CPU and memory limits for plugins
* **Permission System**: Granular permissions for file system, network access
* **Code Review**: Manual review for marketplace plugins
* **Signature Verification**: Plugins signed by trusted publishers

### Compliance Frameworks

We support compliance with:

* **SOC 2 Type II**: Security, availability, confidentiality controls
* **ISO 27001**: Information security management system
* **GDPR**: EU data protection regulation
* **HIPAA**: Healthcare data protection (with BAA available)
* **PCI DSS**: Payment card industry standards (when handling payment data)

See our [Compliance Dashboard](./docs/compliance.md) for detailed controls.

## Security Best Practices for Users

### For Administrators

* **Keep Updated**: Always run the latest stable version
* **MFA Enforcement**: Require MFA for all users
* **Least Privilege**: Grant minimum necessary permissions
* **Audit Regularly**: Review audit logs weekly
* **Rotate Credentials**: Rotate API keys and secrets quarterly
* **Network Security**: Use firewalls and VPNs for production access
* **Backup Encryption**: Encrypt backups and test recovery procedures
* **Monitor Alerts**: Configure security alerts and respond promptly

### For Workflow Developers

* **Validate Inputs**: Always validate and sanitize user inputs
* **Secure Credentials**: Use credential management system, never hardcode secrets
* **Error Handling**: Don't expose sensitive data in error messages
* **Expression Security**: Be cautious with user-provided expressions
* **API Security**: Use appropriate authentication for webhook endpoints
* **Data Minimization**: Only collect and process necessary data
* **Logging**: Don't log sensitive data (passwords, tokens, PII)
* **Testing**: Test workflows in isolated environments before production

### For Plugin Developers

* **Input Validation**: Validate all inputs, don't trust user data
* **Least Privilege**: Request minimum required permissions
* **Secure Dependencies**: Keep dependencies updated, avoid known vulnerabilities
* **No Secrets**: Don't hardcode API keys or credentials
* **Error Handling**: Sanitize error messages before displaying
* **Documentation**: Document security considerations for plugin users
* **Code Review**: Have code reviewed before publishing to marketplace

## Known Security Considerations

### Expression System

The expression system (`{{ ... }}`) allows dynamic data transformation but has security implications:

**Mitigations**:
* No `eval()` or `Function()` constructor
* Whitelisted function library only
* Input sanitization and validation
* Execution timeout limits
* No access to Node.js built-ins (fs, child_process, etc.)

**Best Practice**: Always validate expression outputs before using in sensitive contexts.

### Custom Code Execution

Code nodes (JavaScript, Python) execute user-provided code:

**Mitigations**:
* VM2 sandbox with isolated context
* No network access by default (must be explicitly granted)
* No file system access by default
* CPU and memory limits enforced
* Execution timeout (max 60 seconds)
* Process isolation in production deployments

**Best Practice**: Review all custom code carefully. Consider disabling code nodes in high-security environments.

### Webhook Security

Webhooks receive external HTTP requests:

**Mitigations**:
* Support for 7 authentication methods (HMAC, JWT, OAuth2, API Key, Basic, mTLS, Custom)
* IP whitelisting support
* Rate limiting per webhook
* Request signature verification
* Replay attack prevention

**Best Practice**: Always configure authentication for webhooks. Use HMAC signatures when possible.

### Third-Party Integrations

Integrations connect to external services:

**Mitigations**:
* OAuth2 with PKCE for supported services
* Credential encryption at rest
* Token refresh automation
* Scope minimization
* Per-environment credentials

**Best Practice**: Use service accounts with minimal permissions. Rotate credentials regularly.

## Security Updates

### Notification Channels

We announce security updates through:

* **Security Advisories**: GitHub Security Advisories
* **Email**: Registered users receive critical security notifications
* **RSS Feed**: Subscribe to our security feed
* **Release Notes**: All releases include security changes
* **CHANGELOG.md**: Security fixes documented with [SECURITY] tag

### CVE Assignment

For significant vulnerabilities, we request CVE identifiers through:
* MITRE CVE Program
* GitHub Security Advisories
* NIST National Vulnerability Database (NVD)

### Severity Classification

We use CVSS v3.1 for severity scoring:

| Severity | CVSS Score | Response Time |
|----------|------------|---------------|
| Critical | 9.0-10.0   | 72 hours      |
| High     | 7.0-8.9    | 30 days       |
| Medium   | 4.0-6.9    | 60 days       |
| Low      | 0.1-3.9    | 90 days       |

## Security Audits

### External Audits

We conduct regular third-party security audits:

* **Penetration Testing**: Annually by certified security firms
* **Code Audits**: Bi-annually for critical components
* **Infrastructure Review**: Quarterly cloud security assessments
* **Compliance Audits**: As required for certifications (SOC 2, ISO 27001)

### Continuous Monitoring

* **Automated Scanning**: Daily dependency scans (npm audit, Snyk)
* **SAST**: Static analysis in CI/CD pipeline (ESLint security rules)
* **DAST**: Dynamic testing on staging deployments
* **Container Scanning**: Image vulnerability scanning (Trivy, Clair)
* **Secret Detection**: Pre-commit hooks and CI checks (git-secrets, TruffleHog)

## Bug Bounty Program

We are planning to launch a bug bounty program. Stay tuned for details!

**Future Rewards** (indicative):
* Critical: $1,000 - $5,000
* High: $500 - $1,000
* Medium: $100 - $500
* Low: $50 - $100

## Security Champions

Our internal security champions:

* **Security Lead**: [Name] - security@example.com
* **Infrastructure Security**: [Name]
* **Application Security**: [Name]
* **Compliance Officer**: [Name]

## Additional Resources

### Security Documentation

* [Security Architecture](./docs/security/architecture.md)
* [Threat Model](./docs/security/threat-model.md)
* [Incident Response Plan](./docs/security/incident-response.md)
* [Security Checklist](./docs/security/checklist.md)
* [Compliance Guide](./docs/compliance.md)

### External Resources

* [OWASP Top 10](https://owasp.org/www-project-top-ten/)
* [CWE Top 25](https://cwe.mitre.org/top25/)
* [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
* [Cloud Security Alliance](https://cloudsecurityalliance.org/)

## Security Hall of Fame

We recognize security researchers who have helped improve our security:

* [List of credited researchers will appear here]

Thank you to all security researchers who work to keep our platform secure!

## Contact

* **General Security**: security@example.com
* **Security Advisories**: Subscribe via GitHub
* **Urgent Issues**: security@example.com (monitored 24/7)
* **PGP Key**: [Download](https://example.com/security-pgp-key.asc)

---

**Last Updated**: January 23, 2025
**Version**: 1.0

We continuously improve our security practices. If you have suggestions for this policy, please contact us at security@example.com.
