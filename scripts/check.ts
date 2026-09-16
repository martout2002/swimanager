/**
 * Self-check for the two rules that are easy to get quietly wrong: make-up credit
 * issuing and attendance-driven billing. Run: bun scripts/check.ts
 */
import assert from 'node:assert/strict';
import { BILLING_RULES, computeCreditStatus, creditEffect, timeToSeconds } from '../src/lib/swim';
import { blankTree, seedChecked, templateForLevel } from '../src/lib/curriculum';
import { criterionAchieved, stagePct, stageReady } from '../src/lib/swim';
import { chargeableCount, invoiceForParent, type School } from '../src/lib/school';

/* ---------- credit ledger ---------- */

// A notified absence earns a credit; the same month never earns a second one.
assert.equal(creditEffect(null, 'absent_notified', [], '2026-08-08'), 'issue');
assert.equal(creditEffect(null, 'absent_notified', ['2026-08-01'], '2026-08-08'), 'none');
assert.equal(creditEffect(null, 'absent_notified', ['2026-07-25'], '2026-08-08'), 'issue');

// Correcting a mis-marked absence hands the credit back.
assert.equal(creditEffect('absent_notified', 'present', ['2026-08-08'], '2026-08-08'), 'revoke');
assert.equal(creditEffect('cancelled_weather', 'present', [], '2026-08-08'), 'revoke');

// A no-show is chargeable and earns nothing; swapping between two credit-earning
// statuses must not mint a second credit.
assert.equal(creditEffect(null, 'absent_no_show', [], '2026-08-08'), 'none');
assert.equal(
  creditEffect('absent_notified', 'cancelled_weather', ['2026-08-08'], '2026-08-08'),
  'none',
);
assert.equal(creditEffect('present', 'present', [], '2026-08-08'), 'none');

// Expiry is judged against the fixed demo clock (2026-08-29).
assert.equal(computeCreditStatus({ status: 'available', expiresDate: '2026-10-08' }), 'available');
assert.equal(computeCreditStatus({ status: 'available', expiresDate: '2026-07-01' }), 'expired');
assert.equal(computeCreditStatus({ status: 'used', expiresDate: '2026-07-01' }), 'used');

/* ---------- billing ---------- */

const school: School = {
  students: [
    { id: 'a', name: 'A', level: 'Stage 1', parentName: 'P', venue: 'V', rate: 70, progress: blankTree(templateForLevel('Stage 1')) },
    { id: 'b', name: 'B', level: 'Stage 1', parentName: 'P', venue: 'V', rate: 40, progress: blankTree(templateForLevel('Stage 1')) },
  ],
  classes: [],
  attendance: [
    { studentId: 'a', lessonDate: '2026-08-01', status: 'present' },
    { studentId: 'a', lessonDate: '2026-08-08', status: 'absent_no_show' },
    { studentId: 'a', lessonDate: '2026-08-15', status: 'absent_notified' },
    { studentId: 'a', lessonDate: '2026-08-22', status: 'cancelled_weather' },
    { studentId: 'a', lessonDate: '2026-08-29', status: 'makeup' },
    { studentId: 'a', lessonDate: '2026-07-25', status: 'present' },
    { studentId: 'b', lessonDate: '2026-08-01', status: 'present' },
  ],
  credits: [],
  bookings: [],
  slots: [],
  blockedDates: [],
  invoices: [],
  completions: [],
  undoTargets: {},
};

// Present and no-show bill; notified, weather-cancelled and make-ups do not. July stays out.
assert.equal(chargeableCount(school, 'a', '2026-08'), 2);
assert.equal(chargeableCount(school, 'b', '2026-08'), 1);

const invoice = invoiceForParent(school, 'P', '2026-08');
assert.equal(invoice.total, 2 * 70 + 1 * 40);
assert.equal(invoice.lines.length, 2);
assert.equal(invoice.ref, 'INV-P-202608');

// Every status is either chargeable or credit-earning, never both.
for (const rule of Object.values(BILLING_RULES)) {
  assert.ok(!(rule.chargeable && rule.credit));
}

/* ---------- progress maths ---------- */

const stage1 = blankTree(templateForLevel('Stage 1'));
assert.equal(stagePct(stage1), 0);
assert.equal(stageReady(stage1), false);

// A criterion with sub-skills is only achieved once every weighted sub-skill is ticked.
const withSubs = stage1.sequences.flatMap((s) => s.criteria).find((c) => c.subSkills.length > 0)!;
withSubs.subSkills.forEach((s) => (s.checked = true));
assert.equal(criterionAchieved(withSubs), true);
withSubs.subSkills[0].checked = false;
assert.equal(criterionAchieved(withSubs), false);

// Ticking every plain criterion is not enough while a sub-skill breakdown is unfinished.
assert.equal(stageReady(seedChecked(stage1, stage1.sequences.flatMap((s) => s.criteria).map((c) => c.id))), false);

// A timed swim passes on the recorded time, not a tick.
assert.equal(timeToSeconds('1:30'), 90);
assert.ok(Number.isNaN(timeToSeconds('90')));

console.log('All checks passed.');
