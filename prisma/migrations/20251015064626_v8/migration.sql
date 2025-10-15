/*
  Warnings:

  - A unique constraint covering the columns `[middleName]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "users_middleName_key" ON "users"("middleName");
