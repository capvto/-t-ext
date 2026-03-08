CREATE TABLE "pastes" (
    "id" VARCHAR(64) NOT NULL,
    "title" VARCHAR(120) NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "edit_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pastes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pastes_updated_at_idx" ON "pastes"("updated_at");
