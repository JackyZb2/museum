CREATE TABLE "museums" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "museum_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "museumId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inventoryNumber" TEXT,
    "category" TEXT,
    "dynasty" TEXT,
    "material" TEXT,
    "dimensions" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "authorizationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "museum_assets_status_check" CHECK ("status" IN ('DRAFT', 'PROCESSING', 'REVIEW_REQUIRED', 'APPROVED', 'PUBLISHED')),
    CONSTRAINT "museum_assets_museumId_fkey" FOREIGN KEY ("museumId") REFERENCES "museums" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "source_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "museumAssetId" TEXT,
    "title" TEXT NOT NULL,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "documentType" TEXT,
    "source" TEXT,
    "extractedText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "source_documents_museumAssetId_fkey" FOREIGN KEY ("museumAssetId") REFERENCES "museum_assets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "asset_metadata" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "museumAssetId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "asset_metadata_museumAssetId_fkey" FOREIGN KEY ("museumAssetId") REFERENCES "museum_assets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "narrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "museumAssetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'zh-CN',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "narrations_museumAssetId_fkey" FOREIGN KEY ("museumAssetId") REFERENCES "museum_assets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "museum_assets_inventoryNumber_key" ON "museum_assets"("inventoryNumber");
CREATE INDEX "museum_assets_museumId_idx" ON "museum_assets"("museumId");
CREATE INDEX "museum_assets_status_idx" ON "museum_assets"("status");
CREATE INDEX "source_documents_museumAssetId_idx" ON "source_documents"("museumAssetId");
CREATE INDEX "asset_metadata_museumAssetId_idx" ON "asset_metadata"("museumAssetId");
CREATE UNIQUE INDEX "asset_metadata_museumAssetId_key_key" ON "asset_metadata"("museumAssetId", "key");
CREATE INDEX "narrations_museumAssetId_idx" ON "narrations"("museumAssetId");
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
