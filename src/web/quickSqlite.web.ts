/// <reference lib="dom" />
/**
 * Web stand-in for react-native-quick-sqlite (see metro.config.js).
 *
 * The native package has no browser build, and the no-op stub used to stand
 * in for it made every `db.execute` return no rows, so on web the product
 * cache was always empty (blank Favorites, Cart and Product Detail).
 *
 * This keeps the same synchronous `open().execute(sql, params)` API, so no
 * caller changes. Tables live in memory and are saved to localStorage. It
 * understands the SQL this app uses:
 *
 *   CREATE TABLE / CREATE INDEX / DROP INDEX / ALTER TABLE ... ADD COLUMN
 *   PRAGMA table_info(t)
 *   INSERT [OR REPLACE | OR IGNORE] INTO t (cols) VALUES (?, ...)
 *   SELECT * | cols | COUNT(*) FROM t [WHERE ...] [ORDER BY c [ASC|DESC]]
 *          [LIMIT n [OFFSET m]]
 *   UPDATE t SET c = ?, ... [WHERE ...]
 *   DELETE FROM t [WHERE ...]
 *
 * WHERE supports =, !=, <>, <, <=, >, >=, LIKE (also on LOWER()/UPPER()),
 * IN (...), IS [NOT] NULL, joined by AND / OR (AND binds tighter, no
 * parentheses). Anything else throws, just as SQLite would.
 */

type Row = Record<string, any>;
type Value = string | number | null;

interface TableSchema {
  columns: string[];
  primaryKey: string | null;
}

interface QueryResult {
  rowsAffected: number;
  insertId?: number;
  rows: { _array: Row[]; length: number; item: (index: number) => Row };
}

// Fallback keys if a query runs before CREATE TABLE has been seen.
const KNOWN_PRIMARY_KEYS: Record<string, string> = {
  products: 'productId',
  users: 'uid',
  product_drafts: 'draftKey',
};

const storage: Storage | null = (() => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
})();

const makeResult = (rows: Row[] = [], rowsAffected = 0): QueryResult => ({
  rowsAffected,
  rows: { _array: rows, length: rows.length, item: (i: number) => rows[i] },
});

const unquote = (name: string) => name.trim().replace(/^[`"[]|[`"\]]$/g, '');

/** Splits on commas that are not inside parentheses or quotes. */
const splitTopLevel = (text: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = '';
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
    } else if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
};

/** Hands out bound parameters in the order their `?` appear. */
class ParamCursor {
  private index = 0;
  constructor(private readonly params: any[]) {}
  next(): any {
    if (this.index >= this.params.length) {
      throw new Error('quickSqlite.web: not enough bound parameters');
    }
    return this.params[this.index++];
  }
}

const readValue = (token: string, cursor: ParamCursor): Value => {
  const t = token.trim();
  if (t === '?') return toStored(cursor.next());
  if (/^null$/i.test(t)) return null;
  if (/^'.*'$/.test(t)) return t.slice(1, -1).replace(/''/g, "'");
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  throw new Error(`quickSqlite.web: unsupported value "${t}"`);
};

/** SQLite has no booleans or objects; store what it would store. */
const toStored = (value: any): Value => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number' || typeof value === 'string') return value;
  return JSON.stringify(value);
};

const isNumeric = (v: Value) =>
  typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)));

/** -1 / 0 / 1, NULLs first like SQLite. */
const compare = (a: Value, b: Value): number => {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (isNumeric(a) && isNumeric(b) && (typeof a === 'number' || typeof b === 'number')) {
    return Number(a) - Number(b);
  }
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
};

const likeToRegExp = (pattern: string) =>
  new RegExp(
    `^${pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/%/g, '.*')
      .replace(/_/g, '.')}$`,
    'is', // SQLite LIKE is case-insensitive for ASCII
  );

type Condition = (row: Row) => boolean;

