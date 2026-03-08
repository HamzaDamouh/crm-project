-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Entity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "ice" TEXT,
    "credit_limit" REAL,
    "balance_due" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Entity" ("address", "created_at", "credit_limit", "email", "ice", "id", "is_active", "name", "notes", "phone", "type") SELECT "address", "created_at", "credit_limit", "email", "ice", "id", "is_active", "name", "notes", "phone", "type" FROM "Entity";
DROP TABLE "Entity";
ALTER TABLE "new_Entity" RENAME TO "Entity";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
