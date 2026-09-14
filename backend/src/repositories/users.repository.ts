import { eq } from "drizzle-orm";

import { users } from "../db/schema.js";
import { BaseRepository } from "./base.repository.js";

export class UserRepository extends BaseRepository {
  async findById(id: string) {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0];
  }

  async findUsers() {
    return await this.db.select().from(users);
  }

  async create(nickname: string) {
    const result = await this.db
      .insert(users)
      .values({
        nickname,
      })
      .returning();

    return result[0];
  }

  async updateNickname(id: string, nickname: string) {
    const result = await this.db
      .update(users)
      .set({
        nickname,
      })
      .where(eq(users.id, id))
      .returning();

    return result[0];
  }
}
