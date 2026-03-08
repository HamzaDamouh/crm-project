-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailySalesLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_id" INTEGER,
    "log_date" DATETIME NOT NULL,
    "product_id" INTEGER NOT NULL,
    "qty" REAL NOT NULL,
    "unit_price" REAL NOT NULL,
    "total" REAL NOT NULL,
    "note" TEXT,
    "invoiced" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailySalesLog_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DailySalesLog_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DailySalesLog" ("created_at", "id", "invoiced", "log_date", "note", "product_id", "qty", "total", "unit_price") SELECT "created_at", "id", "invoiced", "log_date", "note", "product_id", "qty", "total", "unit_price" FROM "DailySalesLog";
DROP TABLE "DailySalesLog";
ALTER TABLE "new_DailySalesLog" RENAME TO "DailySalesLog";
CREATE TABLE "new_DebtTransfer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "from_entity_id" INTEGER NOT NULL,
    "to_entity_id" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "related_payment_id" INTEGER,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DebtTransfer_from_entity_id_fkey" FOREIGN KEY ("from_entity_id") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DebtTransfer_to_entity_id_fkey" FOREIGN KEY ("to_entity_id") REFERENCES "Entity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DebtTransfer_related_payment_id_fkey" FOREIGN KEY ("related_payment_id") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DebtTransfer" ("amount", "created_at", "from_entity_id", "id", "note", "related_payment_id", "to_entity_id") SELECT "amount", "created_at", "from_entity_id", "id", "note", "related_payment_id", "to_entity_id" FROM "DebtTransfer";
DROP TABLE "DebtTransfer";
ALTER TABLE "new_DebtTransfer" RENAME TO "DebtTransfer";
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_id" INTEGER,
    "name" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "unit" TEXT,
    "stock_qty" REAL NOT NULL DEFAULT 0,
    "stock_min" REAL NOT NULL DEFAULT 0,
    "tax_rate" REAL NOT NULL DEFAULT 20,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("category_id", "created_at", "description", "id", "is_active", "name", "reference", "stock_min", "stock_qty", "unit") SELECT "category_id", "created_at", "description", "id", "is_active", "name", "reference", "stock_min", "stock_qty", "unit" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
