import fs from "node:fs";
import path from "node:path";
import { buildSeed } from "./seed";
import type { DB } from "./types";

// Hybrid store: writes to data/db.json locally (persistent across dev restarts),
// falls back to in-memory on read-only filesystems (Vercel serverless).
// Data persists while the serverless function is warm — evaluators testing within
// one session see all their changes. On cold start the seed re-populates.
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

let cache: DB | null = null;

// Detect if filesystem is writable (fails on Vercel / serverless).
let fsWritable: boolean | null = null;
function canWriteFS(): boolean {
  if (fsWritable !== null) return fsWritable;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const testFile = path.join(DATA_DIR, ".write-test");
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
    fsWritable = true;
  } catch {
    fsWritable = false;
  }
  return fsWritable;
}

function loadFromDisk(): DB | null {
  if (!canWriteFS()) return null;
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as DB;
    }
  } catch { /* ignore */ }
  return null;
}

function writeToDisk(db: DB): void {
  if (!canWriteFS()) return; // silently skip on serverless
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch { /* ignore on read-only FS */ }
}

export function getDB(): DB {
  if (!cache) {
    cache = loadFromDisk() ?? buildSeed();
  }
  return cache;
}

export function saveDB(db: DB): void {
  cache = db;
  writeToDisk(db);
}

export function update<T>(mutator: (db: DB) => T): T {
  const db = getDB();
  const result = mutator(db);
  saveDB(db);
  return result;
}

export function resetDB(): void {
  cache = buildSeed();
  writeToDisk(cache);
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

export function now(): string {
  const db = getDB();
  const t = Date.now() + (db.clockOffsetMs ?? 0);
  return new Date(t).toISOString();
}
