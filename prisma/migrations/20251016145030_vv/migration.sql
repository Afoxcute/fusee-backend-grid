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
    "gridPolicies" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_middleName_key" ON "users"("middleName");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");
