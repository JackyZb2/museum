-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_narrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "museumAssetId" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'GENERAL',
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'zh-CN',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sourceDocumentIds" TEXT NOT NULL DEFAULT '[]',
    "sourceReference" TEXT,
    "generationSource" TEXT NOT NULL DEFAULT 'model',
    "isLimited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "narrations_museumAssetId_fkey" FOREIGN KEY ("museumAssetId") REFERENCES "museum_assets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_narrations" ("content", "createdAt", "id", "language", "museumAssetId", "status", "title", "updatedAt") SELECT "content", "createdAt", "id", "language", "museumAssetId", "status", "title", "updatedAt" FROM "narrations";
DROP TABLE "narrations";
ALTER TABLE "new_narrations" RENAME TO "narrations";
CREATE INDEX "narrations_museumAssetId_idx" ON "narrations"("museumAssetId");
CREATE UNIQUE INDEX "narrations_museumAssetId_variant_version_key" ON "narrations"("museumAssetId", "variant", "version");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
