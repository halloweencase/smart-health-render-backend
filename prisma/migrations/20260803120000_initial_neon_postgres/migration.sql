-- PostgreSQL schema for Neon. Prisma migrations, not application code, own DDL.
CREATE TYPE "Status" AS ENUM ('active', 'inactive');
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'STAFF', 'PATIENT');
CREATE TYPE "AppointmentStatus" AS ENUM ('scheduled', 'completed', 'cancelled');

CREATE TABLE "hospitals" (
  "hospital_id" SERIAL NOT NULL,
  "hospital_name" VARCHAR(255) NOT NULL,
  "registration_number" VARCHAR(100) NOT NULL,
  "email" VARCHAR(180) NOT NULL,
  "phone" VARCHAR(30) NOT NULL,
  "address" TEXT NOT NULL,
  "city" VARCHAR(100) NOT NULL,
  "state" VARCHAR(100) NOT NULL,
  "country" VARCHAR(100) NOT NULL,
  "status" "Status" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hospitals_pkey" PRIMARY KEY ("hospital_id")
);
CREATE UNIQUE INDEX "hospitals_registration_number_unique" ON "hospitals"("registration_number");

CREATE TABLE "users" (
  "id" SERIAL NOT NULL,
  "full_name" VARCHAR(120) NOT NULL,
  "email" VARCHAR(180) NOT NULL,
  "phone" VARCHAR(30) NOT NULL,
  "password" VARCHAR(255) NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'PATIENT',
  "status" "Status" NOT NULL DEFAULT 'active',
  "hospital_id" INTEGER,
  "created_by" INTEGER,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_unique" ON "users"("email");
CREATE INDEX "users_hospital_id_idx" ON "users"("hospital_id");
CREATE INDEX "users_created_by_idx" ON "users"("created_by");
ALTER TABLE "users" ADD CONSTRAINT "users_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("hospital_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "reports" (
  "report_id" SERIAL NOT NULL, "patient_id" INTEGER NOT NULL, "doctor_id" INTEGER,
  "title" VARCHAR(255) NOT NULL, "category" VARCHAR(100) NOT NULL, "hospital_id" INTEGER NOT NULL,
  "notes" TEXT, "file_url" VARCHAR(255), "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reports_pkey" PRIMARY KEY ("report_id")
);
CREATE INDEX "reports_patient_id_idx" ON "reports"("patient_id"); CREATE INDEX "reports_doctor_id_idx" ON "reports"("doctor_id"); CREATE INDEX "reports_hospital_id_idx" ON "reports"("hospital_id");
ALTER TABLE "reports" ADD CONSTRAINT "reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("hospital_id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "prescriptions" (
  "prescription_id" SERIAL NOT NULL, "patient_id" INTEGER NOT NULL, "doctor_id" INTEGER NOT NULL, "hospital_id" INTEGER NOT NULL,
  "diagnosis" TEXT NOT NULL, "medications" TEXT NOT NULL, "notes" TEXT, "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("prescription_id")
);
CREATE INDEX "prescriptions_patient_id_idx" ON "prescriptions"("patient_id"); CREATE INDEX "prescriptions_doctor_id_idx" ON "prescriptions"("doctor_id"); CREATE INDEX "prescriptions_hospital_id_idx" ON "prescriptions"("hospital_id");
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("hospital_id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "appointments" (
  "appointment_id" SERIAL NOT NULL, "patient_id" INTEGER NOT NULL, "doctor_id" INTEGER NOT NULL, "hospital_id" INTEGER NOT NULL,
  "appointment_date" TIMESTAMP(6) NOT NULL, "status" "AppointmentStatus" NOT NULL DEFAULT 'scheduled', "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appointments_pkey" PRIMARY KEY ("appointment_id")
);
CREATE INDEX "appointments_patient_id_idx" ON "appointments"("patient_id"); CREATE INDEX "appointments_doctor_id_idx" ON "appointments"("doctor_id"); CREATE INDEX "appointments_hospital_id_idx" ON "appointments"("hospital_id");
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("hospital_id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "health_metrics" (
  "metric_id" SERIAL NOT NULL, "patient_id" INTEGER NOT NULL, "hospital_id" INTEGER NOT NULL, "heart_rate" INTEGER,
  "blood_sugar" INTEGER, "blood_pressure" VARCHAR(30), "bmi" DECIMAL(5,2), "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "health_metrics_pkey" PRIMARY KEY ("metric_id")
);
CREATE INDEX "health_metrics_patient_id_idx" ON "health_metrics"("patient_id"); CREATE INDEX "health_metrics_hospital_id_idx" ON "health_metrics"("hospital_id");
ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("hospital_id") ON DELETE CASCADE ON UPDATE CASCADE;