/** Column reference, optionally wrapped in LOWER()/UPPER(). */
const columnGetter = (expr: string): ((row: Row) => Value) => {
  const fn = expr.trim().match(/^(LOWER|UPPER)\s*\(\s*([\w`"]+)\s*\)$/i);
  if (fn) {
    const col = unquote(fn[2]);
    const lower = fn[1].toUpperCase() === 'LOWER';
    return row => {
      const v = row[col];
      if (v === null || v === undefined) return null;
      return lower ? String(v).toLowerCase() : String(v).toUpperCase();
    };
  }
  const col = unquote(expr);
  if (!/^[\w]+$/.test(col)) {
    throw new Error(`quickSqlite.web: unsupported expression "${expr}"`);
  }
  return row => (row[col] === undefined ? null : row[col]);
};

const parseCondition = (text: string, cursor: ParamCursor): Condition => {
  const t = text.trim();
  let m = t.match(/^(.+?)\s+IS\s+(NOT\s+)?NULL$/i);
  if (m) {
    const get = columnGetter(m[1]);
    const negate = !!m[2];
    return row => (get(row) === null) !== negate;
  }
  m = t.match(/^(.+?)\s+(NOT\s+)?IN\s*\((.*)\)$/i);
  if (m) {
    const get = columnGetter(m[1]);
    const negate = !!m[2];
    const values = splitTopLevel(m[3]).map(v => readValue(v, cursor));
    return row => {
      const v = get(row);
      if (v === null) return false;
      return values.some(x => compare(v, x) === 0) !== negate;
    };
  }
  m = t.match(/^(.+?)\s+(NOT\s+)?LIKE\s+(.+)$/i);
  if (m) {
    const get = columnGetter(m[1]);
    const negate = !!m[2];
    const pattern = readValue(m[3], cursor);
    const re = likeToRegExp(String(pattern ?? ''));
    return row => {
      const v = get(row);
      if (v === null || pattern === null) return false;
      return re.test(String(v)) !== negate;
    };
  }
  m = t.match(/^(.+?)\s*(<=|>=|!=|<>|=|<|>)\s*(.+)$/);
  if (m) {
    const get = columnGetter(m[1]);
    const op = m[2];
    const value = readValue(m[3], cursor);
    return row => {
      const v = get(row);
      if (v === null || value === null) return false; // NULL compares unknown
      const c = compare(v, value);
      switch (op) {
        case '=':
          return c === 0;
        case '!=':
        case '<>':
          return c !== 0;
        case '<':
          return c < 0;
        case '<=':
          return c <= 0;
        case '>':
          return c > 0;
        default:
          return c >= 0;
      }
    };
  }
  throw new Error(`quickSqlite.web: unsupported WHERE condition "${t}"`);
};

/** OR of ANDs, parsed left to right so `?` bind in order. */
const parseWhere = (text: string | undefined, cursor: ParamCursor): Condition => {
  if (!text || !text.trim()) return () => true;
  const groups = text
    .split(/\s+OR\s+/i)
    .map(group => group.split(/\s+AND\s+/i).map(c => parseCondition(c, cursor)));
  return row => groups.some(conds => conds.every(cond => cond(row)));
};

class WebDatabase {
  private readonly tables = new Map<string, Map<string, Row>>();
  private readonly schemas = new Map<string, TableSchema>();
  private readonly dirty = new Set<string>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private autoKey = 0;

  constructor(private readonly name: string) {
    if (typeof window !== 'undefined') {
      // Don't lose the last writes when the tab closes.
      window.addEventListener('pagehide', () => this.flush());
    }
  }

  private storageKey(table: string) {
    return `quicksqlite:${this.name}:${table}`;
  }

  private schemaFor(table: string): TableSchema {
    let schema = this.schemas.get(table);
    if (!schema) {
      schema = { columns: [], primaryKey: KNOWN_PRIMARY_KEYS[table] ?? null };
      this.schemas.set(table, schema);
    }
    return schema;
  }

  private table(name: string): Map<string, Row> {
    let table = this.tables.get(name);
    if (table) return table;
    table = new Map();
    try {
      const raw = storage?.getItem(this.storageKey(name));
      const rows: Row[] = raw ? JSON.parse(raw) : [];
      const pk = this.schemaFor(name).primaryKey;
      rows.forEach(row => {
        table!.set(pk ? String(row[pk]) : String(++this.autoKey), row);
      });
    } catch (error) {
      console.warn(`quickSqlite.web: could not read table "${name}"`, error);
    }
    this.tables.set(name, table);
    return table;
  }

  private markDirty(table: string) {
    this.dirty.add(table);
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => this.flush(), 250);
  }

  flush() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.dirty.forEach(name => {
      const rows = Array.from(this.tables.get(name)?.values() ?? []);
      try {
        storage?.setItem(this.storageKey(name), JSON.stringify(rows));
      } catch (error) {
        // Usually the ~5MB quota. Drop the stale copy rather than keeping an
        // old one; the data still works for this session, and the catalog
        // sync refills an empty cache on the next load.
        try {
          storage?.removeItem(this.storageKey(name));
        } catch {}
        console.warn(`quickSqlite.web: could not save table "${name}"`, error);
      }
    });
    this.dirty.clear();
  }

  execute(sql: string, params: any[] = []): QueryResult {
    const text = sql.trim().replace(/\s+/g, ' ').replace(/;\s*$/, '');
    const cursor = new ParamCursor(params ?? []);
    let m: RegExpMatchArray | null;

    if ((m = text.match(/^CREATE TABLE (?:IF NOT EXISTS )?([\w`"]+) ?\((.*)\)$/i))) {
      const tableName = unquote(m[1]);
      const schema = this.schemaFor(tableName);
      splitTopLevel(m[2]).forEach(def => {
        const col = unquote(def.split(' ')[0]);
        if (/^(PRIMARY|UNIQUE|FOREIGN|CHECK|CONSTRAINT)$/i.test(col)) return;
        if (!schema.columns.includes(col)) schema.columns.push(col);
        if (/PRIMARY KEY/i.test(def)) schema.primaryKey = col;
      });
      this.table(tableName);
      return makeResult();
    }
    if (/^(CREATE (UNIQUE )?INDEX|DROP INDEX|BEGIN|COMMIT|ROLLBACK|VACUUM)\b/i.test(text)) {
      return makeResult();
    }
    if ((m = text.match(/^DROP TABLE (?:IF EXISTS )?([\w`"]+)$/i))) {
      const tableName = unquote(m[1]);
      this.tables.set(tableName, new Map());
      this.markDirty(tableName);
      return makeResult();
    }
    if ((m = text.match(/^ALTER TABLE ([\w`"]+) ADD (?:COLUMN )?([\w`"]+)/i))) {
      const schema = this.schemaFor(unquote(m[1]));
      const col = unquote(m[2]);
      if (!schema.columns.includes(col)) schema.columns.push(col);
      return makeResult();
    }
    if ((m = text.match(/^PRAGMA table_info\s*\(\s*([\w`"']+)\s*\)$/i))) {
      const schema = this.schemaFor(unquote(m[1].replace(/'/g, '')));
      return makeResult(
        schema.columns.map((name, cid) => ({ cid, name, pk: name === schema.primaryKey ? 1 : 0 })),
      );
    }
    if (
      (m = text.match(
        /^INSERT (?:OR (REPLACE|IGNORE) )?INTO ([\w`"]+) ?\((.*?)\) VALUES ?\((.*)\)$/i,
      ))
    ) {
      return this.insert(unquote(m[2]), m[1]?.toUpperCase(), m[3], m[4], cursor);
    }
    if ((m = text.match(/^REPLACE INTO ([\w`"]+) ?\((.*?)\) VALUES ?\((.*)\)$/i))) {
      return this.insert(unquote(m[1]), 'REPLACE', m[2], m[3], cursor);
    }
    if (
      (m = text.match(
        /^SELECT (.+?) FROM ([\w`"]+)(?: WHERE (.+?))?(?: ORDER BY (.+?))?(?: LIMIT (\S+)(?: OFFSET (\S+))?)?$/i,
      ))
    ) {
      return this.select(m, cursor);
    }
    if ((m = text.match(/^UPDATE ([\w`"]+) SET (.+?)(?: WHERE (.+))?$/i))) {
      const tableName = unquote(m[1]);
      const assignments = splitTopLevel(m[2]).map(part => {
        const [col, ...rest] = part.split('=');
        return { col: unquote(col), value: readValue(rest.join('='), cursor) };
      });
      const where = parseWhere(m[3], cursor);
      let count = 0;
      this.table(tableName).forEach(row => {
        if (!where(row)) return;
        assignments.forEach(({ col, value }) => (row[col] = value));
        count++;
      });
      if (count) this.markDirty(tableName);
      return makeResult([], count);
    }
    if ((m = text.match(/^DELETE FROM ([\w`"]+)(?: WHERE (.+))?$/i))) {
      const tableName = unquote(m[1]);
      const where = parseWhere(m[2], cursor);
      const table = this.table(tableName);
      let count = 0;
      Array.from(table.entries()).forEach(([key, row]) => {
        if (where(row)) {
          table.delete(key);
          count++;
        }
      });
      if (count) this.markDirty(tableName);
      return makeResult([], count);
    }
    throw new Error(`quickSqlite.web: unsupported statement "${text.slice(0, 80)}"`);
  }

  private insert(
    tableName: string,
    conflict: string | undefined,
    columnsText: string,
    valuesText: string,
    cursor: ParamCursor,
  ): QueryResult {
    const columns = splitTopLevel(columnsText).map(unquote);
    const values = splitTopLevel(valuesText).map(v => readValue(v, cursor));
    if (columns.length !== values.length) {
      throw new Error(
        `quickSqlite.web: ${columns.length} columns but ${values.length} values for ${tableName}`,
      );
    }
    const schema = this.schemaFor(tableName);
    const row: Row = {};
    // Columns not named in the INSERT are NULL, as in SQLite.
    schema.columns.forEach(col => (row[col] = null));
    columns.forEach((col, i) => (row[col] = values[i]));

    const pk = schema.primaryKey;
    const key = pk ? row[pk] : null;
    if (pk && (key === null || key === undefined)) {
      throw new Error(`quickSqlite.web: NOT NULL constraint failed: ${tableName}.${pk}`);
    }
    const table = this.table(tableName);
    const mapKey = pk ? String(key) : String(++this.autoKey);
    if (table.has(mapKey)) {
      if (conflict === 'IGNORE') return makeResult([], 0);
      if (conflict !== 'REPLACE') {
        throw new Error(`quickSqlite.web: UNIQUE constraint failed: ${tableName}.${pk}`);
      }
    }
    table.set(mapKey, row);
    this.markDirty(tableName);
    const result = makeResult([], 1);
    result.insertId = table.size;
    return result;
  }

  private select(m: RegExpMatchArray, cursor: ParamCursor): QueryResult {
    const [, columnsText, rawTable, whereText, orderText, limitText, offsetText] = m;
    const tableName = unquote(rawTable);
    const where = parseWhere(whereText, cursor);
    let rows = Array.from(this.table(tableName).values()).filter(where);

    if (orderText) {
      const keys = splitTopLevel(orderText).map(part => {
        const [expr, dir] = part.trim().split(/\s+(?=ASC$|DESC$)/i);
        return { get: columnGetter(expr), desc: /^DESC$/i.test(dir || '') };
      });
      rows = rows.slice().sort((a, b) => {
        for (const { get, desc } of keys) {
          const c = compare(get(a), get(b));
          if (c !== 0) return desc ? -c : c;
        }
        return 0;
      });
    }
    if (limitText) {
      const limit = Number(readValue(limitText, cursor));
      const offset = offsetText ? Number(readValue(offsetText, cursor)) : 0;
      rows = rows.slice(offset, limit < 0 ? undefined : offset + limit);
    }

    const cols = columnsText.trim();
    if (/^COUNT\s*\(\s*\*\s*\)(\s+AS\s+(\w+))?$/i.test(cols)) {
      const alias = cols.match(/AS\s+(\w+)$/i)?.[1] ?? 'COUNT(*)';
      return makeResult([{ [alias]: rows.length }]);
    }
    if (cols === '*') return makeResult(rows.map(row => ({ ...row })));
    const picked = splitTopLevel(cols).map(unquote);
    return makeResult(
      rows.map(row => {
        const out: Row = {};
        picked.forEach(col => (out[col] = row[col] === undefined ? null : row[col]));
        return out;
      }),
    );
  }
}

const databases = new Map<string, WebDatabase>();

export const open = ({ name }: { name: string; location?: string }) => {
  let database = databases.get(name);
  if (!database) {
    database = new WebDatabase(name);
    databases.set(name, database);
  }
  const dbRef = database;
  const connection = {
    execute: (sql: string, params?: any[]) => dbRef.execute(sql, params),
    executeAsync: async (sql: string, params?: any[]) => dbRef.execute(sql, params),
    executeBatch: (commands: [string, any[]?][]): { rowsAffected: number } => {
      let rowsAffected = 0;
      commands.forEach(([sql, params]) => {
        rowsAffected += dbRef.execute(sql, params ?? []).rowsAffected;
      });
      return { rowsAffected };
    },
    executeBatchAsync: async (commands: [string, any[]?][]): Promise<{ rowsAffected: number }> =>
      connection.executeBatch(commands),
    transaction: async (fn: (tx: { execute: WebDatabase['execute'] }) => any): Promise<void> => {
      await fn({ execute: (sql: string, params?: any[]) => dbRef.execute(sql, params) });
    },
    close: () => dbRef.flush(),
    delete: () => {},
    attach: () => {},
    detach: () => {},
    loadFile: async () => ({ rowsAffected: 0 }),
  };
  return connection;
};

export const QuickSQLite = { open };
export default { open, QuickSQLite };
