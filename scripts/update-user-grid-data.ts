import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserGridData() {
  try {
    const email = 'bbiissuuggaa@gmail.com';
    const gridAddress = 'YmeQtLhGS2GhLcBiGug6Pv1dTv75vUKFCSwdb2nffzV';
    const gridStatus = 'success';
    const gridPolicies = {
      signers: [
        {
          role: "primary",
          address: "Gu5V8ZEDXTJk4xv5TLeoW3rHYLfCzwZNyW9DJ1ejienH",
          provider: "privy",
          permissions: [
            "CAN_INITIATE",
            "CAN_VOTE",
            "CAN_EXECUTE"
          ]
        },
        {
          role: "backup",
          address: "FzGQeL7BSCroAGPWW9n8xwkTzWmUdk8bt78NiqBPnkzH",
          provider: "turnkey",
          permissions: [
            "CAN_INITIATE",
            "CAN_VOTE",
            "CAN_EXECUTE"
          ]
        }
      ],
      threshold: 1,
      time_lock: null,
      admin_address: null
    };

    console.log(`Updating user ${email} with Grid account data...`);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        gridAddress,
        gridStatus,
        gridPolicies: gridPolicies as any,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        gridPolicies: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log('✅ User updated successfully!');
    console.log('Updated user data:', JSON.stringify(updatedUser, null, 2));

  } catch (error) {
    console.error('❌ Error updating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserGridData();
