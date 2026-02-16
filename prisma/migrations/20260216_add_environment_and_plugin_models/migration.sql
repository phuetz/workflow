-- CreateEnum
CREATE TYPE "EnvironmentType" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION', 'TESTING');
CREATE TYPE "PromotionStatus" AS ENUM ('PENDING', 'TESTING', 'AWAITING_APPROVAL', 'APPROVED', 'PROMOTING', 'COMPLETED', 'FAILED', 'ROLLED_BACK');
CREATE TYPE "PluginStatus" AS ENUM ('ACTIVE', 'DEPRECATED', 'SUSPENDED', 'PENDING_REVIEW');

-- CreateTable: Environment
CREATE TABLE "Environment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "type" "EnvironmentType" NOT NULL DEFAULT 'DEVELOPMENT',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Environment_name_key" ON "Environment"("name");
CREATE INDEX "Environment_type_idx" ON "Environment"("type");

-- CreateTable: EnvironmentVariable
CREATE TABLE "EnvironmentVariable" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvironmentVariable_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnvironmentVariable_environmentId_key_key" ON "EnvironmentVariable"("environmentId", "key");
CREATE INDEX "EnvironmentVariable_environmentId_idx" ON "EnvironmentVariable"("environmentId");

ALTER TABLE "EnvironmentVariable" ADD CONSTRAINT "EnvironmentVariable_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: EnvironmentPromotion
CREATE TABLE "EnvironmentPromotion" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "sourceEnvId" TEXT NOT NULL,
    "targetEnvId" TEXT NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "testResults" JSONB,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "EnvironmentPromotion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnvironmentPromotion_workflowId_idx" ON "EnvironmentPromotion"("workflowId");
CREATE INDEX "EnvironmentPromotion_sourceEnvId_idx" ON "EnvironmentPromotion"("sourceEnvId");
CREATE INDEX "EnvironmentPromotion_targetEnvId_idx" ON "EnvironmentPromotion"("targetEnvId");

ALTER TABLE "EnvironmentPromotion" ADD CONSTRAINT "EnvironmentPromotion_sourceEnvId_fkey" FOREIGN KEY ("sourceEnvId") REFERENCES "Environment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnvironmentPromotion" ADD CONSTRAINT "EnvironmentPromotion_targetEnvId_fkey" FOREIGN KEY ("targetEnvId") REFERENCES "Environment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: Plugin
CREATE TABLE "Plugin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorId" TEXT,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "tags" TEXT[],
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "repository" TEXT,
    "license" TEXT,
    "readme" TEXT,
    "changelog" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "nodeTypes" JSONB NOT NULL DEFAULT '[]',
    "status" "PluginStatus" NOT NULL DEFAULT 'ACTIVE',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plugin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Plugin_name_key" ON "Plugin"("name");
CREATE INDEX "Plugin_category_idx" ON "Plugin"("category");
CREATE INDEX "Plugin_authorId_idx" ON "Plugin"("authorId");

-- CreateTable: PluginInstallation
CREATE TABLE "PluginInstallation" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PluginInstallation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PluginInstallation_pluginId_userId_key" ON "PluginInstallation"("pluginId", "userId");
CREATE INDEX "PluginInstallation_userId_idx" ON "PluginInstallation"("userId");
CREATE INDEX "PluginInstallation_pluginId_idx" ON "PluginInstallation"("pluginId");

ALTER TABLE "PluginInstallation" ADD CONSTRAINT "PluginInstallation_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: PluginReview
CREATE TABLE "PluginReview" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PluginReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PluginReview_pluginId_userId_key" ON "PluginReview"("pluginId", "userId");
CREATE INDEX "PluginReview_pluginId_idx" ON "PluginReview"("pluginId");

ALTER TABLE "PluginReview" ADD CONSTRAINT "PluginReview_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
