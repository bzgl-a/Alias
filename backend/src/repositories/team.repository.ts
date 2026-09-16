import { eq, and } from "drizzle-orm";

import { teams, lobbyMembers } from "../db/schema.js";
import { BaseRepository } from "./base.repository.js";

export class TeamRepository extends BaseRepository {
  async create(params: { lobbyId: string; name: string }) {
    const result = await this.db
      .insert(teams)
      .values({
        lobbyId: params.lobbyId,
        name: params.name,
      })
      .returning();

    return result[0];
  }

  async findById(teamId: string) {
    const result = await this.db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    return result[0];
  }

  async findByLobby(lobbyId: string) {
    return await this.db.select().from(teams).where(eq(teams.lobbyId, lobbyId));
  }

  async rename(teamId: string, name: string) {
    const result = await this.db
      .update(teams)
      .set({ name })
      .where(eq(teams.id, teamId))
      .returning();

    return result[0];
  }

  async delete(teamId: string) {
    const result = await this.db
      .delete(teams)
      .where(eq(teams.id, teamId))
      .returning();

    return result[0];
  }

  async assignMember(params: {
    lobbyId: string;
    userId: string;
    teamId: string | null;
  }) {
    const result = await this.db
      .update(lobbyMembers)
      .set({
        teamId: params.teamId,
      })
      .where(
        and(
          eq(lobbyMembers.lobbyId, params.lobbyId),
          eq(lobbyMembers.userId, params.userId),
        ),
      )
      .returning();

    return result[0];
  }

  async incrementScore(teamId: string, amount: number) {
    const current = await this.findById(teamId);

    if (!current) {
      return undefined;
    }

    const result = await this.db
      .update(teams)
      .set({
        score: current.score + amount,
      })
      .where(eq(teams.id, teamId))
      .returning();

    return result[0];
  }

  async resetScores(lobbyId: string) {
    await this.db
      .update(teams)
      .set({ score: 0 })
      .where(eq(teams.lobbyId, lobbyId));
  }

  async findTeamsWithMembers(lobbyId: string) {
    const rows = await this.db
      .select({
        teamId: teams.id,
        teamName: teams.name,
        userId: lobbyMembers.userId,
      })
      .from(teams)
      .leftJoin(lobbyMembers, eq(lobbyMembers.teamId, teams.id))
      .where(eq(teams.lobbyId, lobbyId));

    const map = new Map<
      string,
      { id: string; name: string; memberIds: string[] }
    >();

    for (const row of rows) {
      if (!map.has(row.teamId)) {
        map.set(row.teamId, {
          id: row.teamId,
          name: row.teamName,
          memberIds: [],
        });
      }

      if (row.userId) {
        map.get(row.teamId)!.memberIds.push(row.userId);
      }
    }

    return Array.from(map.values());
  }
}
