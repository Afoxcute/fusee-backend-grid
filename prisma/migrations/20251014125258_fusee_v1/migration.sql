/*
  Warnings:

  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `balance` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `hasMultisig` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `multisigCreateKey` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `multisigPda` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `multisigThreshold` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `multisigTimeLock` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `solanaWallet` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `deposits` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `external_fees` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `external_transfers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fees` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `multisig_approvals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `multisig_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `multisig_proposals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `multisig_transactions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `multisig_transfer_proposal_approvals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `multisig_transfer_proposals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `multisigs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `transfers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `treasury_operations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `vaults` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallet_fees` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallet_transfers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `withdrawals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `yield_investments` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[middleName]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[walletAddress]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `lastName` to the `users` table without a default value. This is not possible if the table is not empty.
  - Made the column `firstName` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AdminPermission" AS ENUM ('CAN_VOTE', 'CAN_EXECUTE', 'CAN_MANAGE_USERS', 'CAN_MANAGE_ADMINS');

-- DropForeignKey
ALTER TABLE "deposits" DROP CONSTRAINT "deposits_userId_fkey";

-- DropForeignKey
ALTER TABLE "deposits" DROP CONSTRAINT "deposits_vaultId_fkey";

-- DropForeignKey
ALTER TABLE "external_fees" DROP CONSTRAINT "external_fees_externalTransferId_fkey";

-- DropForeignKey
ALTER TABLE "external_transfers" DROP CONSTRAINT "external_transfers_userId_fkey";

-- DropForeignKey
ALTER TABLE "fees" DROP CONSTRAINT "fees_transferId_fkey";

-- DropForeignKey
ALTER TABLE "fees" DROP CONSTRAINT "fees_vaultId_fkey";

-- DropForeignKey
ALTER TABLE "multisig_approvals" DROP CONSTRAINT "multisig_approvals_memberId_fkey";

-- DropForeignKey
ALTER TABLE "multisig_approvals" DROP CONSTRAINT "multisig_approvals_multisigTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "multisig_members" DROP CONSTRAINT "multisig_members_multisigId_fkey";

-- DropForeignKey
ALTER TABLE "multisig_members" DROP CONSTRAINT "multisig_members_userId_fkey";

-- DropForeignKey
ALTER TABLE "multisig_proposals" DROP CONSTRAINT "multisig_proposals_multisigTransactionId_fkey";

-- DropForeignKey
ALTER TABLE "multisig_transactions" DROP CONSTRAINT "multisig_transactions_multisigId_fkey";

-- DropForeignKey
ALTER TABLE "multisig_transfer_proposal_approvals" DROP CONSTRAINT "multisig_transfer_proposal_approvals_memberId_fkey";

-- DropForeignKey
ALTER TABLE "multisig_transfer_proposal_approvals" DROP CONSTRAINT "multisig_transfer_proposal_approvals_proposalId_fkey";

-- DropForeignKey
ALTER TABLE "transfers" DROP CONSTRAINT "transfers_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "transfers" DROP CONSTRAINT "transfers_senderId_fkey";

-- DropForeignKey
ALTER TABLE "treasury_operations" DROP CONSTRAINT "treasury_operations_vaultId_fkey";

-- DropForeignKey
ALTER TABLE "wallet_fees" DROP CONSTRAINT "wallet_fees_walletTransferId_fkey";

-- DropForeignKey
ALTER TABLE "withdrawals" DROP CONSTRAINT "withdrawals_userId_fkey";

-- DropForeignKey
ALTER TABLE "withdrawals" DROP CONSTRAINT "withdrawals_vaultId_fkey";

-- DropForeignKey
ALTER TABLE "yield_investments" DROP CONSTRAINT "yield_investments_userId_fkey";

-- DropIndex
DROP INDEX "users_multisigCreateKey_key";

-- DropIndex
DROP INDEX "users_multisigPda_key";

-- DropIndex
DROP INDEX "users_solanaWallet_key";

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "balance",
DROP COLUMN "fullName",
DROP COLUMN "hasMultisig",
DROP COLUMN "multisigCreateKey",
DROP COLUMN "multisigPda",
DROP COLUMN "multisigThreshold",
DROP COLUMN "multisigTimeLock",
DROP COLUMN "solanaWallet",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "walletAddress" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "firstName" SET NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "users_id_seq";

-- DropTable
DROP TABLE "deposits";

-- DropTable
DROP TABLE "external_fees";

-- DropTable
DROP TABLE "external_transfers";

-- DropTable
DROP TABLE "fees";

-- DropTable
DROP TABLE "multisig_approvals";

-- DropTable
DROP TABLE "multisig_members";

-- DropTable
DROP TABLE "multisig_proposals";

-- DropTable
DROP TABLE "multisig_transactions";

-- DropTable
DROP TABLE "multisig_transfer_proposal_approvals";

-- DropTable
DROP TABLE "multisig_transfer_proposals";

-- DropTable
DROP TABLE "multisigs";

-- DropTable
DROP TABLE "transfers";

-- DropTable
DROP TABLE "treasury_operations";

-- DropTable
DROP TABLE "vaults";

-- DropTable
DROP TABLE "wallet_fees";

-- DropTable
DROP TABLE "wallet_transfers";

-- DropTable
DROP TABLE "wallets";

-- DropTable
DROP TABLE "withdrawals";

-- DropTable
DROP TABLE "yield_investments";

-- DropEnum
DROP TYPE "DepositStatus";

-- DropEnum
DROP TYPE "ExternalFeeStatus";

-- DropEnum
DROP TYPE "ExternalTransferStatus";

-- DropEnum
DROP TYPE "FeeStatus";

-- DropEnum
DROP TYPE "MultisigApprovalType";

-- DropEnum
DROP TYPE "MultisigProposalStatus";

-- DropEnum
DROP TYPE "MultisigTransactionStatus";

-- DropEnum
DROP TYPE "MultisigTransferStatus";

-- DropEnum
DROP TYPE "TransferStatus";

-- DropEnum
DROP TYPE "TreasuryOperationStatus";

-- DropEnum
DROP TYPE "WalletFeeStatus";

-- DropEnum
DROP TYPE "WalletTransferStatus";

-- DropEnum
DROP TYPE "WithdrawalStatus";

-- DropEnum
DROP TYPE "YieldInvestmentStatus";

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "walletAddress" TEXT,
    "permissions" "AdminPermission"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admins_walletAddress_key" ON "admins"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "users_middleName_key" ON "users"("middleName");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");
