import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  doublePrecision,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';
import type { StageTree } from '@/lib/curriculum';

export type Role = 'owner' | 'instructor' | 'parent';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').$type<Role>().notNull().default('instructor'),
  parentName: text('parent_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const students = pgTable('students', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  level: text('level').notNull(),
  parentName: text('parent_name').notNull(),
  venue: text('venue').notNull(),
  rate: integer('rate').notNull(),
  progress: jsonb('progress').$type<StageTree>().notNull(),
});

export const classes = pgTable('classes', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  dayOfWeek: integer('day_of_week').notNull(),
  startHour: doublePrecision('start_hour').notNull(),
  endHour: doublePrecision('end_hour').notNull(),
  timeLabel: text('time_label').notNull(),
  venue: text('venue').notNull(),
  capacity: integer('capacity').notNull(),
  levels: text('levels').array().notNull(),
  studentIds: text('student_ids').array().notNull(),
});

export const attendance = pgTable(
  'attendance',
  {
    studentId: text('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    lessonDate: text('lesson_date').notNull(),
    status: text('status').notNull(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.lessonDate] })],
);

export const makeupCredits = pgTable('makeup_credits', {
  id: text('id').primaryKey(),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  issuedDate: text('issued_date').notNull(),
  expiresDate: text('expires_date').notNull(),
  status: text('status').notNull().default('available'),
  usedDate: text('used_date'),
  usedHour: integer('used_hour'),
  usedClassId: text('used_class_id'),
});

export const makeupBookings = pgTable('makeup_bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  creditId: text('credit_id')
    .notNull()
    .references(() => makeupCredits.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  classId: text('class_id')
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  bookedDate: text('booked_date').notNull(),
});

export const coachSlots = pgTable(
  'coach_slots',
  {
    slotDate: text('slot_date').notNull(),
    slotHour: integer('slot_hour').notNull(),
    studentId: text('student_id').references(() => students.id, { onDelete: 'set null' }),
    creditId: text('credit_id').references(() => makeupCredits.id, { onDelete: 'set null' }),
  },
  (t) => [primaryKey({ columns: [t.slotDate, t.slotHour] })],
);

export const blockedDates = pgTable('blocked_dates', {
  blockedDate: text('blocked_date').primaryKey(),
});

export const invoices = pgTable(
  'invoices',
  {
    parentName: text('parent_name').notNull(),
    period: text('period').notNull(),
    status: text('status').notNull().default('pending'),
  },
  (t) => [primaryKey({ columns: [t.parentName, t.period] })],
);

export const stageCompletions = pgTable('stage_completions', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  stage: text('stage').notNull(),
  completedDate: text('completed_date').notNull(),
  result: text('result').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const progressHistory = pgTable('progress_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  level: text('level').notNull(),
  progress: jsonb('progress').$type<StageTree>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
