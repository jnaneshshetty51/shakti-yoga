import { randomBytes } from 'node:crypto';
import { PrismaClient, Role, PlanType, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// Create Prisma client for seeding (standalone script)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

function isTableMissingError(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  return e?.code === 'P2021' || !!e?.message?.includes('does not exist');
}

/**
 * Password used for every seeded account. Taken from SEED_PASSWORD if set,
 * otherwise a random one is generated and printed once at the end.
 */
function resolveSeedPassword(): { password: string; generated: boolean } {
  const fromEnv = process.env.SEED_PASSWORD;
  if (fromEnv && fromEnv.length >= 8) {
    return { password: fromEnv, generated: false };
  }
  return { password: `sy_${randomBytes(12).toString('base64url')}`, generated: true };
}

async function main() {
  console.log('🌱 Starting seed...');

  // Guard: never seed a production database by accident (shared demo passwords).
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    console.error('\n❌ Refusing to seed with NODE_ENV=production.');
    console.error('   Set ALLOW_PROD_SEED=true to override (and set a strong SEED_PASSWORD).\n');
    process.exit(1);
  }

  // Check if database tables exist by trying to query
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error: unknown) {
    if (isTableMissingError(error)) {
      console.error('\n❌ Database tables do not exist yet!');
      console.error('\n📋 Please run migrations first:');
      console.error('   1. Create initial migration: npx prisma migrate dev --name init');
      console.error('   2. Or deploy migrations: npx prisma migrate deploy');
      console.error('   3. Then run seed: npm run db:seed\n');
      process.exit(1);
    }
    throw error;
  }

  const { password: seedPassword, generated: passwordGenerated } = resolveSeedPassword();
  const hashedPassword = await bcrypt.hash(seedPassword, 10);

  // Clear existing users (optional - comment out if you want to keep existing data)
  console.log('🧹 Cleaning up existing seed data...');
  try {
    const seedEmails = [
      'superadmin@shaktiyoga.com',
      'staffadmin@shaktiyoga.com',
      'teacher@shaktiyoga.com',
      'member.everyday@shaktiyoga.com',
      'member.therapy@shaktiyoga.com',
      'trial@shaktiyoga.com',
      'visitor@shaktiyoga.com',
    ];

    // Delete related data first to avoid foreign key constraints
    await prisma.subscription.deleteMany({
      where: { user: { email: { in: seedEmails } } },
    });
    await prisma.userProfile.deleteMany({
      where: { user: { email: { in: seedEmails } } },
    });
    await prisma.classBatch.deleteMany({});
    await prisma.blogPost.deleteMany({});
    await prisma.story.deleteMany({});
    await prisma.whatsAppGroup.deleteMany({});
    await prisma.booking.deleteMany({});

    // Now delete users
    await prisma.user.deleteMany({
      where: { email: { in: seedEmails } },
    });
  } catch (error: unknown) {
    if (isTableMissingError(error)) {
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
          amount: 2000,
          currency: 'INR',
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
      credits: 4,
      phone: '+1234567894',
      country: 'USA',
      timezone: 'America/New_York',
      subscription: {
        create: {
          planType: PlanType.YOGA_THERAPY,
          amount: 5000,
          currency: 'INR',
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
      credits: 1,
      phone: '+1234567895',
      country: 'USA',
      timezone: 'America/Chicago',
      subscription: {
        create: {
          planType: PlanType.TRIAL,
          amount: 0,
          currency: 'INR',
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

  // ========================================
  // SAMPLE DATA FOR ADMIN PANEL
  // ========================================

  console.log('\n📦 Creating sample data for admin panel...');

  // Create Class Batches
  const morningBatch = await prisma.classBatch.create({
    data: {
      name: 'Morning Hatha Yoga',
      planType: PlanType.EVERYDAY_YOGA,
      daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      timeSlot: '06:00 AM',
      durationMin: 60,
      teacherId: teacher.id,
      active: true,
      meetingLink: 'https://meet.google.com/abc-defg-hij',
    },
  });
  console.log('✅ Created Class Batch:', morningBatch.name);

  const eveningBatch = await prisma.classBatch.create({
    data: {
      name: 'Evening Vinyasa Flow',
      planType: PlanType.EVERYDAY_YOGA,
      daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      timeSlot: '06:00 PM',
      durationMin: 60,
      teacherId: teacher.id,
      active: true,
      meetingLink: 'https://meet.google.com/klm-nopq-rst',
    },
  });
  console.log('✅ Created Class Batch:', eveningBatch.name);

  // Yoga Therapy is strictly 1:1 and handled through Booking — no group batch.

  // Create Blog Posts
  const blog1 = await prisma.blogPost.create({
    data: {
      slug: 'benefits-of-morning-yoga',
      title: '5 Amazing Benefits of Morning Yoga Practice',
      excerpt: 'Discover how starting your day with yoga can transform your life and boost your energy levels.',
      content: '# Benefits of Morning Yoga\n\nMorning yoga is a powerful way to start your day...\n\n## 1. Increased Energy\nYoga helps wake up your body and mind...\n\n## 2. Better Focus\nMorning practice improves concentration...',
      category: 'Wellness',
      author: 'Yoga Teacher',
      publishedAt: new Date(),
      status: 'PUBLISHED',
      imageUrl: '/blog/morning-yoga.jpg',
    },
  });
  console.log('✅ Created Blog Post:', blog1.title);

  const blog2 = await prisma.blogPost.create({
    data: {
      slug: 'yoga-for-back-pain',
      title: 'Yoga Therapy for Chronic Back Pain Relief',
      excerpt: 'Learn how therapeutic yoga can help alleviate chronic back pain and improve your quality of life.',
      content: '# Yoga for Back Pain\n\nChronic back pain affects millions...\n\n## Understanding Back Pain\nBack pain can be caused by...\n\n## Yoga Poses for Relief\n1. Cat-Cow Stretch\n2. Child\'s Pose...',
      category: 'Therapy',
      author: 'Yoga Teacher',
      publishedAt: new Date(),
      status: 'PUBLISHED',
      imageUrl: '/blog/back-pain.jpg',
    },
  });
  console.log('✅ Created Blog Post:', blog2.title);

  const blog3 = await prisma.blogPost.create({
    data: {
      slug: 'getting-started-with-yoga',
      title: 'Getting Started with Yoga: A Beginner\'s Guide',
      excerpt: 'New to yoga? This comprehensive guide will help you start your yoga journey with confidence.',
      content: '# Beginner\'s Guide to Yoga\n\nStarting yoga can be intimidating...\n\n## What You Need\n- Yoga mat\n- Comfortable clothing\n- Open mind...',
      category: 'Beginners',
      author: 'Yoga Teacher',
      status: 'DRAFT',
      imageUrl: '/blog/beginners-guide.jpg',
    },
  });
  console.log('✅ Created Blog Post:', blog3.title);

  // Create Success Stories
  const story1 = await prisma.story.create({
    data: {
      userId: memberEveryday.id,
      authorName: 'Everyday Yoga Member',
      location: 'Los Angeles, USA',
      planType: 'Everyday Yoga',
      quote: 'Yoga has completely transformed my daily routine and energy levels!',
      content: 'I started with Shakti Yoga 6 months ago and it has been life-changing. The morning classes help me start my day with focus and energy. The teachers are amazing and the community is so supportive.',
      rating: 5,
      status: 'PUBLISHED',
      imageUrl: '/stories/member1.jpg',
    },
  });
  console.log('✅ Created Story:', story1.authorName);

  const story2 = await prisma.story.create({
    data: {
      userId: memberTherapy.id,
      authorName: 'Yoga Therapy Member',
      location: 'New York, USA',
      planType: 'Yoga Therapy',
      quote: 'The therapeutic yoga sessions helped me overcome chronic back pain.',
      content: 'After years of struggling with back pain, I found relief through personalized yoga therapy. The 1:1 sessions are tailored to my needs and I\'ve seen tremendous improvement in just 3 months.',
      rating: 5,
      status: 'PUBLISHED',
      imageUrl: '/stories/member2.jpg',
    },
  });
  console.log('✅ Created Story:', story2.authorName);

  const story3 = await prisma.story.create({
    data: {
      authorName: 'Sarah Johnson',
      location: 'London, UK',
      planType: 'Everyday Yoga',
      quote: 'Best decision I made for my wellness journey!',
      content: 'The flexibility of online classes and the quality of instruction is outstanding. Highly recommend to anyone looking to start or deepen their yoga practice.',
      rating: 5,
      status: 'PUBLISHED',
      imageUrl: '/stories/member3.jpg',
    },
  });
  console.log('✅ Created Story:', story3.authorName);

  // Create WhatsApp Groups
  const whatsapp1 = await prisma.whatsAppGroup.create({
    data: {
      name: 'Everyday Yoga Community',
      link: 'https://chat.whatsapp.com/everyday-yoga-group',
      role: Role.MEMBER_EVERYDAY,
      pinnedMessage: 'Welcome to the Everyday Yoga community! Share your progress, ask questions, and connect with fellow yogis.',
      active: true,
    },
  });
  console.log('✅ Created WhatsApp Group:', whatsapp1.name);

  const whatsapp2 = await prisma.whatsAppGroup.create({
    data: {
      name: 'Yoga Therapy Support',
      link: 'https://chat.whatsapp.com/therapy-support-group',
      role: Role.MEMBER_THERAPY,
      pinnedMessage: 'This is a safe space for yoga therapy members to share experiences and support each other on the healing journey.',
      active: true,
    },
  });
  console.log('✅ Created WhatsApp Group:', whatsapp2.name);

  const whatsapp3 = await prisma.whatsAppGroup.create({
    data: {
      name: 'Trial Members Welcome',
      link: 'https://chat.whatsapp.com/trial-members-group',
      role: Role.TRIAL,
      pinnedMessage: 'Welcome trial members! Feel free to ask any questions about our programs.',
      active: true,
    },
  });
  console.log('✅ Created WhatsApp Group:', whatsapp3.name);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 User Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (passwordGenerated) {
    console.log(`All users share this generated password: ${seedPassword}`);
    console.log('(set SEED_PASSWORD in the environment to choose your own)');
  } else {
    console.log('All users share the password from SEED_PASSWORD.');
  }
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

