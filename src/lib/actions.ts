'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  attendance,
  blockedDates,
  classes,
  coachSlots,
  invoices,
  makeupBookings,
  makeupCredits,
  progressHistory,
  stageCompletions,
  students,
  users,
} from '@/db/schema';
import {
  HOME_FOR_ROLE,
  createSession,
  destroySession,
  findUserByEmail,
  hashPassword,
  requireSession,
  verifyPassword,
} from './auth';
import {
  PERIOD,
  TODAY,
  addMonthsStr,
  computeCreditStatus,
  creditEffect,
  findCriterion,
  formatDateLabel,
  formatHourLabel,
  timeToSeconds,
  type AttendanceStatus,
} from './swim';
import { STAGE_ORDER, blankTree, templateForLevel, type StageTree } from './curriculum';

export type ActionResult = { message?: string; error?: string; success?: boolean; redirectTo?: string };

/** Every view reads the same dataset, so a write invalidates all of them. */
function revalidateAll(): void {
  revalidatePath('/', 'layout');
}

async function loadStudent(studentId: string) {
  const rows = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  const row = rows[0];
  if (!row) throw new Error(`No such student: ${studentId}`);
  return row;
}

async function saveProgress(studentId: string, progress: StageTree): Promise<void> {
  await db.update(students).set({ progress }).where(eq(students.id, studentId));
}

/** Parents may only act on their own children. */
async function requireOwnChild(studentId: string): Promise<void> {
  const session = await requireSession('parent', 'owner', 'instructor');
  if (session.role !== 'parent') return;
  const student = await loadStudent(studentId);
  if (student.parentName !== session.parentName) throw new Error('Not your child');
}

/* ============================== auth ============================== */

export async function loginAction(prevState: unknown, formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const asParent = formData.get('asParent') === '1';

  if (!email || !password) return { error: 'Enter your email and password.' };

  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: 'That email and password do not match.' };
  }
  if (asParent && user.role !== 'parent') {
    return { error: 'That is a staff account — use the staff login above.' };
  }
  if (!asParent && user.role === 'parent') {
    return { error: 'That is a parent account — use the parent login below.' };
  }

  await createSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    parentName: user.parentName,
  });
  
  redirect(HOME_FOR_ROLE[user.role]);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/login');
}

/* ============================== instructor ============================== */

export async function markAttendanceAction(
  studentId: string,
  date: string,
  status: AttendanceStatus,
): Promise<ActionResult> {
  await requireSession('instructor', 'owner');

  const existing = await db
    .select({ status: attendance.status })
    .from(attendance)
    .where(and(eq(attendance.studentId, studentId), eq(attendance.lessonDate, date)))
    .limit(1);
  const prevStatus = existing[0]?.status as AttendanceStatus | undefined;

  await db
    .insert(attendance)
    .values({ studentId, lessonDate: date, status })
    .onConflictDoUpdate({
      target: [attendance.studentId, attendance.lessonDate],
      set: { status },
    });

  const ledger = await db
    .select({ issuedDate: makeupCredits.issuedDate })
    .from(makeupCredits)
    .where(eq(makeupCredits.studentId, studentId));

  switch (creditEffect(prevStatus ?? null, status, ledger.map((c) => c.issuedDate), date)) {
    case 'issue':
      // Each credit expires two months after the absence that earned it.
      await db.insert(makeupCredits).values({
        id: `mc-${studentId}-${date}`,
        studentId,
        issuedDate: date,
        expiresDate: addMonthsStr(date, 2),
        status: 'available',
      });
      break;
    case 'revoke':
      // Only unspent credits come back.
      await db
        .delete(makeupCredits)
        .where(
          and(
            eq(makeupCredits.studentId, studentId),
            eq(makeupCredits.issuedDate, date),
            eq(makeupCredits.status, 'available'),
          ),
        );
      break;
  }

  revalidateAll();
  return {};
}

export async function toggleCriterionAction(
  studentId: string,
  criterionId: string,
): Promise<ActionResult> {
  await requireSession('instructor', 'owner');
  const student = await loadStudent(studentId);
  const progress = structuredClone(student.progress);
  const criterion = findCriterion(progress, criterionId);
  if (!criterion) return { error: 'Unknown criterion' };
  criterion.checked = !criterion.checked;
  await saveProgress(studentId, progress);
  revalidateAll();
  return {};
}

export async function toggleSubSkillAction(
  studentId: string,
  criterionId: string,
  subSkillId: string,
): Promise<ActionResult> {
  await requireSession('instructor', 'owner');
  const student = await loadStudent(studentId);
  const progress = structuredClone(student.progress);
  const sub = findCriterion(progress, criterionId)?.subSkills.find((s) => s.id === subSkillId);
  if (!sub) return { error: 'Unknown sub-skill' };
  sub.checked = !sub.checked;
  await saveProgress(studentId, progress);
  revalidateAll();
  return {};
}

