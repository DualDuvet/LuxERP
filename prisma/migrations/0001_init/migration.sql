-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('draft', 'confirmed', 'in_production', 'on_hold', 'ready', 'shipped', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "SpecificationLineType" AS ENUM ('group', 'product', 'service', 'comment', 'empty', 'subtotal', 'total', 'discount', 'surcharge');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('prepayment', 'final_payment', 'refund', 'correction');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'card', 'bank_transfer', 'other');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'production', 'accountant', 'viewer');

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_type" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "inn" TEXT,
    "address" TEXT,
    "comment" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "specification_number" TEXT NOT NULL,
    "document_date" DATE NOT NULL,
    "customer_id" TEXT NOT NULL,
    "customer_legal_type" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'draft',
    "production_started_at" DATE,
    "ready_at" DATE,
    "shipped_at" DATE,
    "category_id" TEXT,
    "material_type_id" TEXT,
    "thickness_mm" INTEGER,
    "milling_type_id" TEXT,
    "color_code" TEXT,
    "main_note" TEXT,
    "jointing_note" TEXT,
    "total_area_m2" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "subtotal_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "surcharge_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "prepayment_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "executor_name" TEXT,
    "customer_sign_name" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specification_lines" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "line_type" "SpecificationLineType" NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "height_mm" DECIMAL(10,2),
    "width_mm" DECIMAL(10,2),
    "quantity" DECIMAL(10,3),
    "unit" TEXT,
    "price_per_m2" DECIMAL(12,2),
    "unit_area_m2" DECIMAL(12,6),
    "total_area_m2" DECIMAL(12,6),
    "unit_price" DECIMAL(12,2),
    "total_price" DECIMAL(12,2),
    "is_calculated" BOOLEAN NOT NULL DEFAULT false,
    "is_printed" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specification_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_method" "PaymentMethod",
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,
    "comment" TEXT,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "material_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thicknesses" (
    "id" TEXT NOT NULL,
    "value_mm" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "thicknesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milling_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "milling_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "legal_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "order_id" TEXT,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_specification_number_key" ON "orders"("specification_number");

-- CreateIndex
CREATE INDEX "orders_document_date_idx" ON "orders"("document_date");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "specification_lines_order_id_sort_order_idx" ON "specification_lines"("order_id", "sort_order");

-- CreateIndex
CREATE INDEX "specification_lines_parent_id_idx" ON "specification_lines"("parent_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_idx" ON "order_status_history"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "material_types_name_key" ON "material_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "thicknesses_value_mm_key" ON "thicknesses"("value_mm");

-- CreateIndex
CREATE UNIQUE INDEX "milling_types_name_key" ON "milling_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "legal_types_code_key" ON "legal_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "attachments_order_id_idx" ON "attachments"("order_id");

-- CreateIndex
CREATE INDEX "audit_log_order_id_idx" ON "audit_log"("order_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_material_type_id_fkey" FOREIGN KEY ("material_type_id") REFERENCES "material_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_milling_type_id_fkey" FOREIGN KEY ("milling_type_id") REFERENCES "milling_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specification_lines" ADD CONSTRAINT "specification_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specification_lines" ADD CONSTRAINT "specification_lines_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "specification_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
