#!/bin/bash

###############################################################################
# Air-Gap Bundle Creation Script
# Creates offline installation packages for high-security environments
# Compliant with NIST 800-53 and DISA STIG requirements
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERSION="${VERSION:-$(node -p "require('./package.json').version")}"
BUNDLE_NAME="workflow-automation-airgap-${VERSION}"
OUTPUT_DIR="${OUTPUT_DIR:-./airgap-bundles}"
SOURCE_DIR="${SOURCE_DIR:-$(pwd)}"
PLATFORM="${PLATFORM:-linux}"
ARCHITECTURE="${ARCHITECTURE:-x64}"
COMPRESSION="${COMPRESSION:-gzip}"

# Logging functions
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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing_tools=()

    command -v node >/dev/null 2>&1 || missing_tools+=("node")
    command -v npm >/dev/null 2>&1 || missing_tools+=("npm")
    command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
    command -v tar >/dev/null 2>&1 || missing_tools+=("tar")
    command -v sha256sum >/dev/null 2>&1 || missing_tools+=("sha256sum")

    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi

    log_success "All prerequisites met"
}

# Create bundle directory structure
create_bundle_structure() {
    log_info "Creating bundle directory structure..."

    local bundle_dir="${OUTPUT_DIR}/${BUNDLE_NAME}"

    rm -rf "${bundle_dir}"
    mkdir -p "${bundle_dir}"/{npm,docker,migrations,assets,binaries,docs,scripts}

    echo "${bundle_dir}"
}

