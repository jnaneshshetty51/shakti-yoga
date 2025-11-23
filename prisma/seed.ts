import { PrismaClient, Role, PlanType, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// Create Prisma client for seeding (standalone script)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

async function main() {
  console.log('🌱 Starting seed...');

  // Check if database tables exist by trying to query
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.error('\n❌ Database tables do not exist yet!');
      console.error('\n📋 Please run migrations first:');
      console.error('   1. Create initial migration: npx prisma migrate dev --name init');
      console.error('   2. Or deploy migrations: npx prisma migrate deploy');
      console.error('   3. Then run seed: npm run db:seed\n');
      process.exit(1);
    }
    throw error;
  }

  // Hash password for all users (using "Password123!" as default)
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  // Clear existing users (optional - comment out if you want to keep existing data)
  console.log('🧹 Cleaning up existing seed users...');
  try {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'superadmin@shaktiyoga.com',
            'staffadmin@shaktiyoga.com',
            'teacher@shaktiyoga.com',
            'member.everyday@shaktiyoga.com',
            'member.therapy@shaktiyoga.com',
            'trial@shaktiyoga.com',
            'visitor@shaktiyoga.com',
          ],
        },
      },
    });
  } catch (error: any) {
    if (error.code === 'P2021') {
      console.error('\n❌ Database tables do not exist yet!');
      console.error('\n📋 Please run migrations first:');
      console.error('   1. Create initial migration: npx prisma migrate dev --name init');
      console.error('   2. Or deploy migrations: npx prisma migrate deploy');
      console.error('   3. Then run seed: npm run db:seed\n');
      process.exit(1);
    }
    throw error;
  }

  // 1. SUPER_ADMIN
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'superadmin@shaktiyoga.com',
      passwordHash: hashedPassword,
      role: Role.SUPER_ADMIN,
      phone: '+1234567890',
      country: 'USA',
      timezone: 'America/New_York',
    },
  });
  console.log('✅ Created SUPER_ADMIN:', superAdmin.email);

  // 2. STAFF_ADMIN
  const staffAdmin = await prisma.user.create({
    data: {
      name: 'Staff Admin',
      email: 'staffadmin@shaktiyoga.com',
      passwordHash: hashedPassword,
      role: Role.STAFF_ADMIN,
      phone: '+1234567891',
      country: 'USA',
      timezone: 'America/New_York',
    },
  });
  console.log('✅ Created STAFF_ADMIN:', staffAdmin.email);

  // 3. TEACHER
  const teacher = await prisma.user.create({
    data: {
      name: 'Yoga Teacher',
      email: 'teacher@shaktiyoga.com',
      passwordHash: hashedPassword,
      role: Role.TEACHER,
      phone: '+1234567892',
      country: 'India',
      timezone: 'Asia/Kolkata',
    },
  });
  console.log('✅ Created TEACHER:', teacher.email);

  // 4. MEMBER_EVERYDAY
  const memberEveryday = await prisma.user.create({
    data: {
      name: 'Everyday Yoga Member',
      email: 'member.everyday@shaktiyoga.com',
      passwordHash: hashedPassword,
      role: Role.MEMBER_EVERYDAY,
      phone: '+1234567893',
      country: 'USA',
      timezone: 'America/Los_Angeles',
      subscription: {
        create: {
          planType: PlanType.EVERYDAY_YOGA,
          amount: 29.99,
          currency: 'USD',
          status: SubscriptionStatus.ACTIVE,
          renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      },
      profile: {
        create: {
          goals: 'Improve flexibility and daily wellness',
          communicationPref: 'Email',
        },
      },
    },
  });
  console.log('✅ Created MEMBER_EVERYDAY:', memberEveryday.email);

  // 5. MEMBER_THERAPY
  const memberTherapy = await prisma.user.create({
    data: {
      name: 'Yoga Therapy Member',
      email: 'member.therapy@shaktiyoga.com',
      passwordHash: hashedPassword,
      role: Role.MEMBER_THERAPY,
      phone: '+1234567894',
      country: 'USA',
      timezone: 'America/New_York',
      subscription: {
        create: {
          planType: PlanType.YOGA_THERAPY,
          amount: 99.99,
          currency: 'USD',
          status: SubscriptionStatus.ACTIVE,
          renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      },
      profile: {
        create: {
          goals: 'Therapeutic yoga for back pain relief',
          medicalHistory: 'Lower back pain, sciatica',
          communicationPref: 'WhatsApp',
        },
      },
    },
  });
  console.log('✅ Created MEMBER_THERAPY:', memberTherapy.email);

  // 6. TRIAL
  const trialUser = await prisma.user.create({
    data: {
      name: 'Trial User',
      email: 'trial@shaktiyoga.com',
      passwordHash: hashedPassword,
      role: Role.TRIAL,
      phone: '+1234567895',
      country: 'USA',
      timezone: 'America/Chicago',
      subscription: {
        create: {
          planType: PlanType.TRIAL,
          amount: 0,
          currency: 'USD',
          status: SubscriptionStatus.TRIAL,
          renewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
      },
      profile: {
        create: {
          goals: 'Exploring yoga options',
          communicationPref: 'Email',
        },
      },
    },
  });
  console.log('✅ Created TRIAL:', trialUser.email);

  // 7. VISITOR
  const visitor = await prisma.user.create({
    data: {
      name: 'Visitor User',
      email: 'visitor@shaktiyoga.com',
      passwordHash: hashedPassword,
      role: Role.VISITOR,
      phone: '+1234567896',
      country: 'USA',
      timezone: 'America/Denver',
    },
  });
  console.log('✅ Created VISITOR:', visitor.email);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 User Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('All users use the password: Password123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUPER_ADMIN:     superadmin@shaktiyoga.com');
  console.log('STAFF_ADMIN:     staffadmin@shaktiyoga.com');
  console.log('TEACHER:         teacher@shaktiyoga.com');
  console.log('MEMBER_EVERYDAY: member.everyday@shaktiyoga.com');
  console.log('MEMBER_THERAPY:  member.therapy@shaktiyoga.com');
  console.log('TRIAL:           trial@shaktiyoga.com');
  console.log('VISITOR:         visitor@shaktiyoga.com');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

