-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExternalFeeStatus" AS ENUM ('COLLECTED', 'REFUNDED', 'PENDING');

-- CreateEnum
CREATE TYPE "ExternalTransferStatus" AS ENUM ('PENDING', 'PENDING_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('COLLECTED', 'REFUNDED', 'PENDING');

-- CreateEnum
CREATE TYPE "MultisigApprovalType" AS ENUM ('APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "MultisigProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'STALE');

-- CreateEnum
CREATE TYPE "MultisigTransactionStatus" AS ENUM ('PENDING', 'PROPOSED', 'APPROVED', 'EXECUTED', 'REJECTED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "MultisigTransferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TreasuryOperationStatus" AS ENUM ('PENDING', 'APPROVED', 'EXECUTED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "WalletFeeStatus" AS ENUM ('COLLECTED', 'REFUNDED', 'PENDING');

-- CreateEnum
CREATE TYPE "WalletTransferStatus" AS ENUM ('PENDING', 'PENDING_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "YieldInvestmentStatus" AS ENUM ('PENDING', 'PENDING_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "firstName" TEXT,
    "phoneNumber" TEXT,
    "solanaWallet" TEXT NOT NULL,
    "balance" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "multisigPda" TEXT,
    "multisigCreateKey" TEXT,
    "multisigThreshold" INTEGER,
    "multisigTimeLock" INTEGER DEFAULT 0,
    "hasMultisig" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposits" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "vaultId" INTEGER NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SOL',
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "transactionHash" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_fees" (
    "id" SERIAL NOT NULL,
    "externalTransferId" INTEGER NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SOL',
    "feeRate" DECIMAL(8,6) NOT NULL,
    "feeWalletAddress" TEXT NOT NULL,
    "status" "ExternalFeeStatus" NOT NULL DEFAULT 'COLLECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_transfers" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "fromWallet" TEXT NOT NULL,
    "toExternalWallet" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "fee" DECIMAL(18,8) NOT NULL,
    "netAmount" DECIMAL(18,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SOL',
    "status" "ExternalTransferStatus" NOT NULL DEFAULT 'PENDING',
    "transactionHash" TEXT,
    "feeWalletAddress" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fees" (
    "id" SERIAL NOT NULL,
    "transferId" INTEGER NOT NULL,
    "vaultId" INTEGER NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SOL',
    "feeRate" DECIMAL(8,6) NOT NULL,
    "status" "FeeStatus" NOT NULL DEFAULT 'COLLECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multisig_approvals" (
    "id" SERIAL NOT NULL,
    "multisigTransactionId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "approvalType" "MultisigApprovalType" NOT NULL DEFAULT 'APPROVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "multisig_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multisig_members" (
    "id" SERIAL NOT NULL,
    "multisigId" INTEGER,
    "userId" INTEGER,
    "publicKey" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isInactive" BOOLEAN NOT NULL DEFAULT false,
    "inactiveSince" TIMESTAMP(3),
    "removalEligibleAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "multisig_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multisig_proposals" (
    "id" SERIAL NOT NULL,
    "multisigTransactionId" INTEGER NOT NULL,
    "proposerKey" TEXT NOT NULL,
    "status" "MultisigProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "multisig_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multisig_transactions" (
    "id" SERIAL NOT NULL,
    "multisigId" INTEGER NOT NULL,
    "transactionIndex" BIGINT NOT NULL,
    "fromWallet" TEXT NOT NULL,
    "toWallet" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SOL',
    "status" "MultisigTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "transactionHash" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "multisig_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multisig_transfer_proposal_approvals" (
    "id" SERIAL NOT NULL,
    "proposalId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "approvalType" "MultisigApprovalType" NOT NULL DEFAULT 'APPROVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "multisig_transfer_proposal_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multisig_transfer_proposals" (
    "id" SERIAL NOT NULL,
    "fromWallet" TEXT NOT NULL,
    "toWallet" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "netAmount" DECIMAL(18,8) NOT NULL,
    "fee" DECIMAL(18,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SOL',
    "status" "MultisigTransferStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "multisigPda" TEXT NOT NULL,
    "proposalId" TEXT,
    "transactionHash" TEXT,
    "transactionData" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "multisig_transfer_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multisigs" (
    "id" SERIAL NOT NULL,
    "multisigPda" TEXT NOT NULL,
    "createKey" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Main Multisig',
    "threshold" INTEGER NOT NULL,
    "timeLock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "multisigs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" SERIAL NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "fee" DECIMAL(18,8) NOT NULL,
    "netAmount" DECIMAL(18,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SOL',
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "transactionHash" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_operations" (
    "id" SERIAL NOT NULL,
    "operationId" TEXT NOT NULL,
    "vaultId" INTEGER NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SOL',
    "status" "TreasuryOperationStatus" NOT NULL DEFAULT 'PENDING',
    "multisigTransactionIndex" TEXT,
    "transactionHash" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasury_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaults" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Main Vault',
    "totalBalance" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "feeBalance" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'SOL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_fees" (
    "id" SERIAL NOT NULL,
    "walletTransferId" INTEGER NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SOL',
    "feeRate" DECIMAL(8,6) NOT NULL,
    "feeWalletAddress" TEXT NOT NULL,
    "status" "WalletFeeStatus" NOT NULL DEFAULT 'COLLECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transfers" (
    "id" SERIAL NOT NULL,
    "fromWallet" TEXT NOT NULL,
    "toWallet" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "fee" DECIMAL(18,8) NOT NULL,
    "netAmount" DECIMAL(18,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SOL',
    "status" "WalletTransferStatus" NOT NULL DEFAULT 'PENDING',
    "transactionHash" TEXT,
    "feeWalletAddress" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "vaultId" INTEGER NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SOL',
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "transactionHash" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yield_investments" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "regularAmount" DECIMAL(18,8),
    "protectedAmount" DECIMAL(18,8),
    "status" "YieldInvestmentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionHash" TEXT,
    "luloAccount" TEXT,
    "referrerAccount" TEXT,
    "proposalId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yield_investments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_solanaWallet_key" ON "users"("solanaWallet");

-- CreateIndex
CREATE UNIQUE INDEX "users_multisigPda_key" ON "users"("multisigPda");

-- CreateIndex
CREATE UNIQUE INDEX "users_multisigCreateKey_key" ON "users"("multisigCreateKey");

-- CreateIndex
CREATE UNIQUE INDEX "multisig_members_publicKey_key" ON "multisig_members"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "multisigs_multisigPda_key" ON "multisigs"("multisigPda");

-- CreateIndex
CREATE UNIQUE INDEX "multisigs_createKey_key" ON "multisigs"("createKey");

-- CreateIndex
CREATE UNIQUE INDEX "treasury_operations_operationId_key" ON "treasury_operations"("operationId");

-- CreateIndex
CREATE UNIQUE INDEX "vaults_address_key" ON "vaults"("address");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_firstName_key" ON "wallets"("firstName");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_address_key" ON "wallets"("address");

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "vaults"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_fees" ADD CONSTRAINT "external_fees_externalTransferId_fkey" FOREIGN KEY ("externalTransferId") REFERENCES "external_transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_transfers" ADD CONSTRAINT "external_transfers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fees" ADD CONSTRAINT "fees_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fees" ADD CONSTRAINT "fees_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "vaults"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multisig_approvals" ADD CONSTRAINT "multisig_approvals_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "multisig_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multisig_approvals" ADD CONSTRAINT "multisig_approvals_multisigTransactionId_fkey" FOREIGN KEY ("multisigTransactionId") REFERENCES "multisig_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multisig_members" ADD CONSTRAINT "multisig_members_multisigId_fkey" FOREIGN KEY ("multisigId") REFERENCES "multisigs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multisig_members" ADD CONSTRAINT "multisig_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multisig_proposals" ADD CONSTRAINT "multisig_proposals_multisigTransactionId_fkey" FOREIGN KEY ("multisigTransactionId") REFERENCES "multisig_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multisig_transactions" ADD CONSTRAINT "multisig_transactions_multisigId_fkey" FOREIGN KEY ("multisigId") REFERENCES "multisigs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multisig_transfer_proposal_approvals" ADD CONSTRAINT "multisig_transfer_proposal_approvals_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "multisig_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multisig_transfer_proposal_approvals" ADD CONSTRAINT "multisig_transfer_proposal_approvals_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "multisig_transfer_proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_operations" ADD CONSTRAINT "treasury_operations_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "vaults"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_fees" ADD CONSTRAINT "wallet_fees_walletTransferId_fkey" FOREIGN KEY ("walletTransferId") REFERENCES "wallet_transfers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "vaults"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yield_investments" ADD CONSTRAINT "yield_investments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