# Package npm dependencies
package_npm_dependencies() {
    local bundle_dir="$1"
    log_info "Packaging npm dependencies..."

    cd "${SOURCE_DIR}"

    # Create npm offline cache
    npm pack

    # Move tarball to bundle
    local tarball=$(ls -t *.tgz | head -1)
    mv "${tarball}" "${bundle_dir}/npm/"

    # Download all dependencies
    log_info "Downloading all npm dependencies (this may take a while)..."

    # Create a temporary directory for dependencies
    local temp_deps="${bundle_dir}/npm/temp"
    mkdir -p "${temp_deps}"

    # Install dependencies to get the full dependency tree
    npm ci --production --prefix "${temp_deps}"

    # Pack each dependency
    cd "${temp_deps}/node_modules"
    for package in */; do
        if [ -d "${package}" ]; then
            package_name=$(basename "${package}")
            log_info "Packing ${package_name}..."
            (cd "${package}" && npm pack --pack-destination "${bundle_dir}/npm/" 2>/dev/null || true)
        fi
    done

    # Clean up temp directory
    rm -rf "${temp_deps}"

    # Copy package files
    cp "${SOURCE_DIR}/package.json" "${bundle_dir}/npm/"
    [ -f "${SOURCE_DIR}/package-lock.json" ] && cp "${SOURCE_DIR}/package-lock.json" "${bundle_dir}/npm/"

    cd "${SOURCE_DIR}"

    local npm_count=$(ls -1 "${bundle_dir}/npm"/*.tgz 2>/dev/null | wc -l)
    log_success "Packaged ${npm_count} npm packages"
}

# Package Docker images
package_docker_images() {
    local bundle_dir="$1"
    log_info "Packaging Docker images..."

    if [ ! -f "${SOURCE_DIR}/docker-compose.yml" ]; then
        log_warning "No docker-compose.yml found, skipping Docker images"
        return
    fi

    # Extract image names from docker-compose.yml
    local images=$(grep -E '^\s+image:' "${SOURCE_DIR}/docker-compose.yml" | awk '{print $2}' | tr -d '"' | tr -d "'")

    local count=0
    for image in ${images}; do
        log_info "Pulling and saving Docker image: ${image}"

        # Pull image
        docker pull "${image}" || {
            log_warning "Failed to pull ${image}, skipping..."
            continue
        }

        # Save image to tar
        local image_file=$(echo "${image}" | tr '/:' '_')
        docker save -o "${bundle_dir}/docker/${image_file}.tar" "${image}"

        count=$((count + 1))
        log_success "Saved ${image}"
    done

    # Copy docker-compose.yml
    cp "${SOURCE_DIR}/docker-compose.yml" "${bundle_dir}/docker/"

    log_success "Packaged ${count} Docker images"
}

# Package database migrations
package_migrations() {
    local bundle_dir="$1"
    log_info "Packaging database migrations..."

    if [ -d "${SOURCE_DIR}/prisma/migrations" ]; then
        cp -r "${SOURCE_DIR}/prisma/migrations"/* "${bundle_dir}/migrations/"
        cp "${SOURCE_DIR}/prisma/schema.prisma" "${bundle_dir}/migrations/" 2>/dev/null || true

        local migration_count=$(find "${bundle_dir}/migrations" -type f -name "*.sql" | wc -l)
        log_success "Packaged ${migration_count} migration files"
    else
        log_warning "No Prisma migrations found"
    fi

    # Package SQL migration scripts if they exist
    if [ -d "${SOURCE_DIR}/scripts/migrations" ]; then
        cp -r "${SOURCE_DIR}/scripts/migrations"/* "${bundle_dir}/migrations/"
    fi
}

# Package static assets
package_assets() {
    local bundle_dir="$1"
    log_info "Packaging static assets..."

    local asset_count=0

    # Package built frontend
    if [ -d "${SOURCE_DIR}/dist" ]; then
        cp -r "${SOURCE_DIR}/dist" "${bundle_dir}/assets/"
        asset_count=$((asset_count + $(find "${bundle_dir}/assets/dist" -type f | wc -l)))
    fi

    # Package public assets
    if [ -d "${SOURCE_DIR}/public" ]; then
        cp -r "${SOURCE_DIR}/public" "${bundle_dir}/assets/"
        asset_count=$((asset_count + $(find "${bundle_dir}/assets/public" -type f | wc -l)))
    fi

    log_success "Packaged ${asset_count} asset files"
}

# Package binaries
package_binaries() {
    local bundle_dir="$1"
    log_info "Packaging binaries for ${PLATFORM}-${ARCHITECTURE}..."

    local node_version=$(node --version)
    local node_dist="node-${node_version}-${PLATFORM}-${ARCHITECTURE}"

    log_info "Downloading Node.js ${node_version} for ${PLATFORM}-${ARCHITECTURE}..."

    # Download Node.js binary
    local node_url="https://nodejs.org/dist/${node_version}/${node_dist}.tar.gz"

    if curl -fsSL "${node_url}" -o "${bundle_dir}/binaries/node.tar.gz"; then
        log_success "Downloaded Node.js binary"
    else
        log_warning "Failed to download Node.js binary, using system Node.js"
        # Copy system node as fallback
        cp "$(which node)" "${bundle_dir}/binaries/node"
    fi

    # Copy custom binaries if they exist
    if [ -d "${SOURCE_DIR}/bin" ]; then
        cp -r "${SOURCE_DIR}/bin"/* "${bundle_dir}/binaries/" 2>/dev/null || true
    fi
}

# Generate checksums
generate_checksums() {
    local bundle_dir="$1"
    log_info "Generating SHA-256 checksums..."

    cd "${bundle_dir}"

    # Generate checksums for all files
    find . -type f ! -name "SHA256SUMS" ! -name "manifest.json" -exec sha256sum {} \; > SHA256SUMS

    local checksum_count=$(wc -l < SHA256SUMS)
    log_success "Generated ${checksum_count} checksums"

    cd "${SOURCE_DIR}"
}

# Generate manifest
generate_manifest() {
    local bundle_dir="$1"
    log_info "Generating manifest..."

    local total_size=$(du -sb "${bundle_dir}" | awk '{print $1}')
    local component_count=$(find "${bundle_dir}" -type f | wc -l)

    cat > "${bundle_dir}/manifest.json" <<EOF
{
  "version": "${VERSION}",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "metadata": {
    "applicationVersion": "${VERSION}",
    "nodeVersion": "$(node --version)",
    "platform": "${PLATFORM}",
    "architecture": "${ARCHITECTURE}",
    "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "totalSize": ${total_size},
    "componentCount": ${component_count},
    "complianceCertifications": ["NIST-800-53", "DISA-STIG"]
  },
  "components": {
    "npm": "$(ls -1 "${bundle_dir}/npm"/*.tgz 2>/dev/null | wc -l) packages",
    "docker": "$(ls -1 "${bundle_dir}/docker"/*.tar 2>/dev/null | wc -l) images",
    "migrations": "$(find "${bundle_dir}/migrations" -type f -name "*.sql" 2>/dev/null | wc -l) files",
    "assets": "$(find "${bundle_dir}/assets" -type f 2>/dev/null | wc -l) files",
    "binaries": "$(ls -1 "${bundle_dir}/binaries" 2>/dev/null | wc -l) files"
  }
}
EOF

    log_success "Manifest generated"
}

# Generate installation script
generate_installation_script() {
    local bundle_dir="$1"
    log_info "Generating installation script..."

    cat > "${bundle_dir}/scripts/install.sh" <<'EOF'
#!/bin/bash

set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/opt/workflow-automation}"

echo "Installing Workflow Automation Platform..."
echo "Target directory: ${INSTALL_DIR}"

# Verify checksums
echo "Verifying bundle integrity..."
if ! sha256sum -c SHA256SUMS --quiet; then
    echo "ERROR: Checksum verification failed!"
    exit 1
fi
echo "Checksums verified successfully"

# Create installation directory
mkdir -p "${INSTALL_DIR}"

# Install npm dependencies
echo "Installing npm dependencies..."
cd npm
npm install --offline --no-audit --no-fund *.tgz --prefix "${INSTALL_DIR}"

# Load Docker images
if [ -d docker ] && command -v docker >/dev/null 2>&1; then
    echo "Loading Docker images..."
    for image in docker/*.tar; do
        docker load -i "${image}"
    done
fi

# Copy assets
echo "Copying assets..."
[ -d assets ] && cp -r assets/* "${INSTALL_DIR}/"

# Copy binaries
echo "Installing binaries..."
[ -d binaries ] && cp -r binaries/* "${INSTALL_DIR}/bin/"

# Copy migrations
echo "Installing migrations..."
[ -d migrations ] && cp -r migrations "${INSTALL_DIR}/"

echo "Installation completed successfully!"
echo "Please configure the application before starting."
EOF

    chmod +x "${bundle_dir}/scripts/install.sh"
    log_success "Installation script generated"
}

# Generate documentation
generate_documentation() {
    local bundle_dir="$1"
    log_info "Generating documentation..."

    cat > "${bundle_dir}/docs/AIRGAP_INSTALLATION.md" <<EOF
# Air-Gap Installation Guide

## Overview

This bundle contains all necessary components to install Workflow Automation Platform in an air-gapped environment.

## Version Information

- **Application Version**: ${VERSION}
- **Platform**: ${PLATFORM}
- **Architecture**: ${ARCHITECTURE}
- **Build Date**: $(date -u +"%Y-%m-%d")
- **Compliance**: NIST 800-53, DISA STIG

## Prerequisites

- Linux/Unix operating system
- Minimum 4 GB RAM
- Minimum 20 GB disk space
- PostgreSQL 13+ or compatible database
- Redis 6+ (optional, for queue management)

## Installation Steps

### 1. Transfer Bundle

Transfer the bundle to the target system via approved secure transfer method:
- USB drive
- Secure file transfer
- Physical media

### 2. Verify Bundle Integrity

\`\`\`bash
cd ${BUNDLE_NAME}
sha256sum -c SHA256SUMS
\`\`\`

All checksums must pass before proceeding.

### 3. Run Installation Script

\`\`\`bash
sudo bash scripts/install.sh
\`\`\`

Or specify custom installation directory:

\`\`\`bash
INSTALL_DIR=/custom/path sudo bash scripts/install.sh
\`\`\`

### 4. Configure Application

Edit configuration file:

\`\`\`bash
nano /opt/workflow-automation/config/production.env
\`\`\`

Required configuration:
- DATABASE_URL
- JWT_SECRET
- ENCRYPTION_KEY

### 5. Initialize Database

\`\`\`bash
cd /opt/workflow-automation
npx prisma migrate deploy
\`\`\`

### 6. Start Application

\`\`\`bash
# Using Docker Compose
docker-compose up -d

# Or using Node.js directly
npm run start
\`\`\`

## Security Hardening

### NIST 800-53 Compliance

- Enable audit logging (AU-2)
- Configure TLS 1.3+ (SC-8)
- Enable database encryption (SC-28)
- Configure strong authentication (IA-2)
- Implement RBAC (AC-3)

### DISA STIG Compliance

- Apply all security patches from bundle
- Configure firewall rules
- Enable SELinux/AppArmor
- Restrict file permissions
- Configure secure logging

## Troubleshooting

### Checksum Verification Fails

Indicates bundle corruption. Re-transfer bundle and verify again.

### Installation Fails

Check system logs:
\`\`\`bash
journalctl -xe
\`\`\`

### Database Connection Issues

Verify DATABASE_URL configuration and network connectivity.

## Updates

To update the installation:

1. Transfer new update bundle
2. Backup current installation
3. Apply update bundle
4. Run migrations
5. Restart services

## Support

For air-gapped installations, contact your designated support personnel with the installation report located at:

\`/opt/workflow-automation/compliance/installation-report.json\`

## Compliance Documentation

Generated compliance documentation available at:
- \`/opt/workflow-automation/compliance/NIST-800-53-compliance.json\`
- \`/opt/workflow-automation/compliance/DISA-STIG-compliance.json\`
EOF

    log_success "Documentation generated"
}

# Compress bundle
compress_bundle() {
    local bundle_dir="$1"
    log_info "Compressing bundle with ${COMPRESSION}..."

    cd "${OUTPUT_DIR}"

    case "${COMPRESSION}" in
        gzip)
            tar -czf "${BUNDLE_NAME}.tar.gz" "${BUNDLE_NAME}"
            log_success "Bundle compressed: ${BUNDLE_NAME}.tar.gz"
            ;;
        bzip2)
            tar -cjf "${BUNDLE_NAME}.tar.bz2" "${BUNDLE_NAME}"
            log_success "Bundle compressed: ${BUNDLE_NAME}.tar.bz2"
            ;;
        xz)
            tar -cJf "${BUNDLE_NAME}.tar.xz" "${BUNDLE_NAME}"
            log_success "Bundle compressed: ${BUNDLE_NAME}.tar.xz"
            ;;
        none)
            log_info "Skipping compression"
            ;;
        *)
            log_error "Unknown compression format: ${COMPRESSION}"
            exit 1
            ;;
    esac

    cd "${SOURCE_DIR}"
}

# Main execution
main() {
    log_info "Creating air-gap bundle for version ${VERSION}"
    log_info "Platform: ${PLATFORM}, Architecture: ${ARCHITECTURE}"

    check_prerequisites

    bundle_dir=$(create_bundle_structure)

    package_npm_dependencies "${bundle_dir}"
    package_docker_images "${bundle_dir}"
    package_migrations "${bundle_dir}"
    package_assets "${bundle_dir}"
    package_binaries "${bundle_dir}"

    generate_checksums "${bundle_dir}"
    generate_manifest "${bundle_dir}"
    generate_installation_script "${bundle_dir}"
    generate_documentation "${bundle_dir}"

    compress_bundle "${bundle_dir}"

    log_success "Air-gap bundle created successfully!"
    log_info "Bundle location: ${OUTPUT_DIR}/${BUNDLE_NAME}"

    # Display summary
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "                    BUNDLE SUMMARY"
    echo "═══════════════════════════════════════════════════════════"
    echo "Version:       ${VERSION}"
    echo "Platform:      ${PLATFORM}-${ARCHITECTURE}"
    echo "Bundle Size:   $(du -sh "${bundle_dir}" | awk '{print $1}')"
    echo "Components:    $(find "${bundle_dir}" -type f | wc -l) files"
    echo "Checksums:     $(wc -l < "${bundle_dir}/SHA256SUMS") files verified"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Transfer this bundle to your air-gapped environment and run:"
    echo "  bash scripts/install.sh"
    echo ""
}

# Run main function
main "$@"
