ALTER TABLE "lobbies" ADD COLUMN "status" varchar(16) DEFAULT 'waiting' NOT NULL;--> statement-breakpoint
ALTER TABLE "lobbies" ADD COLUMN "round_seconds" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "lobbies" ADD COLUMN "target_score" integer DEFAULT 30 NOT NULL;