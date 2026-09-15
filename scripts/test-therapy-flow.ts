import { prisma } from '../src/lib/prisma';
import { PLANS } from '../src/lib/pricing';
import { activatePlan, syncSubscriptionState } from '../src/lib/subscription';
import {
    saveIntakeDraft,
    submitIntake,
    beginReview,
    decideIntake,
    applicantFacingStatus,
} from '../src/lib/therapy-intake';
import { Role, TherapyIntakeStatus } from '@prisma/client';

async function main() {
    console.log('================================================================');
    console.log('YOGA THERAPY — COMPLETE BUSINESS FLOW VERIFICATION');
    console.log('================================================================\n');

    const timestamp = Date.now();
    const patientEmail = `patient-${timestamp}@example.com`;
    const therapistEmail = `therapist-${timestamp}@example.com`;

    // 1. Create Patient & Therapist
    const therapist = await prisma.user.create({
        data: {
            email: therapistEmail,
            name: 'Dr. Vidya Iyer',
            role: 'TEACHER',
            adminDepartment: 'THERAPIST',
        },
    });

    const patient = await prisma.user.create({
        data: {
            email: patientEmail,
            name: 'Rajesh Nair',
            role: 'VISITOR',
        },
    });
    console.log('✓ Created patient and therapist accounts');

    // 2. Intake Draft Save
    const draft = await saveIntakeDraft(patient.id, {
        fullName: 'Rajesh Nair',
        age: 42,
        gender: 'Male',
        heightCm: 178,
        weightKg: 82,
        primaryConcern: 'Chronic lower back pain & L4-L5 disc stiffness',
        concernDuration: '1 year',
        concernDescription: 'Worse after sitting at desk. Pain radiating to right glute.',
        injuriesSurgeries: 'L4-L5 herniation in 2024. No surgery.',
        medicalConditions: 'Hypertension (mild)',
        medications: 'Telmisartan 20mg',
        familyHistory: 'Father had spinal stenosis',
        priorYogaTherapy: 'None',
        consentGiven: true,
        emergencyContactName: 'Deepa Nair',
        emergencyContactPhone: '+919876543210',
    });
    if (!draft.ok) throw new Error(`Draft save failed: ${draft.error}`);
    console.log(`✓ Intake form saved as DRAFT (id=${draft.intake.id})`);

    // 3. Submit Intake
    const submitted = await submitIntake(patient.id);
    if (!submitted.ok) throw new Error(`Submit failed: ${submitted.error}`);
    if (submitted.intake.status !== TherapyIntakeStatus.SUBMITTED) throw new Error('Status should be SUBMITTED');
    console.log('✓ Intake submitted successfully with full medical history & consent');

    // 4. Therapist Begins Review (locks intake from edits)
    const reviewing = await beginReview(submitted.intake.id);
    if (reviewing.status !== TherapyIntakeStatus.UNDER_REVIEW) throw new Error('Status should be UNDER_REVIEW');
    const reEdit = await saveIntakeDraft(patient.id, { fullName: 'Hacker Edit' });
    if (reEdit.ok) throw new Error('Intake under review should NOT be editable by patient');
    console.log('✓ Therapist opened intake: status=UNDER_REVIEW (patient editing locked)');

    // 5. Therapist Recommendation Decision
    const decided = await decideIntake(
        submitted.intake.id,
        therapist.id,
        'RECOMMENDED',
        'Cleared for gentle lumbar stabilization and restorative therapy.'
    );
    if (decided.status !== 'RECOMMENDED') throw new Error('Decision should be RECOMMENDED');
    console.log(`✓ Therapist decision recorded: RECOMMENDED with clinical notes`);

    // 6. Student Facing Status
    const studentStatus = applicantFacingStatus(decided.status);
    if (studentStatus !== 'RECOMMENDED') throw new Error('Student should see RECOMMENDED');
    const maskedStatus = applicantFacingStatus(TherapyIntakeStatus.NOT_RECOMMENDED);
    if (maskedStatus !== TherapyIntakeStatus.UNDER_REVIEW) throw new Error('NOT_RECOMMENDED should be masked to UNDER_REVIEW');
    console.log('✓ Student-facing status verified: RECOMMENDED unlocks checkout; NOT_RECOMMENDED masked safely');

    // 7. Payment & Plan Activation
    console.log(`\nPricing Check: INR=${PLANS.therapy.inr} | USD=${PLANS.therapy.usd} | Credits=${PLANS.therapy.credits}`);
    if (PLANS.therapy.inr !== 5000) throw new Error(`Expected INR 5000, got ${PLANS.therapy.inr}`);
    if (PLANS.therapy.usd !== 120) throw new Error(`Expected USD 120, got ${PLANS.therapy.usd}`);
    if (PLANS.therapy.credits !== 20) throw new Error(`Expected 20 credits, got ${PLANS.therapy.credits}`);

    await activatePlan(patient.id, PLANS.therapy, { region: 'IN', skipCookie: true });
    const member = await prisma.user.findUniqueOrThrow({
        where: { id: patient.id },
        include: { subscription: true },
    });
    if (member.role !== Role.MEMBER_THERAPY) throw new Error('Role should be MEMBER_THERAPY');
    if (member.credits !== 20) throw new Error(`Expected 20 credits on user, got ${member.credits}`);
    if (member.subscription?.status !== 'ACTIVE') throw new Error('Subscription status should be ACTIVE');
    console.log(`✓ ₹5,000 / $120 Plan activated: role=${member.role}, exactly ${member.credits} sessions allocated, subscription=${member.subscription?.status}`);

    // 8. Schedule Session (Booking)
    const bookingDate = new Date(Date.now() + 48 * 3600_000); // 2 days ahead
    const booking = await prisma.booking.create({
        data: {
            userId: patient.id,
            teacherId: therapist.id,
            type: 'THERAPY_SESSION',
            status: 'CONFIRMED',
            date: bookingDate,
            notes: 'Initial evaluation and spine mobility',
            meetingLink: 'https://meet.google.com/test-therapy-room',
        },
    });
    console.log(`✓ 1:1 Therapy session scheduled: id=${booking.id}, teacher=${therapist.name}, status=${booking.status}`);

    // 9. Reschedule Booking (moves booking, updates date)
    const rescheduledDate = new Date(bookingDate.getTime() + 24 * 3600_000);
    const updatedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: { date: rescheduledDate },
    });
    console.log(`✓ Booking rescheduled to ${updatedBooking.date.toISOString().slice(0, 10)}`);

    // 10. Substitute Therapist Flow
    const subTherapist = await prisma.user.create({
        data: {
            email: `sub-therapist-${timestamp}@example.com`,
            name: 'Dr. Anand Kumar',
            role: 'TEACHER',
            adminDepartment: 'THERAPIST',
        },
    });
    const reassigned = await prisma.booking.update({
        where: { id: booking.id },
        data: { teacherId: subTherapist.id },
    });
    if (reassigned.teacherId !== subTherapist.id) throw new Error('Reassignment failed');
    console.log(`✓ Substitute therapist assigned: Dr. Anand Kumar (id=${subTherapist.id})`);

    // 11. Attendance Completion
    await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'COMPLETED', notes: 'Completed session. Patient tolerated cat-cow and gentle twists well.' },
    });
    console.log('✓ Attendance confirmed: status=COMPLETED');

    // 12. Clinical Progress Measurement (Therapist Only)
    const measurement = await prisma.therapyMeasurement.create({
        data: {
            userId: patient.id,
            painScore: 6,
            mobilityScore: 5,
            sleepScore: 6,
            stressScore: 4,
            weightKg: 81.5,
            note: 'Initial baseline measurement post session 1.',
            recordedById: therapist.id,
        },
    });
    console.log(`✓ Clinical measurement recorded: pain=${measurement.painScore}/10, mobility=${measurement.mobilityScore}/10 (recordedBy therapist)`);

    // 13. Patient Between-Sessions Update (Separation of Records)
    const patientUpdate = await prisma.patientUpdate.create({
        data: {
            userId: patient.id,
            body: 'Felt slight soreness in the morning, but back feels looser after gentle stretches.',
            status: 'PENDING',
        },
    });
    console.log(`✓ Patient progress update submitted: id=${patientUpdate.id} (Stored separately in PatientUpdate; does NOT overwrite TherapyMeasurement)`);

    // 14. Expiry & Lockout
    console.log('\nTesting Expiry & Lockout...');
    await prisma.subscription.update({
        where: { userId: patient.id },
        data: { status: 'CANCELLED', recurring: false, renewalDate: new Date(Date.now() - 1000) },
    });
    const expiredRole = await syncSubscriptionState(patient.id, Role.MEMBER_THERAPY);
    if (expiredRole !== Role.VISITOR) throw new Error(`Role should drop to VISITOR. Got ${expiredRole}`);
    console.log('✓ Lapsed Yoga Therapy subscription dropped role to VISITOR and locked access');

    // 15. Cleanup
    console.log('\nCleaning up test records...');
    await prisma.patientUpdate.deleteMany({ where: { userId: patient.id } });
    await prisma.therapyMeasurement.deleteMany({ where: { userId: patient.id } });
    await prisma.booking.deleteMany({ where: { userId: patient.id } });
    await prisma.therapyIntake.deleteMany({ where: { userId: patient.id } });
    await prisma.subscription.deleteMany({ where: { userId: patient.id } });
    await prisma.user.deleteMany({ where: { id: { in: [patient.id, therapist.id, subTherapist.id] } } });
    console.log('✓ Cleanup complete.');

    console.log('\n🎉 ALL YOGA THERAPY BUSINESS FLOW STEPS VERIFIED!');
}

main()
    .catch((err) => {
        console.error('Test failed:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
