import { prisma } from '../src/lib/prisma';

async function createTestClass() {
    try {
        // Get teacher user
        const teacher = await prisma.user.findFirst({
            where: { role: 'TEACHER' }
        });

        if (!teacher) {
            console.error('No teacher found');
            process.exit(1);
        }

        console.log('✅ Found teacher:', teacher.name);

        // Create live class WITHOUT Daily.co (for testing)
        const scheduledAt = new Date();
        scheduledAt.setMinutes(scheduledAt.getMinutes() + 30);

        const liveClass = await prisma.liveClass.create({
            data: {
                title: 'Test Live Yoga Class',
                description: 'Testing WebRTC live streaming functionality',
                scheduledAt,
                teacherId: teacher.id,
                roomUrl: 'https://test.daily.co/test-room',
                roomId: 'test-room-' + Date.now(),
                status: 'SCHEDULED'
            }
        });

        console.log('✅ Live class created!');
        console.log('   ID:', liveClass.id);
        console.log('   Title:', liveClass.title);
        console.log('   Status:', liveClass.status);
        console.log('   Scheduled:', liveClass.scheduledAt);
        console.log('\n📋 Visit http://localhost:3000/live to see the class!');

        await prisma.$disconnect();
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        await prisma.$disconnect();
        process.exit(1);
    }
}

createTestClass();
