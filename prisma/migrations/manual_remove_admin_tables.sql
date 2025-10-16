-- Manual cleanup script to remove all admin-related tables and enums
-- Run this SQL manually in your database if needed

-- Drop admin-related tables
DROP TABLE IF EXISTS "admins" CASCADE;
DROP TABLE IF EXISTS "transactions" CASCADE;

-- Drop admin-related enums
DROP TYPE IF EXISTS "AdminPermission" CASCADE;
DROP TYPE IF EXISTS "TransactionStatus" CASCADE;

-- Update UserRole enum to remove ADMIN option (if it exists)
-- Note: This might require recreating the enum if ADMIN was already removed
-- ALTER TYPE "UserRole" DROP VALUE IF EXISTS 'ADMIN';

-- Verify cleanup
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('admins', 'transactions');

SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'AdminPermission'
);

SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'TransactionStatus'
);
