CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lobby_id" uuid NOT NULL,
	"name" varchar(32) NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lobby_members" ADD COLUMN "team_id" uuid;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_lobby_id_lobbies_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "public"."lobbies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_members" ADD CONSTRAINT "lobby_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;