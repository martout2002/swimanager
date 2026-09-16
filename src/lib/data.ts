import 'server-only';
import { desc } from 'drizzle-orm';
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
} from '@/db/schema';
import type { School } from './school';

/** Everything the three views read. One round of queries, no per-component fetching. */
export async function loadSchool(): Promise<School> {
  const [
    studentRows,
    classRows,
    attendanceRows,
    creditRows,
    bookingRows,
    slotRows,
    blockedRows,
    invoiceRows,
    completionRows,
    historyRows,
  ] = await Promise.all([
    db.select().from(students),
    db.select().from(classes),
    db.select().from(attendance),
    db.select().from(makeupCredits),
    db.select().from(makeupBookings),
    db.select().from(coachSlots),
    db.select().from(blockedDates),
    db.select().from(invoices),
    db.select().from(stageCompletions).orderBy(stageCompletions.createdAt),
    db
      .select({ studentId: progressHistory.studentId, level: progressHistory.level })
      .from(progressHistory)
      .orderBy(desc(progressHistory.createdAt)),
  ]);

  const undoTargets: Record<string, string> = {};
  for (const row of historyRows) {
    undoTargets[row.studentId] ??= row.level;
  }

  return {
    students: studentRows
      .map((s) => ({
        id: s.id,
        name: s.name,
        level: s.level,
        parentName: s.parentName,
        venue: s.venue,
        rate: s.rate,
        progress: s.progress,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    classes: classRows.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startHour - b.startHour),
    attendance: attendanceRows.map((r) => ({
      studentId: r.studentId,
      lessonDate: r.lessonDate,
      status: r.status as School['attendance'][number]['status'],
    })),
    credits: creditRows,
    bookings: bookingRows.map((b) => ({
      creditId: b.creditId,
      studentId: b.studentId,
      classId: b.classId,
      bookedDate: b.bookedDate,
    })),
    slots: slotRows,
    blockedDates: blockedRows.map((b) => b.blockedDate),
    invoices: invoiceRows,
    completions: completionRows.map((c) => ({
      studentId: c.studentId,
      stage: c.stage,
      completedDate: c.completedDate,
      result: c.result,
    })),
    undoTargets,
  };
}
