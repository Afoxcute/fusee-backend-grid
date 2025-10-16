/*
  Warnings:

  - You are about to drop the column `secretKey` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `walletAddress` on the `admins` table. All the data in the column will be lost.
  - Made the column `publicKey` on table `admins` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "admins_walletAddress_key";

-- AlterTable
ALTER TABLE "admins" DROP COLUMN "secretKey",
DROP COLUMN "walletAddress",
ALTER COLUMN "publicKey" SET NOT NULL;
