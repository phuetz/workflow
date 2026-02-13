# Versioning and Collaboration Features

## Built-in Workflow History

### Availability by Plan

| Plan | Version History |
|------|-----------------|
| All Users | Last 24 hours |
| Cloud Pro | Last 5 days |
| Enterprise Cloud | Full history |
| Enterprise Self-hosted | Full history |

### History Features

- **View Previous Versions** - Browse complete version timeline
- **Restore** - Replace current workflow with previous version
- **Clone** - Create new workflow from historical version
- **Compare** - Open version in new tab for side-by-side comparison
- **Download** - Export version as JSON file

## Enterprise Version Control

### Git Control Integration

Available on Enterprise plans:

- Native Git integration for workflow management
- Version control using Git
- Isolated environments (dev/staging/production)
- Multi-user workflow collaboration
- Branch-based development

### Source Control Features

- Connect n8n to Git repositories
- Push/pull workflows to/from Git
- Branch management for different environments
- Merge conflict handling
- Commit history tracking

## Workflows as First-Class Objects

In n8n, workflows are not just artifacts but first-class objects:

- **Create** - Build new workflows
- **Version** - Track changes over time
- **Share** - Distribute to team members
- **Re-import** - Deploy to any environment
- **Template** - Use as base for new workflows

## Third-Party Git Integration

### GitLab Integration

Popular choice for version control:

- Export workflows as JSON files
- Commit to Git repositories
- Branching strategies for different environments:
  - `development` branch
  - `staging` branch
  - `production` branch
- Issue tracking integration
- CI/CD pipeline support

### n8n 2 Git Chrome Extension

Free tool for self-hosted instances:

- Git-powered version control without Enterprise upgrade
- Works with GitHub integration
- Workflow version management
- Team collaboration features
- Perfect for individual developers and small teams

### Community Workflow Templates

- Bidirectional GitHub Workflow Sync
- Version control templates for n8n workflows
- Automated backup workflows

## Team Collaboration

### Enterprise Collaboration Features

- **Shared Projects** - Unlimited shared projects (Enterprise)
- **Role-Based Access** - Project admins, editors, viewers
- **Credential Sharing** - Team-wide credential access
- **Workflow Sharing** - Share workflows across projects

### Best Practices for Team Collaboration

1. **Use Descriptive Commit Messages** - Clear documentation of changes
2. **Create Feature Branches** - Isolate new features during development
3. **Regular Merges** - Keep everyone on the same page
4. **Code Review Workflows** - Review changes before production
5. **Environment Separation** - Develop, test, then deploy

### Collaboration Limitations (Community Edition)

- Credential sharing limited
- Workflow sharing limited
- Multi-user features restricted
- Enterprise upgrade required for full collaboration

## Workflow Import/Export

### JSON Format

- Workflows export as portable JSON files
- Full workflow definition included
- Credentials not included for security
- Version-independent format

### Import Sources

- Local files
- URLs
- n8n workflow templates library
- Team-shared workflows

## Community Feature Requests

Active community requests include:

1. **Built-in Versioning System** - Automatic version on every change
2. **Side-by-Side Comparison** - Visual diff between versions
3. **One-Click Rollback** - Quick revert to previous versions
4. **Community Sharing** - Share workflows and credentials in community edition

## Sources

- [n8n Workflow History Documentation](https://docs.n8n.io/workflows/history/)
- [Version Control for n8n Workflows](https://prosperasoft.com/blog/automation-tools/n8n/n8n-version-control-cicd/)
- [Mastering n8n Workflow Version Control](https://ones.com/blog/mastering-n8n-workflow-version-control-best-practices/)
- [n8n 2 Git - Version Control](https://n8n2git.com/)
- [GitHub Workflow Sync Template](https://n8n.io/workflows/5081-bidirectional-github-workflow-sync-and-version-control-for-n8n-workflows/)
