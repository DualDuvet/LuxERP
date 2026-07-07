ALTER TABLE "orders"
ADD COLUMN "delivery_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "delivery_address" TEXT;
