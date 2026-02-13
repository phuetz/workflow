-- Migration: Add encryption metadata to Credential model
-- Purpose: Support AES-256-GCM encryption with key rotation
-- Date: 2025-11-15

-- Add new columns for encryption metadata
ALTER TABLE "credentials"
ADD COLUMN IF NOT EXISTS "isEncrypted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "encryptionVersion" TEXT NOT NULL DEFAULT 'v1';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "credentials_isEncrypted_idx" ON "credentials"("isEncrypted");
CREATE INDEX IF NOT EXISTS "credentials_encryptionVersion_idx" ON "credentials"("encryptionVersion");

-- Add comment to document encryption format
COMMENT ON COLUMN "credentials"."data" IS 'Encrypted credential data in format: version:iv:encrypted:authTag (AES-256-GCM)';
COMMENT ON COLUMN "credentials"."isEncrypted" IS 'Flag indicating if data is encrypted (supports migration from plain text)';
COMMENT ON COLUMN "credentials"."encryptionVersion" IS 'Encryption key version (for key rotation support)';
