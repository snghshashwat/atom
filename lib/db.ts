import fs from "node:fs";
import path from "node:path";
import { buildSeed } from "./seed";
import type { DB } from "./types";

// File-based JSON store. Persistent across dev restarts; ephemeral on
// platforms with read-only filesystems (Vercel) — for those, swap for
// a real DB. Demo only.
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

let cache: DB | null = null;

function ensureFile(): DB {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const seed = buildSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw) as DB;
  } catch {
    const seed = buildSeed();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
    return seed;
  }
}

export function getDB(): DB {
  if (!cache) cache = ensureFile();
  return cache;
}

export function saveDB(db: DB): void {
  cache = db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

export function update<T>(mutator: (db: DB) => T): T {
  const db = getDB();
  const result = mutator(db);
  saveDB(db);
  return result;
}

export function resetDB(): void {
  cache = buildSeed();
  saveDB(cache);
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

export function now(): string {
  const db = getDB();
  const t = Date.now() + (db.clockOffsetMs ?? 0);
  return new Date(t).toISOString();
}
