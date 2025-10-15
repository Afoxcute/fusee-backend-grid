/*
  Warnings:

  - You are about to drop the column `gridAccountAddress` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `privateKey` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `signerType` on the `admins` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "admins_gridAccountAddress_key";

-- AlterTable
ALTER TABLE "admins" DROP COLUMN "gridAccountAddress",
DROP COLUMN "privateKey",
DROP COLUMN "signerType",
ADD COLUMN     "secretKey" TEXT;

-- DropEnum
DROP TYPE "AdminSignerType";
