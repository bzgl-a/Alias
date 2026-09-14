CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nickname" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
