CREATE TABLE "lobbies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(6) NOT NULL,
	"host_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lobbies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "lobby_members" (
	"lobby_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_ready" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lobby_members_lobby_id_user_id_pk" PRIMARY KEY("lobby_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "lobbies" ADD CONSTRAINT "lobbies_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_members" ADD CONSTRAINT "lobby_members_lobby_id_lobbies_id_fk" FOREIGN KEY ("lobby_id") REFERENCES "public"."lobbies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_members" ADD CONSTRAINT "lobby_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;