export async function setTimedValueAction(
  studentId: string,
  criterionId: string,
  value: string,
): Promise<ActionResult> {
  await requireSession('instructor', 'owner');
  const student = await loadStudent(studentId);
  const progress = structuredClone(student.progress);
  const criterion = findCriterion(progress, criterionId);
  if (!criterion?.timed) return { error: 'Not a timed criterion' };
  criterion.recordedValue = value;
  const seconds = timeToSeconds(value);
  criterion.checked = !Number.isNaN(seconds) && seconds <= (criterion.thresholdSec ?? 0);
  await saveProgress(studentId, progress);
  revalidateAll();
  return {};
}

export async function promoteStudentAction(studentId: string): Promise<ActionResult> {
  await requireSession('instructor', 'owner');
  const student = await loadStudent(studentId);
  const next = STAGE_ORDER[STAGE_ORDER.indexOf(student.level as never) + 1];
  if (!next) return { error: 'Already at the top stage' };

  await db.insert(stageCompletions).values({
    studentId,
    stage: student.level,
    completedDate: TODAY,
    result: 'pass',
  });
  await db.insert(progressHistory).values({
    studentId,
    level: student.level,
    progress: student.progress,
  });
  await db
    .update(students)
    .set({ level: next, progress: blankTree(templateForLevel(next)) })
    .where(eq(students.id, studentId));

  revalidateAll();
  return {
    message:
      student.level === 'Foundation 2'
        ? `🏅 Ace Award earned! ${student.name} moves on to Foundation 3.`
        : `${student.name} passed the check — promoted to ${next}.`,
  };
}

export async function regressStudentAction(studentId: string): Promise<ActionResult> {
  await requireSession('instructor', 'owner');
  const student = await loadStudent(studentId);

  const snapshots = await db
    .select()
    .from(progressHistory)
    .where(eq(progressHistory.studentId, studentId))
    .orderBy(desc(progressHistory.createdAt))
    .limit(1);
  const snapshot = snapshots[0];
  if (!snapshot) return { error: 'Nothing to undo' };

  await db
    .update(students)
    .set({ level: snapshot.level, progress: snapshot.progress })
    .where(eq(students.id, studentId));
  await db.delete(progressHistory).where(eq(progressHistory.id, snapshot.id));
  await db.insert(stageCompletions).values({
    studentId,
    stage: student.level,
    completedDate: TODAY,
    result: 'regressed',
  });

  revalidateAll();
  return { message: `${student.name} moved back to ${snapshot.level} — promotion undone.` };
}

/* ============================== make-ups ============================== */

async function spendCredit(
  creditId: string,
  used: { date: string; hour?: number; classId?: string },
): Promise<boolean> {
  const rows = await db.select().from(makeupCredits).where(eq(makeupCredits.id, creditId)).limit(1);
  const credit = rows[0];
  if (!credit || computeCreditStatus(credit) !== 'available') return false;

  await db
    .update(makeupCredits)
    .set({
      status: 'used',
      usedDate: used.date,
      usedHour: used.hour ?? null,
      usedClassId: used.classId ?? null,
    })
    .where(eq(makeupCredits.id, creditId));
  return true;
}

export async function bookMakeupAction(
  studentId: string,
  creditId: string,
  classId: string,
  date: string,
): Promise<ActionResult> {
  await requireOwnChild(studentId);
  if (!(await spendCredit(creditId, { date, classId }))) {
    return { error: 'That credit is no longer available.' };
  }
  await db.insert(makeupBookings).values({ creditId, studentId, classId, bookedDate: date });
  await db
    .insert(attendance)
    .values({ studentId, lessonDate: date, status: 'makeup' })
    .onConflictDoUpdate({
      target: [attendance.studentId, attendance.lessonDate],
      set: { status: 'makeup' },
    });

  revalidateAll();
  return { message: `Make-up booked for ${formatDateLabel(date)}.` };
}

/**
 * The coach's own painted slots are 1:1 sessions rather than seats in a group class, so
 * any child with a credit can take one regardless of level.
 */
export async function bookSlotAction(
  studentId: string,
  date: string,
  hour: number,
): Promise<ActionResult> {
  await requireOwnChild(studentId);

  const slots = await db
    .select()
    .from(coachSlots)
    .where(and(eq(coachSlots.slotDate, date), eq(coachSlots.slotHour, hour)))
    .limit(1);
  const slot = slots[0];
  if (!slot || slot.studentId) return { error: 'That slot is no longer free.' };

  const credits = await db
    .select()
    .from(makeupCredits)
    .where(and(eq(makeupCredits.studentId, studentId), eq(makeupCredits.status, 'available')));
  const credit = credits.find((c) => computeCreditStatus(c) === 'available');
  if (!credit) return { error: 'No available make-up credit.' };

  if (!(await spendCredit(credit.id, { date, hour }))) {
    return { error: 'That credit is no longer available.' };
  }
  await db
    .update(coachSlots)
    .set({ studentId, creditId: credit.id })
    .where(and(eq(coachSlots.slotDate, date), eq(coachSlots.slotHour, hour)));
  await db
    .insert(attendance)
    .values({ studentId, lessonDate: date, status: 'makeup' })
    .onConflictDoUpdate({
      target: [attendance.studentId, attendance.lessonDate],
      set: { status: 'makeup' },
    });

  const student = await loadStudent(studentId);
  revalidateAll();
  return {
    message: `Make-up booked for ${student.name.split(' ')[0]}, ${formatDateLabel(date)} ${formatHourLabel(hour)}.`,
  };
}

