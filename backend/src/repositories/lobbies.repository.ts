import { and, eq } from "drizzle-orm";

import { lobbies, lobbyMembers, users } from "../db/schema.js";
import { BaseRepository } from "./base.repository.js";

export class LobbyRepository extends BaseRepository {
  async findByCode(code: string) {
    const result = await this.db
      .select()
      .from(lobbies)
      .where(eq(lobbies.code, code))
      .limit(1);

    return result[0];
  }

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(lobbies)
      .where(eq(lobbies.id, id))
      .limit(1);

    return result[0];
  }

  async create(code: string, hostId: string) {
    const result = await this.db
      .insert(lobbies)
      .values({ code, hostId })
      .returning();

    return result[0];
  }

  async addMember(lobbyId: string, userId: string) {
    const result = await this.db
      .insert(lobbyMembers)
      .values({ lobbyId, userId })
      .onConflictDoNothing()
      .returning();

    return result[0];
  }

  async removeMember(lobbyId: string, userId: string) {
    await this.db
      .delete(lobbyMembers)
      .where(
        and(eq(lobbyMembers.lobbyId, lobbyId), eq(lobbyMembers.userId, userId)),
      );
  }

  async setReady(lobbyId: string, userId: string, isReady: boolean) {
    const result = await this.db
      .update(lobbyMembers)
      .set({ isReady })
      .where(
        and(eq(lobbyMembers.lobbyId, lobbyId), eq(lobbyMembers.userId, userId)),
      )
      .returning();

    return result[0];
  }

  async findMembers(lobbyId: string) {
    return await this.db
      .select({
        userId: lobbyMembers.userId,
        nickname: users.nickname,
        isReady: lobbyMembers.isReady,
        teamId: lobbyMembers.teamId,
        joinedAt: lobbyMembers.joinedAt,
      })
      .from(lobbyMembers)
      .innerJoin(users, eq(lobbyMembers.userId, users.id))
      .where(eq(lobbyMembers.lobbyId, lobbyId));
  }

  async resetAllReady(lobbyId: string) {
    await this.db
      .update(lobbyMembers)
      .set({ isReady: false })
      .where(eq(lobbyMembers.lobbyId, lobbyId));
  }

  async setStatus(lobbyId: string, status: string) {
    await this.db
      .update(lobbies)
      .set({ status })
      .where(eq(lobbies.id, lobbyId));
  }
}
