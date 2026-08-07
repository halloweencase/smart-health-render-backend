CREATE TABLE "visits" (
  "visit_id" SERIAL NOT NULL,
  "patient_id" INTEGER NOT NULL,
  "hospital_id" INTEGER NOT NULL,
  "created_by" INTEGER NOT NULL,
  "visit_date" TIMESTAMP(6) NOT NULL,
  "description" TEXT NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "visits_pkey" PRIMARY KEY ("visit_id")
);

CREATE INDEX "visits_patient_id_idx" ON "visits"("patient_id");
CREATE INDEX "visits_hospital_id_idx" ON "visits"("hospital_id");

ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_id_fkey"
  FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visits" ADD CONSTRAINT "visits_hospital_id_fkey"
  FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("hospital_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visits" ADD CONSTRAINT "visits_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
