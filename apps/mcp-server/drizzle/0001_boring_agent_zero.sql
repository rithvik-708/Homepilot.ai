CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raw_prompt" text NOT NULL,
	"intent_detected" varchar(64) DEFAULT 'analyzing' NOT NULL,
	"bedrock_model_id" varchar(128) NOT NULL,
	"execution_status" varchar(32) DEFAULT 'running' NOT NULL,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_tool_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"tool_name" varchar(64) NOT NULL,
	"input_payload" jsonb,
	"output_payload" jsonb,
	"execution_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_tool_calls" ADD CONSTRAINT "agent_tool_calls_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tool_calls_run" ON "agent_tool_calls" USING btree ("run_id","execution_order");