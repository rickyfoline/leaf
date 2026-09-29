/// <reference types="node" />
// Runs the app's SQL on Node's built-in SQLite so the database layer can be tested without a phone.
import { DatabaseSync } from 'node:sqlite';

import type { BindValue, Db } from '@/db/types';

export function openTestDb(): Db {
  const db = new DatabaseSync(':memory:');
  let depth = 0;
  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, params: BindValue[]) {
      const r = db.prepare(source).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getFirstAsync<T>(source: string, params: BindValue[]) {
      return (db.prepare(source).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(source: string, params: BindValue[]) {
      return db.prepare(source).all(...params) as T[];
    },
    async withTransactionAsync(task) {
      if (depth++ === 0) db.exec('BEGIN');
      try {
        await task();
        if (depth === 1) db.exec('COMMIT');
      } catch (e) {
        if (depth === 1) db.exec('ROLLBACK');
        throw e;
      } finally {
        depth--;
      }
    },
  };
}
