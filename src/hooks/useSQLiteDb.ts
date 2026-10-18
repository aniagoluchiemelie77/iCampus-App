import { useState, useCallback, useEffect } from 'react';
import { open } from 'react-native-quick-sqlite';

export const db = open({ name: 'app_catalog.db' });

/**
 * Canonical column map for the local `products` cache table.
 * `setupDatabase` builds the CREATE TABLE statement from this map and
 * `migrateProductsTable` back-fills any column missing from an older
 * install, so the SQLite schema can never drift from the INSERTs again.
 */
const PRODUCT_COLUMNS: Record<string, string> = {
  productId: 'productId TEXT PRIMARY KEY NOT NULL',
  id: 'id TEXT',
  title: 'title TEXT',
  description: 'description TEXT',
  price: 'price REAL',
  sellerId: 'sellerId TEXT',
  type: 'type TEXT',
  niche: 'niche TEXT',
  category: 'category TEXT',
  currency: 'currency TEXT',
  amountInStock: 'amountInStock INTEGER',
  mediaUrls: 'mediaUrls TEXT',
  physicalDetails: 'physicalDetails TEXT',
  nationalityOfSeller: 'nationalityOfSeller TEXT',
  schoolName: 'schoolName TEXT',
  impressions: 'impressions INTEGER',
  sales: 'sales INTEGER',
  favCount: 'favCount INTEGER',
  ratings: 'ratings TEXT',
  isAvailable: 'isAvailable BOOLEAN',
  createdAt: 'createdAt TEXT',
};

/** Column order used by every INSERT/REPLACE into `products`. */
export const PRODUCT_INSERT_COLUMNS = Object.keys(PRODUCT_COLUMNS);

/** Columns persisted as JSON strings. */
const JSON_COLUMNS = new Set(['mediaUrls', 'physicalDetails', 'ratings']);

/** Safely turns a stored JSON string back into an object/array. */
const safeJsonParse = <T>(value: any, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    const parsed = JSON.parse(value);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
};

/** Converts a JS product field into a SQLite-bindable value. */
const toDbValue = (product: any, column: string): any => {
  const value = product?.[column];
  if (JSON_COLUMNS.has(column)) {
    return JSON.stringify(value === undefined ? null : value);
  }
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
};

/** Normalises a raw SQLite row into the shape the UI expects. */
export const parseProductRow = (row: any) => ({
  ...row,
  price: Number(row?.price) || 0,
  amountInStock: Number(row?.amountInStock) || 0,
  favCount: Number(row?.favCount) || 0,
  impressions: Number(row?.impressions) || 0,
  sales: Number(row?.sales) || 0,
  mediaUrls: safeJsonParse<string[]>(row?.mediaUrls, []),
  physicalDetails: safeJsonParse<any>(row?.physicalDetails, null),
  ratings: safeJsonParse<any[]>(row?.ratings, []),
  isAvailable:
    row?.isAvailable === undefined || row?.isAvailable === null
      ? true
      : !!row.isAvailable,
});

/**
 * react-native-quick-sqlite exposes rows as `{ _array, length, item }`,
 * but some builds hand back a plain array. Normalise both.
 */
const readRows = (result: any): any[] => {
  const rows = result?.rows;
  if (!rows) return [];
  if (Array.isArray(rows)) return rows;
  if ('_array' in rows) return rows._array ?? [];
  return [];
};

/**
 * Back-fills columns added after a release. Older installs already have a
 * `products` table, so `CREATE TABLE IF NOT EXISTS` would silently skip it
 * and every INSERT would keep failing.
 */
const migrateProductsTable = () => {
  try {
    const existing = new Set(
      readRows(db.execute('PRAGMA table_info(products);')).map(
        (column: any) => column.name,
      ),
    );

    Object.entries(PRODUCT_COLUMNS).forEach(([name, ddl]) => {
      if (existing.has(name)) return;
      try {
        db.execute(`ALTER TABLE products ADD COLUMN ${ddl};`);
      } catch (alterError) {
        console.error(`Failed to add column "${name}" to products:`, alterError);
      }
    });
  } catch (error) {
    console.error('Failed to inspect products table for migration:', error);
  }
};

