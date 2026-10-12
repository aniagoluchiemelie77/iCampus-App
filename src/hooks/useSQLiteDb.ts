import { useState, useCallback, useEffect } from 'react';
import { open } from 'react-native-quick-sqlite';

export const db = open({ name: 'app_catalog.db' });
export const setupDatabase = () => {
  try {
    db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        productId TEXT PRIMARY KEY NOT NULL,
        title TEXT,
        description TEXT,
        price REAL,
        sellerId TEXT,
        niche TEXT,
        amountInStock INTEGER,
        mediaUrls TEXT,
        physicalDetails TEXT,
        nationalityOfSeller TEXT
        currency TEXT
        isAvailable BOOLEAN
      );
    `);
    
    db.execute(`
      CREATE INDEX IF NOT EXISTS idx_seller_id ON products (sellerId);
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

export const useSellerProducts = (sellerId?: string) => {
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
      const rows = result.rows;
      const rawProducts = Array.isArray(rows) 
        ? rows 
        : (rows && '_array' in rows ? rows._array : []);
      
      const parsedProducts = rawProducts.map((p: any) => ({
        ...p,
        mediaUrls: p.mediaUrls ? JSON.parse(p.mediaUrls) : [],
        physicalDetails: p.physicalDetails ? JSON.parse(p.physicalDetails) : null,
      }));

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
  }, [fetchSellerProducts]);

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
export const saveProductToLocalDb = (product: {
  productId: string;
  title: string;
  description?: string;
  price: number;
  sellerId: string;
  type: string;
  amountInStock: number;
  mediaUrls: string[];
  physicalDetails?: any;
  nationalityOfSeller?: string;
}) => {
  try {
    db.execute(
      `INSERT OR REPLACE INTO products (
        productId, title, description, price, sellerId, type, amountInStock, mediaUrls, physicalDetails, nationalityOfSeller
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        product.productId,
        product.title,
        product.description || '',
        product.price,
        product.sellerId,
        product.type,
        product.amountInStock || 0,
        JSON.stringify(product.mediaUrls || []),
        JSON.stringify(product.physicalDetails || null),
        product.nationalityOfSeller || '',
      ]
    );
    return true;
  } catch (error) {
    console.error('Failed to save product to local DB:', error);
    throw error;
  }
};
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
    const rows = result.rows;
    const rawRows = Array.isArray(rows) ? rows : (rows && '_array' in rows ? rows._array : []);
    if (rawRows.length > 0 && rawRows[0].formData) {
      return JSON.parse(rawRows[0].formData);
    }
  } catch (err) {
    console.error('Failed to load draft:', err);
  }
  return null;
};

export const clearDraftFromLocalDb = (draftKey: string) => {
  try {
    db.execute(`SELECT * FROM product_drafts WHERE draftKey = ?;`, [draftKey]); // Optional safety check
    db.execute(`DELETE FROM product_drafts WHERE draftKey = ?;`, [draftKey]);
  } catch (err) {
    console.error('Failed to clear draft:', err);
  }
};