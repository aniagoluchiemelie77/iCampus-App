import { useState, useCallback, useEffect } from 'react';
import { open } from 'react-native-quick-sqlite';

export const db = open({ name: 'app_catalog.db' });

export const setupDatabase = () => {
  db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      productId TEXT PRIMARY KEY NOT NULL,
      title TEXT,
      description TEXT,
      price REAL,
      sellerId TEXT,
      type TEXT,
      amountInStock INTEGER,
      mediaUrls TEXT, -- stored as JSON string
      physicalDetails TEXT -- stored as JSON string
    );
  `);
  db.execute(`
    CREATE INDEX IF NOT EXISTS idx_seller_id ON products (sellerId);
  `);
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