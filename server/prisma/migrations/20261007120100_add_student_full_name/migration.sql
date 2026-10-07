-- Students' full names, shown to employers alongside the University ID.
-- Nullable because accounts created before this column existed have no name.
ALTER TABLE "Student" ADD COLUMN "fullName" TEXT;
