import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  nickname: varchar("nickname", {
    length: 32,
  }).notNull(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export const lobbies = pgTable("lobbies", {
  id: uuid("id").primaryKey().defaultRandom(),

  code: varchar("code", {
    length: 6,
  })
    .notNull()
    .unique(),

  hostId: uuid("host_id")
    .notNull()
    .references(() => users.id),

  status: varchar("status", { length: 16 }).notNull().default("waiting"),

  roundSeconds: integer("round_seconds").notNull().default(60),
  targetScore: integer("target_score").notNull().default(30),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),

  lobbyId: uuid("lobby_id")
    .notNull()
    .references(() => lobbies.id, {
      onDelete: "cascade",
    }),

  name: varchar("name", {
    length: 32,
  }).notNull(),

  score: integer("score").notNull().default(0),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export const lobbyMembers = pgTable(
  "lobby_members",
  {
    lobbyId: uuid("lobby_id")
      .notNull()
      .references(() => lobbies.id, {
        onDelete: "cascade",
      }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    teamId: uuid("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),

    isReady: boolean("is_ready").default(false).notNull(),

    joinedAt: timestamp("joined_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  table => ({
    pk: primaryKey({
      columns: [table.lobbyId, table.userId],
    }),
  }),
);
