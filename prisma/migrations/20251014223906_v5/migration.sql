-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'APPROVED', 'EXECUTED', 'REJECTED');

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "lastExecuteActivityAt" TIMESTAMP(3),
ADD COLUMN     "lastVoteActivityAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "adminEmails" TEXT[],
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);