/* ============================== owner ============================== */

export async function toggleSlotAction(date: string, hour: number): Promise<ActionResult> {
  await requireSession('owner', 'instructor');
  const existing = await db
    .select()
    .from(coachSlots)
    .where(and(eq(coachSlots.slotDate, date), eq(coachSlots.slotHour, hour)))
    .limit(1);

  if (existing[0]) {
    if (existing[0].studentId) return { error: 'That slot is already booked.' };
    await db
      .delete(coachSlots)
      .where(and(eq(coachSlots.slotDate, date), eq(coachSlots.slotHour, hour)));
  } else {
    await db.insert(coachSlots).values({ slotDate: date, slotHour: hour });
  }
  revalidateAll();
  return {};
}

export async function blockDateAction(date: string): Promise<ActionResult> {
  await requireSession('owner', 'instructor');
  if (!date) return { error: 'Pick a date first.' };
  await db.insert(blockedDates).values({ blockedDate: date }).onConflictDoNothing();
  revalidateAll();
  return { message: `Blocked ${formatDateLabel(date)} for make-ups.` };
}

export async function unblockDateAction(date: string): Promise<ActionResult> {
  await requireSession('owner', 'instructor');
  await db.delete(blockedDates).where(eq(blockedDates.blockedDate, date));
  revalidateAll();
  return {};
}

export async function setCapacityAction(classId: string, capacity: number): Promise<ActionResult> {
  await requireSession('owner');
  if (!Number.isInteger(capacity) || capacity < 1) return { error: 'Capacity must be at least 1.' };
  await db.update(classes).set({ capacity }).where(eq(classes.id, classId));
  revalidateAll();
  return {};
}

export async function generateInvoicesAction(): Promise<ActionResult> {
  await requireSession('owner');
  const parents = await db
    .selectDistinct({ parentName: students.parentName })
    .from(students);
  await db
    .insert(invoices)
    .values(parents.map((p) => ({ parentName: p.parentName, period: PERIOD, status: 'pending' })))
    .onConflictDoNothing();
  revalidateAll();
  return { message: `${parents.length} invoices generated from attendance.` };
}

export async function markInvoicePaidAction(parentName: string): Promise<ActionResult> {
  await requireSession('owner');
  await db
    .update(invoices)
    .set({ status: 'paid' })
    .where(and(eq(invoices.parentName, parentName), eq(invoices.period, PERIOD)));
  revalidateAll();
  return { message: `Marked ${parentName}'s invoice as paid.` };
}

/* ============================== student management ============================== */

export async function addStudentAction(
  name: string,
  level: string,
  parentName: string,
  venue: string,
  rate: number,
  classId: string,
): Promise<ActionResult> {
  await requireSession('owner');

  const trimmedName = name.trim();
  const trimmedParent = parentName.trim();
  if (!trimmedName || !trimmedParent) {
    return { error: 'Student name and parent name are required.' };
  }

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.parentName, trimmedParent))
    .limit(1);

  if (existingUser.length === 0) {
    const email = `${trimmedParent.toLowerCase().replace(/\s+/g, '.')}@swimanager.test`;
    const passwordHash = await hashPassword('swim1234');
    await db.insert(users).values({
      email,
      passwordHash,
      name: trimmedParent,
      role: 'parent',
      parentName: trimmedParent,
    });
  }

  const studentId = `s-${trimmedName.toLowerCase().replace(/\s+/g, '-')}`;
  const progress = blankTree(templateForLevel(level));

  await db.insert(students).values({
    id: studentId,
    name: trimmedName,
    level,
    parentName: trimmedParent,
    venue,
    rate,
    progress,
  });

  const classRow = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
  if (classRow[0]) {
    const currentIds = classRow[0].studentIds ?? [];
    await db
      .update(classes)
      .set({ studentIds: [...currentIds, studentId] })
      .where(eq(classes.id, classId));
  }

  revalidateAll();
  return { message: `Added ${trimmedName}.` };
}

export async function deleteStudentAction(studentId: string): Promise<ActionResult> {
  await requireSession('owner');

  const student = await loadStudent(studentId);

  const allClasses = await db.select().from(classes);
  for (const cls of allClasses) {
    if (cls.studentIds?.includes(studentId)) {
      await db
        .update(classes)
        .set({ studentIds: cls.studentIds.filter((id) => id !== studentId) })
        .where(eq(classes.id, cls.id));
    }
  }

  await db.delete(students).where(eq(students.id, studentId));
  revalidateAll();
  return { message: `Removed ${student.name}.` };
}
