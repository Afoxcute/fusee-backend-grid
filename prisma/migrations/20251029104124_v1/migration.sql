-- CreateEnum
CREATE TYPE "YieldTransactionType" AS ENUM ('INITIALIZE_REFERRER', 'DEPOSIT', 'WITHDRAW_PROTECTED', 'INITIATE_REGULAR_WITHDRAW', 'COMPLETE_REGULAR_WITHDRAWAL');

-- CreateEnum
CREATE TYPE "YieldTransactionStatus" AS ENUM ('PENDING', 'GENERATED', 'SIGNED', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('SOL_TRANSFER', 'USDC_TRANSFER');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'PREPARED', 'SIGNED', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('SOL', 'USDC');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "phoneNumber" TEXT,
    "walletAddress" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "gridAddress" TEXT,
    "gridStatus" TEXT,
    "authResult" JSONB,
    "sessionSecrets" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yield_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "YieldTransactionType" NOT NULL,
    "status" "YieldTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "owner" TEXT NOT NULL,
    "feePayer" TEXT NOT NULL,
    "mintAddress" TEXT,
    "regularAmount" DOUBLE PRECISION,
    "protectedAmount" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,
    "referrer" TEXT,
    "pendingWithdrawalId" INTEGER,
    "serializedTransaction" TEXT,
    "transactionSignature" TEXT,
    "priorityFee" TEXT,
    "luloResponse" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yield_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransferType" NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "tokenType" "TokenType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "decimals" INTEGER NOT NULL,
    "mintAddress" TEXT,
    "serializedTransaction" TEXT,
    "transactionSignature" TEXT,
    "recentBlockhash" TEXT,
    "feeAmount" DOUBLE PRECISION,
    "priorityFee" TEXT,
    "gridResponse" JSONB,
    "blockchainResponse" JSONB,
    "errorMessage" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "yield_transactions" ADD CONSTRAINT "yield_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
