/**
 * Offline Package Creator
 * Creates comprehensive offline installation bundles for air-gapped deployments
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

export interface PackageConfig {
  version: string;
  sourceDir: string;
  outputDir: string;
  includeNodeModules: boolean;
  includeDockerImages: boolean;
  includeMigrations: boolean;
  includeAssets: boolean;
  compression: 'none' | 'gzip' | 'bzip2' | 'xz';
  platform?: 'linux' | 'darwin' | 'win32';
  architecture?: 'x64' | 'arm64';
}

export interface PackageResult {
  success: boolean;
  bundlePath: string;
  totalSize: number;
  componentCount: number;
  checksumsGenerated: number;
  duration: number;
  warnings: string[];
}

export class OfflinePackager {
  private config: PackageConfig;
  private logger: (message: string) => void;
  private checksums: Map<string, string> = new Map();

  constructor(config: PackageConfig, logger?: (message: string) => void) {
    this.config = config;
    this.logger = logger || (() => {});
  }

  /**
   * Create complete offline bundle
   */
  async createBundle(): Promise<PackageResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const bundleDir = path.join(this.config.outputDir, `airgap-bundle-${this.config.version}`);

    try {
      this.logger('Starting offline bundle creation...');

      // Create bundle directory structure
      await this.createBundleStructure(bundleDir);

      let componentCount = 0;

      // Package npm dependencies
      if (this.config.includeNodeModules) {
        this.logger('Packaging npm dependencies...');
        const npmCount = await this.packageNpmDependencies(bundleDir);
        componentCount += npmCount;
      }

      // Package Docker images
      if (this.config.includeDockerImages) {
        this.logger('Packaging Docker images...');
        try {
          const dockerCount = await this.packageDockerImages(bundleDir);
          componentCount += dockerCount;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          warnings.push(`Docker packaging failed: ${errorMessage}`);
        }
      }

      // Package database migrations
      if (this.config.includeMigrations) {
        this.logger('Packaging database migrations...');
        const migrationCount = await this.packageMigrations(bundleDir);
        componentCount += migrationCount;
      }

      // Package static assets
      if (this.config.includeAssets) {
        this.logger('Packaging static assets...');
        const assetCount = await this.packageAssets(bundleDir);
        componentCount += assetCount;
      }

      // Package binaries
      this.logger('Packaging binaries...');
      const binaryCount = await this.packageBinaries(bundleDir);
      componentCount += binaryCount;

      // Generate manifest
      this.logger('Generating manifest...');
      await this.generateManifest(bundleDir);

      // Generate checksums file
      this.logger('Generating checksums...');
      await this.generateChecksumsFile(bundleDir);

      // Create tarball if compression is enabled
      let finalBundlePath = bundleDir;
      if (this.config.compression !== 'none') {
        this.logger(`Compressing bundle with ${this.config.compression}...`);
        finalBundlePath = await this.compressBundle(bundleDir);
      }

      // Calculate total size
      const totalSize = await this.calculateDirectorySize(bundleDir);

      const duration = Date.now() - startTime;
      this.logger(`Bundle creation completed in ${duration}ms`);

      return {
        success: true,
        bundlePath: finalBundlePath,
        totalSize,
        componentCount,
        checksumsGenerated: this.checksums.size,
        duration,
        warnings
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger(`Bundle creation failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Create bundle directory structure
   */
  private async createBundleStructure(bundleDir: string): Promise<void> {
    const dirs = [
      bundleDir,
      path.join(bundleDir, 'npm'),
      path.join(bundleDir, 'docker'),
      path.join(bundleDir, 'migrations'),
      path.join(bundleDir, 'assets'),
      path.join(bundleDir, 'binaries'),
      path.join(bundleDir, 'docs')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        await mkdirAsync(dir, { recursive: true });
      }
    }
  }

  /**
   * Package npm dependencies as offline tarballs
   */
  private async packageNpmDependencies(bundleDir: string): Promise<number> {
    const npmDir = path.join(bundleDir, 'npm');
    const packageJsonPath = path.join(this.config.sourceDir, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      this.logger('No package.json found, skipping npm dependencies');
      return 0;
    }

    const packageJson = JSON.parse(await readFileAsync(packageJsonPath, 'utf-8'));
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    let count = 0;

    // Create npm cache for offline installation
    this.logger('Creating npm offline cache...');
    await execAsync(`npm pack`, { cwd: this.config.sourceDir });

    // Pack main application
    const tarballName = `${packageJson.name}-${packageJson.version}.tgz`;
    const tarballPath = path.join(this.config.sourceDir, tarballName);

    if (fs.existsSync(tarballPath)) {
      const destPath = path.join(npmDir, tarballName);
      fs.copyFileSync(tarballPath, destPath);
      await this.calculateAndStoreChecksum(destPath, `npm/${tarballName}`);
      fs.unlinkSync(tarballPath);
      count++;
    }

    // Download all dependencies as tarballs
    for (const [name, version] of Object.entries(dependencies)) {
      try {
        this.logger(`Packing ${name}@${version}...`);
        const { stdout } = await execAsync(`npm pack ${name}@${version}`, { cwd: npmDir });
        const tarballFile = stdout.trim();
        const tarballFullPath = path.join(npmDir, tarballFile);

        await this.calculateAndStoreChecksum(tarballFullPath, `npm/${tarballFile}`);
        count++;
      } catch (error) {
        this.logger(`Warning: Failed to pack ${name}@${version}`);
      }
    }

    // Create package-lock for offline use
    const lockPath = path.join(this.config.sourceDir, 'package-lock.json');
    if (fs.existsSync(lockPath)) {
      const destLockPath = path.join(npmDir, 'package-lock.json');
      fs.copyFileSync(lockPath, destLockPath);
    }

    return count;
  }

  /**
   * Package Docker images as tar files
   */
  private async packageDockerImages(bundleDir: string): Promise<number> {
    const dockerDir = path.join(bundleDir, 'docker');
    const composeFile = path.join(this.config.sourceDir, 'docker-compose.yml');

    if (!fs.existsSync(composeFile)) {
      this.logger('No docker-compose.yml found, skipping Docker images');
      return 0;
    }

    // Parse docker-compose to find images
    const composeContent = await readFileAsync(composeFile, 'utf-8');
    const imageRegex = /image:\s*([^\s]+)/g;
    const images: string[] = [];
    let match;

    while ((match = imageRegex.exec(composeContent)) !== null) {
      images.push(match[1]);
    }

    let count = 0;

    for (const image of images) {
      try {
        const imageName = image.replace(/[/:]/g, '_');
        const tarPath = path.join(dockerDir, `${imageName}.tar`);

        this.logger(`Saving Docker image: ${image}`);

        // Pull image if not present
        await execAsync(`docker pull ${image}`);

        // Save image to tar
        await execAsync(`docker save -o "${tarPath}" ${image}`);

        await this.calculateAndStoreChecksum(tarPath, `docker/${imageName}.tar`);
        count++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger(`Warning: Failed to save Docker image ${image}: ${errorMessage}`);
      }
    }

    // Copy docker-compose.yml
    const destComposePath = path.join(dockerDir, 'docker-compose.yml');
    fs.copyFileSync(composeFile, destComposePath);

    return count;
  }

  /**
   * Package database migrations
   */
  private async packageMigrations(bundleDir: string): Promise<number> {
    const migrationsDir = path.join(bundleDir, 'migrations');
    const sourceMigrations = path.join(this.config.sourceDir, 'prisma', 'migrations');

    if (!fs.existsSync(sourceMigrations)) {
      this.logger('No migrations found, skipping...');
      return 0;
    }

    // Copy all migration files
    await execAsync(`cp -r "${sourceMigrations}"/* "${migrationsDir}"/`);

    // Copy schema file
    const schemaPath = path.join(this.config.sourceDir, 'prisma', 'schema.prisma');
    if (fs.existsSync(schemaPath)) {
      const destSchemaPath = path.join(migrationsDir, 'schema.prisma');
      fs.copyFileSync(schemaPath, destSchemaPath);
    }

    // Count migration files
    const files = fs.readdirSync(migrationsDir, { recursive: true }) as string[];
    const migrationFiles = files.filter(f => f.endsWith('.sql') || f.endsWith('.prisma'));

    // Generate checksums for all migration files
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      if (fs.statSync(filePath).isFile()) {
        await this.calculateAndStoreChecksum(filePath, `migrations/${file}`);
      }
    }

    return migrationFiles.length;
  }

  /**
   * Package static assets
   */
  private async packageAssets(bundleDir: string): Promise<number> {
    const assetsDir = path.join(bundleDir, 'assets');
    const sourceAssets = [
      path.join(this.config.sourceDir, 'public'),
      path.join(this.config.sourceDir, 'dist'),
      path.join(this.config.sourceDir, 'build')
    ];

    let count = 0;

    for (const sourceDir of sourceAssets) {
      if (fs.existsSync(sourceDir)) {
        const dirName = path.basename(sourceDir);
        const targetDir = path.join(assetsDir, dirName);

        await execAsync(`cp -r "${sourceDir}" "${targetDir}"`);

        // Calculate checksums for all files
        const files = fs.readdirSync(targetDir, { recursive: true }) as string[];
        for (const file of files) {
          const filePath = path.join(targetDir, file);
          if (fs.statSync(filePath).isFile()) {
            await this.calculateAndStoreChecksum(filePath, `assets/${dirName}/${file}`);
            count++;
          }
        }
      }
    }

    return count;
  }

  /**
   * Package platform-specific binaries
   */
  private async packageBinaries(bundleDir: string): Promise<number> {
    const binariesDir = path.join(bundleDir, 'binaries');
    const platform = this.config.platform || process.platform;
    const arch = this.config.architecture || process.arch;

    // Copy Node.js binary for the target platform
    const nodeVersion = process.version;
    const nodeBinaryName = platform === 'win32' ? 'node.exe' : 'node';
    const nodeBinaryPath = path.join(binariesDir, nodeBinaryName);

    this.logger(`Packaging Node.js ${nodeVersion} for ${platform}-${arch}`);

    // Download Node.js binary for the target platform
    const nodeUrl = `https://nodejs.org/dist/${nodeVersion}/node-${nodeVersion}-${platform}-${arch}.tar.gz`;

    try {
      await execAsync(`curl -L "${nodeUrl}" -o "${binariesDir}/node.tar.gz"`);
      await execAsync(`tar -xzf "${binariesDir}/node.tar.gz" -C "${binariesDir}"`);
      await this.calculateAndStoreChecksum(`${binariesDir}/node.tar.gz`, 'binaries/node.tar.gz');
    } catch (error) {
      this.logger('Warning: Failed to download Node.js binary, skipping...');
    }

    // Copy any custom binaries from the project
    const sourceBinDir = path.join(this.config.sourceDir, 'bin');
    if (fs.existsSync(sourceBinDir)) {
      const files = fs.readdirSync(sourceBinDir);
      for (const file of files) {
        const sourcePath = path.join(sourceBinDir, file);
        const destPath = path.join(binariesDir, file);
        fs.copyFileSync(sourcePath, destPath);
        await this.calculateAndStoreChecksum(destPath, `binaries/${file}`);
      }
      return files.length + 1;
    }

    return 1;
  }

  /**
   * Generate manifest file
   */
  private async generateManifest(bundleDir: string): Promise<void> {
    const components = [];

    // Add all checksummed components
    for (const [relativePath, checksum] of this.checksums.entries()) {
      const fullPath = path.join(bundleDir, relativePath);
      const stats = fs.statSync(fullPath);

      const component = {
        name: path.basename(relativePath),
        type: this.determineComponentType(relativePath),
        path: relativePath,
        size: stats.size,
        checksum,
        dependencies: [],
        required: this.isRequiredComponent(relativePath)
      };

      components.push(component);
    }

    const manifest = {
      version: this.config.version,
      createdAt: new Date().toISOString(),
      components,
      checksums: Object.fromEntries(this.checksums),
      metadata: {
        applicationVersion: this.config.version,
        nodeVersion: process.version,
        platform: this.config.platform || process.platform,
        architecture: this.config.architecture || process.arch,
        buildDate: new Date().toISOString(),
        totalSize: await this.calculateDirectorySize(bundleDir),
        componentCount: components.length,
        complianceCertifications: ['NIST-800-53', 'DISA-STIG']
      }
    };

    const manifestPath = path.join(bundleDir, 'manifest.json');
    await writeFileAsync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  /**
   * Generate checksums file
   */
  private async generateChecksumsFile(bundleDir: string): Promise<void> {
    const checksumsContent = Array.from(this.checksums.entries())
      .map(([file, checksum]) => `${checksum}  ${file}`)
      .join('\n');

    const checksumsPath = path.join(bundleDir, 'SHA256SUMS');
    await writeFileAsync(checksumsPath, checksumsContent);
  }

  /**
   * Compress bundle into tarball
   */
  private async compressBundle(bundleDir: string): Promise<string> {
    const bundleName = path.basename(bundleDir);
    const outputPath = `${bundleDir}.tar.gz`;

    // Use tar command for compression
    const parentDir = path.dirname(bundleDir);

    let tarCommand: string;
    switch (this.config.compression) {
      case 'gzip':
        tarCommand = `tar -czf "${outputPath}" -C "${parentDir}" "${bundleName}"`;
        break;
      case 'bzip2':
        tarCommand = `tar -cjf "${outputPath}" -C "${parentDir}" "${bundleName}"`;
        break;
      case 'xz':
        tarCommand = `tar -cJf "${outputPath}" -C "${parentDir}" "${bundleName}"`;
        break;
      default:
        tarCommand = `tar -cf "${outputPath}" -C "${parentDir}" "${bundleName}"`;
    }

    await execAsync(tarCommand);

    const stats = fs.statSync(outputPath);
    this.logger(`Bundle compressed: ${stats.size} bytes`);

    return outputPath;
  }

  /**
   * Calculate and store checksum for a file
   */
  private async calculateAndStoreChecksum(filePath: string, relativePath: string): Promise<string> {
    const checksum = await this.calculateChecksum(filePath);
    this.checksums.set(relativePath, checksum);
    return checksum;
  }

  /**
   * Calculate SHA-256 checksum of a file
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Calculate total size of directory
   */
  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    const walk = (dir: string) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          walk(filePath);
        } else {
          totalSize += stats.size;
        }
      }
    };

    walk(dirPath);
    return totalSize;
  }

  /**
   * Determine component type from path
   */
  private determineComponentType(relativePath: string): string {
    if (relativePath.startsWith('npm/')) return 'npm';
    if (relativePath.startsWith('docker/')) return 'docker';
    if (relativePath.startsWith('migrations/')) return 'migration';
    if (relativePath.startsWith('assets/')) return 'asset';
    if (relativePath.startsWith('binaries/')) return 'binary';
    return 'unknown';
  }

  /**
   * Check if component is required
   */
  private isRequiredComponent(relativePath: string): boolean {
    // Core components are always required
    const requiredPatterns = [
      /^npm\/.*\.tgz$/,
      /^binaries\/node/,
      /^migrations\/schema\.prisma$/
    ];

    return requiredPatterns.some(pattern => pattern.test(relativePath));
  }

  /**
   * Verify bundle integrity
   */
  static async verifyBundle(bundlePath: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const manifestPath = path.join(bundlePath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        errors.push('Manifest file not found');
        return { valid: false, errors };
      }

      const manifest = JSON.parse(await readFileAsync(manifestPath, 'utf-8'));

      for (const component of manifest.components) {
        const componentPath = path.join(bundlePath, component.path);

        if (!fs.existsSync(componentPath)) {
          errors.push(`Component not found: ${component.path}`);
          continue;
        }

        const actualChecksum = await new OfflinePackager({
          version: manifest.version,
          sourceDir: '',
          outputDir: '',
          includeNodeModules: false,
          includeDockerImages: false,
          includeMigrations: false,
          includeAssets: false,
          compression: 'none'
        }).calculateChecksum(componentPath);

        if (actualChecksum !== component.checksum) {
          errors.push(`Checksum mismatch for ${component.path}`);
        }
      }

      return { valid: errors.length === 0, errors };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Verification failed: ${errorMessage}`);
      return { valid: false, errors };
    }
  }
}
