import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupMotionTests() {
    try {
        console.log('🔍 Checking for MOTION tests in database...');

        // First, we need to use raw SQL since Prisma client doesn't recognize MOTION anymore
        const motionTests = await prisma.$queryRaw`
      SELECT id, title, type FROM Test WHERE type = 'MOTION'
    `;

        if (motionTests.length === 0) {
            console.log('✅ No MOTION tests found. Database is clean!');
            return;
        }

        console.log(`⚠️  Found ${motionTests.length} MOTION test(s):`);
        motionTests.forEach(test => {
            console.log(`   - ID: ${test.id}, Title: "${test.title}"`);
        });

        console.log('\n📝 Choose an option:');
        console.log('   Option 1: Delete all MOTION tests (run with --delete flag)');
        console.log('   Option 2: Convert MOTION tests to STANDARD (run with --convert flag)');

        const args = process.argv.slice(2);

        if (args.includes('--delete')) {
            console.log('\n🗑️  Deleting MOTION tests...');
            const result = await prisma.$executeRaw`
        DELETE FROM Test WHERE type = 'MOTION'
      `;
            console.log(`✅ Deleted ${result} MOTION test(s)`);
        } else if (args.includes('--convert')) {
            console.log('\n🔄 Converting MOTION tests to STANDARD...');
            const result = await prisma.$executeRaw`
        UPDATE Test SET type = 'STANDARD' WHERE type = 'MOTION'
      `;
            console.log(`✅ Converted ${result} MOTION test(s) to STANDARD`);
        } else {
            console.log('\n⚠️  No action taken. Use --delete or --convert flag to proceed.');
            process.exit(0);
        }

        // Verify cleanup
        const remaining = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM Test WHERE type = 'MOTION'
    `;

        if (remaining[0].count === 0) {
            console.log('✅ All MOTION tests cleaned up successfully!');
            console.log('\n📋 Next steps:');
            console.log('   1. Run: npx prisma migrate dev --name remove_motion_challenge');
            console.log('   2. Restart your backend server');
        } else {
            console.log(`⚠️  Warning: ${remaining[0].count} MOTION test(s) still remain`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupMotionTests();
