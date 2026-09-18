/**
 * Seeds the demo school: staff and parent accounts, six students with their progress,
 * four weekly classes, and August 2026 attendance.
 * Usage: bun run db:seed
 */
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import {
  blankTree,
  cloneTree,
  seedChecked,
  templateForLevel,
  type StageTree,
} from '../src/lib/curriculum';

const PASSWORD = 'swim1234';

const USERS = [
  { email: 'owner@swimanager.test', name: 'Martin', role: 'owner', parentName: null },
  { email: 'lincoln@swimanager.test', name: 'Lincoln', role: 'instructor', parentName: null },
  { email: 'aileen@swimanager.test', name: 'Aileen', role: 'parent', parentName: 'Aileen' },
  { email: 'fiona@swimanager.test', name: 'Fiona', role: 'parent', parentName: 'Fiona' },
  { email: 'wang@swimanager.test', name: 'Wang', role: 'parent', parentName: 'Wang' },
  { email: 'matija@swimanager.test', name: 'Matija', role: 'parent', parentName: 'Matija' },
];

const STUDENTS = [
  { id: 'kaihsu', name: 'Kai Hsu', level: 'Stage 1', parentName: 'Fiona', venue: "D'Leedon", rate: 70 },
  { id: 'kaiyang', name: 'Kai Yang', level: 'Stage 1', parentName: 'Fiona', venue: "D'Leedon", rate: 40 },
  { id: 'oscar', name: 'Oscar', level: 'Stage 1', parentName: 'Wang', venue: "D'Leedon", rate: 40 },
  { id: 'anna', name: 'Anna', level: 'Silver', parentName: 'Matija', venue: "D'Leedon", rate: 70 },
  { id: 'ella', name: 'Ella Phua', level: 'Foundation 1', parentName: 'Aileen', venue: 'Amber Residences', rate: 45 },
  { id: 'oli', name: 'Oli Phua', level: 'Stage 1', parentName: 'Aileen', venue: 'Amber Residences', rate: 45 },
];

/** Kai Hsu keeps the template's own ticks; everyone else gets a blank, lightly re-seeded copy. */
const PROGRESS: Record<string, StageTree> = {
  kaihsu: cloneTree(templateForLevel('Stage 1')),
  kaiyang: seedChecked(blankTree(templateForLevel('Stage 1')), ['a1', 'a2']),
  oli: seedChecked(blankTree(templateForLevel('Stage 1')), ['a1', 'a2', 'a5']),
  ella: seedChecked(blankTree(templateForLevel('Foundation 1')), ['f1-1', 'f1-3']),
  oscar: seedChecked(blankTree(templateForLevel('Stage 1')), ['a1']),
  anna: seedChecked(blankTree(templateForLevel('Silver')), ['slv-2', 'slv-7', 'slv-8']),
};

// dayOfWeek: 0=Sun..6=Sat. capacity and levels are what the make-up finder checks against.
const CLASSES = [
  {
    id: 'c1', label: 'Phua siblings', dayOfWeek: 6, startHour: 9, endHour: 10,
    timeLabel: '9:00 – 10:00 AM', venue: 'Amber Residences', capacity: 3,
    levels: ['Foundation 1', 'Foundation 2', 'Foundation 3', 'Foundation 4', 'Foundation 5', 'Stage 1'],
    studentIds: ['ella', 'oli'],
  },
  {
    id: 'c2', label: 'Kai Hsu & Kai Yang', dayOfWeek: 6, startHour: 15.75, endHour: 16.75,
    timeLabel: '3:45 – 4:45 PM', venue: "D'Leedon", capacity: 2,
    levels: ['Stage 1', 'Stage 2'], studentIds: ['kaihsu', 'kaiyang'],
  },
  {
    id: 'c3', label: 'Oscar', dayOfWeek: 6, startHour: 16.75, endHour: 17.75,
    timeLabel: '4:45 – 5:45 PM', venue: "D'Leedon", capacity: 3,
    levels: ['Stage 1', 'Stage 2'], studentIds: ['oscar'],
  },
  {
    id: 'c4', label: 'Anna', dayOfWeek: 6, startHour: 17.75, endHour: 18.75,
    timeLabel: '5:45 – 6:45 PM', venue: "D'Leedon", capacity: 1,
    levels: ['Silver', 'Gold'], studentIds: ['anna'],
  },
];

// The Saturdays before "today" (2026-08-29), which is left unmarked for the instructor to act on.
const PAST_SATURDAYS = ['2026-08-01', '2026-08-08', '2026-08-15'];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  const sql = postgres(url, { prepare: false, max: 1 });
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  try {
    // Wipe the demo data so re-seeding is repeatable. Users are upserted, not dropped.
    await sql`truncate attendance, makeup_bookings, coach_slots, makeup_credits,
                       stage_completions, progress_history, invoices, blocked_dates,
                       classes, students cascade`;

    for (const user of USERS) {
      await sql`
        insert into users (email, password_hash, name, role, parent_name)
        values (${user.email}, ${passwordHash}, ${user.name}, ${user.role}, ${user.parentName})
        on conflict (email) do update
          set password_hash = excluded.password_hash,
              name = excluded.name,
              role = excluded.role,
              parent_name = excluded.parent_name`;
    }

    // Look up the instructor's ID so we can assign them as coach to every student.
    const [instructor] = await sql`select id from users where role = 'instructor' limit 1`;
    const coachId = instructor?.id ?? null;

    for (const s of STUDENTS) {
      await sql`
        insert into students (id, name, level, parent_name, venue, rate, progress, coach_id)
        values (${s.id}, ${s.name}, ${s.level}, ${s.parentName}, ${s.venue}, ${s.rate},
                ${JSON.stringify(PROGRESS[s.id])}, ${coachId})`;
    }

    for (const c of CLASSES) {
      await sql`
        insert into classes (id, label, day_of_week, start_hour, end_hour, time_label,
                             venue, capacity, levels, student_ids)
        values (${c.id}, ${c.label}, ${c.dayOfWeek}, ${c.startHour}, ${c.endHour},
                ${c.timeLabel}, ${c.venue}, ${c.capacity}, ${c.levels}, ${c.studentIds})`;
    }

    for (const date of PAST_SATURDAYS) {
      for (const s of STUDENTS) {
        await sql`
          insert into attendance (student_id, lesson_date, status)
          values (${s.id}, ${date}, 'present')`;
      }
    }

    console.log(`Seeded ${STUDENTS.length} students, ${CLASSES.length} classes, ${USERS.length} accounts.`);
    console.log(`Every account uses the password: ${PASSWORD}`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
