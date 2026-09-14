import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { db } from "../db/index.js";
import * as schema from "../db/schema.js";

export class BaseRepository {
  protected readonly db: PostgresJsDatabase<typeof schema>;

  constructor(database: PostgresJsDatabase<typeof schema> = db) {
    this.db = database;
  }
}
