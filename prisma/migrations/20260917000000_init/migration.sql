-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'USER');

-- CreateEnum
CREATE TYPE "ClientSource" AS ENUM ('TELEGRAM', 'INSTAGRAM', 'FRIEND', 'REPEAT_CLIENT', 'OTHER');

-- CreateEnum
CREATE TYPE "FilamentMaterial" AS ENUM ('PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'DESIGN', 'PRINTING', 'PRINTED', 'POST_PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FILAMENT', 'ELECTRICITY', 'PRINTER_PARTS', 'TOOLS', 'SOFT', 'DELIVERY', 'ADS', 'SCRAP', 'OTHER');

-- CreateEnum
CREATE TYPE "ScrapReason" AS ENUM ('LAYER_SHIFT', 'BED_ADHESION', 'CLOG', 'WARPING', 'STRINGING', 'DIMENSIONAL_ERROR', 'PURGE_WASTE', 'CALIBRATION', 'MODEL_ERROR', 'OTHER');

-- CreateEnum
CREATE TYPE "PrinterManufacturer" AS ENUM ('BAMBU_LAB', 'ANYCUBIC', 'OTHER');

-- CreateEnum
CREATE TYPE "PrinterIntegrationType" AS ENUM ('MANUAL', 'BAMBUDDY', 'ANYCUBIC', 'OTHER');

-- CreateEnum
CREATE TYPE "PrintJobStatus" AS ENUM ('QUEUED', 'PRINTING', 'PAUSED', 'FINISHED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "telegram_id" BIGINT NOT NULL,
    "telegram_username" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "telegram_username" TEXT,
    "instagram_username" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "source" "ClientSource" NOT NULL DEFAULT 'OTHER',
    "notes" TEXT,
    "metadata" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filaments" (
    "id" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "material" "FilamentMaterial" NOT NULL DEFAULT 'PLA',
    "color" TEXT,
    "price_per_spool" INTEGER NOT NULL,
    "spool_weight_g" INTEGER NOT NULL,
    "cost_per_gram" DECIMAL(10,4) NOT NULL,
    "stock_g" INTEGER,
    "notes" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "model_url" TEXT,
    "image_url" TEXT,
    "size_x_mm" INTEGER,
    "size_y_mm" INTEGER,
    "size_z_mm" INTEGER,
    "print_time_minutes" INTEGER,
    "default_cost" INTEGER NOT NULL DEFAULT 0,
    "default_price" INTEGER NOT NULL DEFAULT 0,
    "weight_g" INTEGER NOT NULL DEFAULT 0,
    "extra_cost" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "metadata" JSONB,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_filaments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "filament_id" UUID NOT NULL,
    "grams" INTEGER NOT NULL,

    CONSTRAINT "project_filaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" SERIAL NOT NULL,
    "client_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deadline" TIMESTAMP(3),
    "calculated_cost" INTEGER NOT NULL DEFAULT 0,
    "calculated_price" INTEGER NOT NULL DEFAULT 0,
    "final_price" INTEGER NOT NULL DEFAULT 0,
    "comment" TEXT,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "project_id" UUID,
    "project_name_snapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_cost" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "total_cost" INTEGER NOT NULL,
    "total_price" INTEGER NOT NULL,
    "comment" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" INTEGER NOT NULL,
    "order_id" UUID,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "printers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" "PrinterManufacturer" NOT NULL DEFAULT 'BAMBU_LAB',
    "model" TEXT NOT NULL,
    "serial_number" TEXT,
    "ip_address" TEXT,
    "access_code" TEXT,
    "integration_type" "PrinterIntegrationType" NOT NULL DEFAULT 'BAMBUDDY',
    "external_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_status" TEXT,
    "last_seen_at" TIMESTAMP(3),
    "nozzle_temp" DOUBLE PRECISION,
    "bed_temp" DOUBLE PRECISION,
    "print_progress" INTEGER,
    "remaining_minutes" INTEGER,
    "current_file" TEXT,
    "initial_work_hours" DOUBLE PRECISION DEFAULT 0,
    "tracked_work_minutes" DOUBLE PRECISION DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "printers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_jobs" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID,
    "printer_id" UUID NOT NULL,
    "status" "PrintJobStatus" NOT NULL DEFAULT 'QUEUED',
    "quantity" INTEGER,
    "estimated_time_minutes" INTEGER,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "external_job_id" TEXT,
    "filename" TEXT,
    "comment" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scrap_records" (
    "id" UUID NOT NULL,
    "filament_id" UUID NOT NULL,
    "order_id" UUID,
    "order_item_id" UUID,
    "printer_id" UUID,
    "print_job_id" UUID,
    "grams" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "reason" "ScrapReason" NOT NULL DEFAULT 'OTHER',
    "comment" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scrap_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_events" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "user_id" UUID,
    "event_type" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");

-- CreateIndex
CREATE INDEX "clients_name_idx" ON "clients"("name");

-- CreateIndex
CREATE INDEX "projects_name_idx" ON "projects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_deadline_idx" ON "orders"("deadline");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "orders_client_id_idx" ON "orders"("client_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "print_jobs_printer_id_idx" ON "print_jobs"("printer_id");

-- CreateIndex
CREATE INDEX "print_jobs_status_idx" ON "print_jobs"("status");

-- CreateIndex
CREATE INDEX "scrap_records_filament_id_idx" ON "scrap_records"("filament_id");

-- CreateIndex
CREATE INDEX "scrap_records_order_id_idx" ON "scrap_records"("order_id");

-- CreateIndex
CREATE INDEX "scrap_records_printer_id_idx" ON "scrap_records"("printer_id");

-- CreateIndex
CREATE INDEX "scrap_records_created_at_idx" ON "scrap_records"("created_at");

-- AddForeignKey
ALTER TABLE "project_filaments" ADD CONSTRAINT "project_filaments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_filaments" ADD CONSTRAINT "project_filaments_filament_id_fkey" FOREIGN KEY ("filament_id") REFERENCES "filaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "printers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrap_records" ADD CONSTRAINT "scrap_records_filament_id_fkey" FOREIGN KEY ("filament_id") REFERENCES "filaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrap_records" ADD CONSTRAINT "scrap_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrap_records" ADD CONSTRAINT "scrap_records_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrap_records" ADD CONSTRAINT "scrap_records_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "printers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrap_records" ADD CONSTRAINT "scrap_records_print_job_id_fkey" FOREIGN KEY ("print_job_id") REFERENCES "print_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scrap_records" ADD CONSTRAINT "scrap_records_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