export const setupDatabase = () => {
  try {
    const productColumnDefs = Object.values(PRODUCT_COLUMNS).join(', ');
    db.execute(
      `CREATE TABLE IF NOT EXISTS products (${productColumnDefs});`,
    );
    // Existing installs may still carry the older/broken schema, so back-fill
    // any column that is missing before anything tries to INSERT into it.
    migrateProductsTable();

    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_seller_id ON products (sellerId);
    `);
    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_niche ON products (niche);
    `);
    db.execute(`
      CREATE TABLE IF NOT EXISTS product_drafts (
        draftKey TEXT PRIMARY KEY NOT NULL,
        formData TEXT,
        updatedAt INTEGER
      );
    `);

    db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY NOT NULL,
        firstname TEXT,
        lastname TEXT,
        username TEXT,
        organizationName TEXT,
        profilePic TEXT,
        tier TEXT,
        usertype TEXT,
        isVerified BOOLEAN,
        lastSyncedAt INTEGER
      );
    `);
    console.log('Database tables & indexes initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database tables:', error);
  }
};

/**
 * @param refreshKey pass `catalogSyncVersion` from the app context so the list
 * re-reads SQLite whenever a catalog sync lands (it used to read only once on
 * mount and keep showing stale stock).
 */
export const useSellerProducts = (sellerId?: string, refreshKey?: number) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSellerProducts = useCallback(() => {
    if (!sellerId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = db.execute(
        `SELECT * FROM products WHERE sellerId = ? ORDER BY title ASC;`,
        [sellerId]
      );
      const parsedProducts = readRows(result).map(parseProductRow);

      setProducts(parsedProducts);
    } catch (err: any) {
      console.error('Failed to load seller products from SQLite:', err);
      setError(err?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchSellerProducts();
  }, [fetchSellerProducts, refreshKey]);

  return {
    sellerProducts: products,
    loading,
    error,
    refreshProducts: fetchSellerProducts, 
  };
};

export const deleteProductFromLocalDb = (productId: string) => {
  try {
    db.execute(`DELETE FROM products WHERE productId = ?;`, [productId]);
    return true;
  } catch (error) {
    console.error('Failed to delete product from SQLite database:', error);
    throw error;
  }
};
/**
 * Inserts/updates a single product row.
 *
 * The column list and values are both derived from `PRODUCT_INSERT_COLUMNS`,
 * so adding a field to the schema automatically flows through here — the
 * hand-maintained column list that used to live here was the original source
 * of the "table products has no column named type" crash.
 */
export const upsertProductToLocalDb = (product: any) => {
  try {
    const placeholders = PRODUCT_INSERT_COLUMNS.map(() => '?').join(', ');
    const columnList = PRODUCT_INSERT_COLUMNS.join(', ');
    const values = PRODUCT_INSERT_COLUMNS.map(column =>
      toDbValue(product, column),
    );

    db.execute(
      `INSERT OR REPLACE INTO products (${columnList}) VALUES (${placeholders});`,
      values,
    );
    return true;
  } catch (error) {
    console.error('Failed to save product to local DB:', error);
    throw error;
  }
};

/** @deprecated use {@link upsertProductToLocalDb} */
export const saveProductToLocalDb = (product: any) =>
  upsertProductToLocalDb(product);
export const saveDraftToLocalDb = (draftKey: string, formData: any) => {
  try {
    db.execute(
      `INSERT OR REPLACE INTO product_drafts (draftKey, formData, updatedAt) VALUES (?, ?, ?);`,
      [draftKey, JSON.stringify(formData), Date.now()]
    );
  } catch (err) {
    console.error('Failed to save draft:', err);
  }
};

export const getDraftFromLocalDb = (draftKey: string) => {
  try {
    const result = db.execute(`SELECT formData FROM product_drafts WHERE draftKey = ?;`, [draftKey]);
    const rawRows = readRows(result);
    if (rawRows.length > 0 && rawRows[0].formData) {
      return JSON.parse(rawRows[0].formData);
    }
  } catch (err) {
    console.error('Failed to load draft:', err);
  }
  return null;
};

/**
 * Fetches products by id from the local cache and normalises them.
 *
 * Shared by FavoritesScreen, CartScreen and EventContext so every consumer
 * reads the same columns and parses JSON the same way. Returns `[]` instead
 * of throwing, because an empty cache is a normal state (e.g. the catalog
 * sync has not finished yet) and must not blank the screen.
 */
export const fetchProductsByIdsFromLocalDb = (productIds: string[]) => {
  if (!productIds || productIds.length === 0) return [];

  try {
    const placeholders = productIds.map(() => '?').join(', ');
    const result = db.execute(
      `SELECT * FROM products WHERE productId IN (${placeholders});`,
      productIds,
    );
    return readRows(result).map(parseProductRow);
  } catch (error) {
    console.error('Failed to load products from SQLite:', error);
    return [];
  }
};

export const clearDraftFromLocalDb = (draftKey: string) => {
  try {
    db.execute(`SELECT * FROM product_drafts WHERE draftKey = ?;`, [draftKey]); // Optional safety check
    db.execute(`DELETE FROM product_drafts WHERE draftKey = ?;`, [draftKey]);
  } catch (err) {
    console.error('Failed to clear draft:', err);
  }
};