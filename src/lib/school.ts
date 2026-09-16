import type { StageTree } from './curriculum';
import {
  BILLING_RULES,
  TODAY,
  addDaysStr,
  computeCreditStatus,
  dayOfWeekOf,
  type AttendanceStatus,
} from './swim';

export type Student = {
  id: string;
  name: string;
  level: string;
  parentName: string;
  venue: string;
  rate: number;
  progress: StageTree;
};

export type ClassRow = {
  id: string;
  label: string;
  dayOfWeek: number;
  startHour: number;
  endHour: number;
  timeLabel: string;
  venue: string;
  capacity: number;
  levels: string[];
  studentIds: string[];
};

export type AttendanceRow = { studentId: string; lessonDate: string; status: AttendanceStatus };
export type Credit = {
  id: string;
  studentId: string;
  issuedDate: string;
  expiresDate: string;
  status: string;
  usedDate: string | null;
  usedHour: number | null;
  usedClassId: string | null;
};
export type Booking = { creditId: string; studentId: string; classId: string; bookedDate: string };
export type Slot = {
  slotDate: string;
  slotHour: number;
  studentId: string | null;
  creditId: string | null;
};
export type Invoice = { parentName: string; period: string; status: string };
export type Completion = {
  studentId: string;
  stage: string;
  completedDate: string;
  result: string;
};

export type School = {
  students: Student[];
  classes: ClassRow[];
  attendance: AttendanceRow[];
  credits: Credit[];
  bookings: Booking[];
  slots: Slot[];
  blockedDates: string[];
  invoices: Invoice[];
  completions: Completion[];
  /** studentId -> the level at the top of its undo stack, when there is one. */
  undoTargets: Record<string, string>;
};

export function studentById(school: School, id: string): Student | undefined {
  return school.students.find((s) => s.id === id);
}

export function classById(school: School, id: string): ClassRow | undefined {
  return school.classes.find((c) => c.id === id);
}

export function parentNames(school: School): string[] {
  return [...new Set(school.students.map((s) => s.parentName))];
}

export function parentChildren(school: School, parentName: string): Student[] {
  return school.students.filter((s) => s.parentName === parentName);
}

export function classesOnDate(school: School, dateStr: string): ClassRow[] {
  const dow = dayOfWeekOf(dateStr);
  return school.classes.filter((c) => c.dayOfWeek === dow);
}

export function attendanceStatus(
  school: School,
  studentId: string,
  dateStr: string,
): AttendanceStatus | null {
  return (
    school.attendance.find((r) => r.studentId === studentId && r.lessonDate === dateStr)?.status ??
    null
  );
}

/** Regulars plus anyone booked in as a make-up guest on that date. */
export function studentsForClassDate(
  school: School,
  classId: string,
  dateStr: string,
): { id: string; makeup: boolean }[] {
  const cls = classById(school, classId);
  if (!cls) return [];
  const regulars = cls.studentIds.map((id) => ({ id, makeup: false }));
  const guests = school.bookings
    .filter((b) => b.classId === classId && b.bookedDate === dateStr)
    .map((b) => ({ id: b.studentId, makeup: true }));
  return [...regulars, ...guests];
}

export function chargeableCount(school: School, studentId: string, period: string): number {
  return school.attendance.filter(
    (r) =>
      r.studentId === studentId &&
      r.lessonDate.startsWith(period) &&
      BILLING_RULES[r.status].chargeable,
  ).length;
}

export type InvoiceView = {
  parentName: string;
  period: string;
  lines: { studentId: string; name: string; count: number; rate: number; amount: number }[];
  total: number;
  ref: string;
};

export function invoiceForParent(
  school: School,
  parentName: string,
  period: string,
): InvoiceView {
  const lines = parentChildren(school, parentName).map((s) => {
    const count = chargeableCount(school, s.id, period);
    return { studentId: s.id, name: s.name, count, rate: s.rate, amount: count * s.rate };
  });
  return {
    parentName,
    period,
    lines,
    total: lines.reduce((sum, l) => sum + l.amount, 0),
    ref: `INV-${parentName.toUpperCase()}-${period.replace('-', '')}`,
  };
}

export function invoicesGenerated(school: School, period: string): boolean {
  return school.invoices.some((i) => i.period === period);
}

export function invoiceStatus(school: School, parentName: string, period: string): string {
  return (
    school.invoices.find((i) => i.parentName === parentName && i.period === period)?.status ??
    'pending'
  );
}

export function creditsFor(school: School, studentId: string): Credit[] {
  return school.credits.filter((c) => c.studentId === studentId);
}

export type MakeupSlot = {
  classId: string;
  label: string;
  date: string;
  time: string;
  venue: string;
  spotsLeft: number;
};

/**
 * Classes this student could take a make-up in: the level must be served, the class must
 * not already be theirs (a make-up is an extra session), and a seat must be free.
 */
export function eligibleMakeupSlots(
  school: School,
  studentId: string,
  credit: Credit,
): MakeupSlot[] {
  const student = studentById(school, studentId);
  if (!student) return [];
  const results: MakeupSlot[] = [];
  const cap = addDaysStr(TODAY, 70);
  const horizon = credit.expiresDate < cap ? credit.expiresDate : cap;

  for (let d = TODAY; d <= horizon; d = addDaysStr(d, 1)) {
    if (school.blockedDates.includes(d)) continue;
    const dow = dayOfWeekOf(d);
    for (const cls of school.classes) {
      if (cls.dayOfWeek !== dow) continue;
      if (!cls.levels.includes(student.level)) continue;
      if (cls.studentIds.includes(studentId)) continue;
      const headcount =
        cls.studentIds.length +
        school.bookings.filter((b) => b.classId === cls.id && b.bookedDate === d).length;
      const spotsLeft = cls.capacity - headcount;
      if (spotsLeft <= 0) continue;
      results.push({
        classId: cls.id,
        label: cls.label,
        date: d,
        time: cls.timeLabel,
        venue: cls.venue,
        spotsLeft,
      });
    }
  }
  return results;
}

export function hasAvailableCredit(school: School, studentId: string): boolean {
  return creditsFor(school, studentId).some((c) => computeCreditStatus(c) === 'available');
}

export function slotAt(school: School, dateStr: string, hour: number): Slot | undefined {
  return school.slots.find((s) => s.slotDate === dateStr && s.slotHour === hour);
}
