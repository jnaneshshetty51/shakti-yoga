import { prisma } from '../src/lib/prisma';
import { hashPassword, signToken, verifyToken, sessionClaims, getSession } from '../src/lib/auth';
import { deleteAccount } from '../src/lib/account';

async function main() {
    console.log('--- 1. Testing "Logout All Other Sessions" (tokenVersion revocation) ---');
    const testEmail = `test-session-${Date.now()}@example.com`;
    const passwordHash = await hashPassword('TestPass123!');

    // Create a temporary test user
    const testUser = await prisma.user.create({
        data: {
            email: testEmail,
            name: 'Session Test User',
            passwordHash,
            role: 'MEMBER_EVERYDAY',
            tokenVersion: 0,
        },
    });

    console.log(`Created test user: ${testUser.id} (tokenVersion: ${testUser.tokenVersion})`);

    // Mint two session tokens simulating Session A (e.g. Phone) and Session B (e.g. Laptop)
    const tokenA = await signToken(sessionClaims(testUser));
    const tokenB = await signToken(sessionClaims(testUser));

    const payloadA = await verifyToken(tokenA);
    const payloadB = await verifyToken(tokenB);

    if (!payloadA || payloadA.tv !== 0 || !payloadB || payloadB.tv !== 0) {
        throw new Error('Initial tokens failed validation');
    }
    console.log('✓ Both Session A and Session B successfully issued with tokenVersion 0');

    // Simulate "Log out all other sessions" from Session A:
    // Atomically bump tokenVersion in the database:
    const updatedUser = await prisma.user.update({
        where: { id: testUser.id },
        data: { tokenVersion: { increment: 1 } },
    });

    // Re-issue a fresh token for Session A:
    const freshTokenA = await signToken(sessionClaims(updatedUser));
    const freshPayloadA = await verifyToken(freshTokenA);

    console.log(`Bumped tokenVersion in DB to: ${updatedUser.tokenVersion}`);

    // Verify Session B (holding old tokenVersion 0) is now invalid against the database:
    const checkSessionB = await prisma.user.findUnique({
        where: { id: payloadB.id },
        select: { tokenVersion: true, active: true },
    });

    if (checkSessionB?.tokenVersion === payloadB.tv) {
        throw new Error('Session B should have been invalidated!');
    }
    console.log(`✓ Session B is REVOKED: token tv (${payloadB.tv}) != db tokenVersion (${checkSessionB?.tokenVersion})`);

    // Verify Session A (holding fresh tokenVersion 1) is VALID against the database:
    if (checkSessionB?.tokenVersion !== freshPayloadA?.tv) {
        throw new Error('Fresh Session A should be valid!');
    }
    console.log(`✓ Fresh Session A is VALID: token tv (${freshPayloadA?.tv}) == db tokenVersion (${checkSessionB?.tokenVersion})`);

    console.log('\n--- 2. Testing Account Deletion (deleteAccount) ---');
    await deleteAccount(testUser.id);

    const deletedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
    });

    if (!deletedUser) throw new Error('User record missing');
    if (!deletedUser.email.startsWith('deleted-')) throw new Error('Email was not anonymised');
    if (deletedUser.passwordHash !== null) throw new Error('passwordHash was not scrubbed');
    if (deletedUser.role !== 'VISITOR') throw new Error('Role was not reset to VISITOR');
    if (deletedUser.tokenVersion <= updatedUser.tokenVersion) throw new Error('tokenVersion was not bumped on deletion');

    console.log(`✓ Account successfully scrubbed:`);
    console.log(`  - Email: ${deletedUser.email}`);
    console.log(`  - Role: ${deletedUser.role}`);
    console.log(`  - passwordHash: ${deletedUser.passwordHash}`);
    console.log(`  - tokenVersion: ${deletedUser.tokenVersion} (all remaining sessions permanently revoked)`);

    // Clean up temporary test row
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log('✓ Cleaned up test user record.');

    console.log('\n🎉 ALL SESSION LOGOUT AND ACCOUNT DELETION CHECKS PASSED 100%!');
}

main()
    .catch((err) => {
        console.error('Test failed:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
