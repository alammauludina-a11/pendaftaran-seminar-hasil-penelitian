// Must be imported before anything that imports src/db: points the app at a fresh temporary SQLite file
// and a temporary upload folder,
// so tests never touch the database from .env.local.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "seminar-test-"));
process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
process.env.UPLOAD_DIR = path.join(dir, "uploads");
delete process.env.DATABASE_AUTH_TOKEN;
