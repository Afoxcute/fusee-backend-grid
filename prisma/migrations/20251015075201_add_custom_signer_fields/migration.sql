/*
  Warnings:

  - A unique constraint covering the columns `[publicKey]` on the table `admins` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[gridAccountAddress]` on the table `admins` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AdminSignerType" AS ENUM ('EMAIL_BASED', 'CUSTOM_SIGNER');

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "gridAccountAddress" TEXT,
ADD COLUMN     "privateKey" TEXT,
ADD COLUMN     "publicKey" TEXT,
ADD COLUMN     "signerType" "AdminSignerType" NOT NULL DEFAULT 'CUSTOM_SIGNER';

-- CreateIndex
CREATE UNIQUE INDEX "admins_publicKey_key" ON "admins"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "admins_gridAccountAddress_key" ON "admins"("gridAccountAddress");
