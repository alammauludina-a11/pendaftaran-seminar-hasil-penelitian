// Must be imported before anything that imports src/db: points the app at a fresh temporary SQLite file,
// so tests never touch the database from .env.local.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.DATABASE_URL = `file:${path.join(mkdtempSync(path.join(tmpdir(), "seminar-test-")), "test.db")}`;
delete process.env.DATABASE_AUTH_TOKEN;
