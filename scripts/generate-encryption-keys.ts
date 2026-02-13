#!/usr/bin/env tsx

/**
 * Encryption Key Generation Script
 *
 * Generates cryptographically secure encryption keys for credential storage.
 * Run with: npm run generate:keys
 *
 * @module scripts/generate-encryption-keys
 */

import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

interface GeneratedKeys {
  encryptionKey: string;
  encryptionSalt: string;
  timestamp: string;
  environment: string;
}

/**
 * Generates encryption key and salt
 */
function generateKeys(): GeneratedKeys {
  const encryptionKey = randomBytes(32).toString('hex'); // 256 bits
  const encryptionSalt = randomBytes(16).toString('hex'); // 128 bits

  return {
    encryptionKey,
    encryptionSalt,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };
}

/**
 * Displays generated keys
 */
function displayKeys(keys: GeneratedKeys): void {
  console.log('\n' + '='.repeat(80));
  console.log('🔐  ENCRYPTION KEYS GENERATED');
  console.log('='.repeat(80));
  console.log('\n⚠️  CRITICAL SECURITY NOTICE:');
  console.log('   • These keys protect ALL credential data');
  console.log('   • NEVER commit these keys to git');
  console.log('   • Use different keys for dev/staging/production');
  console.log('   • Store in secure vault (AWS Secrets Manager, HashiCorp Vault)');
  console.log('   • Backup keys securely - losing them means losing ALL encrypted data');
  console.log('   • Rotate keys every 90 days (automatic rotation available)');
  console.log('\n' + '-'.repeat(80));
  console.log('\n📋 Add these to your .env file:\n');
  console.log(`ENCRYPTION_KEY=${keys.encryptionKey}`);
  console.log(`ENCRYPTION_SALT=${keys.encryptionSalt}`);
  console.log('\n' + '-'.repeat(80));
  console.log('\n📊 Key Information:');
  console.log(`   • Encryption Key: ${keys.encryptionKey.length} characters (${keys.encryptionKey.length / 2} bytes)`);
  console.log(`   • Salt: ${keys.encryptionSalt.length} characters (${keys.encryptionSalt.length / 2} bytes)`);
  console.log(`   • Algorithm: AES-256-GCM`);
  console.log(`   • Generated: ${keys.timestamp}`);
  console.log(`   • Environment: ${keys.environment}`);
  console.log('\n' + '-'.repeat(80));
  console.log('\n🔄 Next Steps:');
  console.log('   1. Copy the keys above to your .env file');
  console.log('   2. Restart your application');
  console.log('   3. Verify encryption: npm run test:encryption');
  console.log('   4. If migrating existing credentials: npm run migrate:credentials');
  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Saves keys to a secure file (optional)
 */
async function saveKeysSecurely(keys: GeneratedKeys, outputPath: string): Promise<void> {
  const content = `# Encryption Keys Generated: ${keys.timestamp}
# Environment: ${keys.environment}
#
# ⚠️ CRITICAL: Keep this file secure and NEVER commit to git!

ENCRYPTION_KEY=${keys.encryptionKey}
ENCRYPTION_SALT=${keys.encryptionSalt}

# Key Metadata
# - Algorithm: AES-256-GCM
# - Key Length: 256 bits (32 bytes)
# - Salt Length: 128 bits (16 bytes)
# - Rotation Recommended: Every 90 days
# - Generated: ${keys.timestamp}
`;

  await fs.writeFile(outputPath, content, { mode: 0o600 }); // Read/write for owner only
  console.log(`✅ Keys saved securely to: ${outputPath}`);
  console.log(`   File permissions: 0600 (owner read/write only)\n`);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    const saveToFile = args.includes('--save') || args.includes('-s');
    const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || '.env.encryption';

    // Generate keys
    const keys = generateKeys();

    // Display keys
    displayKeys(keys);

    // Save to file if requested
    if (saveToFile) {
      const fullPath = path.resolve(process.cwd(), outputPath);
      await saveKeysSecurely(keys, fullPath);

      console.log('⚠️  IMPORTANT: Remember to:');
      console.log(`   1. Copy keys from ${outputPath} to your .env file`);
      console.log(`   2. Delete ${outputPath} after copying`);
      console.log(`   3. Or move it to a secure location (password manager, vault)\n`);
    }

    // Validate .env.example exists
    try {
      await fs.access('.env.example');
      console.log('✅ .env.example found - keys match the expected format');
    } catch {
      console.warn('⚠️  .env.example not found - create it from the template');
    }

    // Check if .env exists
    try {
      await fs.access('.env');
      console.log('✅ .env file found');
      console.log('   ⚠️ If updating keys, remember to:');
      console.log('   1. Backup existing .env');
      console.log('   2. Migrate existing encrypted credentials');
      console.log('   3. Run: npm run migrate:credentials\n');
    } catch {
      console.log('ℹ️  .env file not found - create one from .env.example');
      console.log('   cp .env.example .env\n');
    }

  } catch (error) {
    console.error('\n❌ Error generating keys:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { generateKeys, displayKeys, saveKeysSecurely };
