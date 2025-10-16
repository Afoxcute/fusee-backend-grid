-- SQL queries to identify and handle duplicate phone numbers
-- Run these queries in your database to identify the issue

-- 1. Find users with duplicate phone numbers
SELECT phoneNumber, COUNT(*) as count
FROM users 
WHERE phoneNumber IS NOT NULL 
AND phoneNumber != ''
GROUP BY phoneNumber 
HAVING COUNT(*) > 1;

-- 2. Find all users with a specific phone number (replace 'PHONE_NUMBER' with the actual number)
SELECT id, email, firstName, lastName, phoneNumber, createdAt
FROM users 
WHERE phoneNumber = 'PHONE_NUMBER';

-- 3. Find users with empty or null phone numbers that might be causing issues
SELECT id, email, firstName, lastName, phoneNumber, createdAt
FROM users 
WHERE phoneNumber IS NULL 
OR phoneNumber = '';

-- 4. Update users with empty phone numbers to NULL (optional cleanup)
-- UPDATE users 
-- SET phoneNumber = NULL 
-- WHERE phoneNumber = '';

-- 5. Delete duplicate users (BE CAREFUL - this will permanently delete users)
-- Only run this if you're sure which users to keep and which to delete
-- DELETE FROM users 
-- WHERE id IN (
--   SELECT id FROM (
--     SELECT id, ROW_NUMBER() OVER (PARTITION BY phoneNumber ORDER BY createdAt) as rn
--     FROM users 
--     WHERE phoneNumber IS NOT NULL 
--     AND phoneNumber != ''
--   ) t 
--   WHERE rn > 1
-- );
