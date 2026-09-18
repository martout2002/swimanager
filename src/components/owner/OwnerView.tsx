'use client';

import { useState } from 'react';
import { IconBack, IconCheck, IconLock, IconPencil, IconPlus, IconTrash } from '@/components/icons';
import { WeekGrid } from '@/components/WeekGrid';
import { useAction } from '@/components/Toast';
import {
  addStudentAction,
  blockDateAction,
  deleteStudentAction,
  generateInvoicesAction,
  markInvoicePaidAction,
  setCapacityAction,
  toggleSlotAction,
  unblockDateAction,
} from '@/lib/actions';
import { POOL_PROFILES, STAGE_ORDER, STAGE_ROADMAP, templateForLevel } from '@/lib/curriculum';
import {
  DOW_SHORT,
  PERIOD,
  TODAY,
  addDaysStr,
  formatDateLabel,
  formatWeekLabel,
  stageReady,
  weekStartOf,
} from '@/lib/swim';
import {
  invoiceForParent,
  invoiceStatus,
  invoicesGenerated,
  parentChildren,
  parentNames,
  studentById,
  type School,
} from '@/lib/school';

type Tab = 'overview' | 'roster' | 'billing' | 'curriculum' | 'venues' | 'classes' | 'schedule';

const TABS: [Tab, string][] = [
  ['overview', 'Overview'],
  ['roster', 'Roster'],
  ['billing', 'Billing'],
  ['curriculum', 'Curriculum'],
  ['venues', 'Venues'],
  ['classes', 'Classes'],
  ['schedule', 'Schedule'],
];

const MONTH_LABEL = new Date(`${PERIOD}-01`).toLocaleDateString('en-GB', {
  month: 'long',
  year: 'numeric',
});

export function OwnerView({ school }: { school: School }) {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="stage">
      <div className="dashboard">
        <div className="dash-nav">
          <div className="brand">Owner</div>
          {TABS.map(([value, label]) => (
            <button
              key={value}
              className={tab === value ? 'active' : ''}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="dash-main">
          {tab === 'overview' && <Overview school={school} />}
          {tab === 'roster' && <Roster school={school} />}
          {tab === 'billing' && <Billing school={school} />}
          {tab === 'curriculum' && <Curriculum />}
          {tab === 'venues' && <Venues />}
          {tab === 'classes' && <Classes school={school} />}
          {tab === 'schedule' && <Schedule school={school} />}
        </div>
      </div>
    </div>
  );
}

/* ---------- overview ---------- */

function Overview({ school }: { school: School }) {
  const parents = parentNames(school);
  const monthTotal = parents.reduce(
    (sum, p) => sum + invoiceForParent(school, p, PERIOD).total,
    0,
  );
  const pendingCount = parents.filter((p) => invoiceStatus(school, p, PERIOD) !== 'paid').length;
  const readyCount = school.students.filter((s) => stageReady(s.progress)).length;

  return (
    <>
      <h1>Overview</h1>
      <div className="dash-sub">{MONTH_LABEL}</div>

      <div className="kpi-row">
        <div className="kpi" style={{ '--kpi-color': 'var(--navy)' } as React.CSSProperties}>
          <div className="num">{school.students.length}</div>
          <div className="lbl">Active students</div>
        </div>
        <div className="kpi" style={{ '--kpi-color': 'var(--green)' } as React.CSSProperties}>
          <div className="num">${monthTotal}</div>
          <div className="lbl">Billed from actual attendance</div>
        </div>
        <div className="kpi" style={{ '--kpi-color': 'var(--amber)' } as React.CSSProperties}>
          <div className="num">{pendingCount}</div>
          <div className="lbl">Invoices pending</div>
        </div>
        <div className="kpi" style={{ '--kpi-color': 'var(--blue)' } as React.CSSProperties}>
          <div className="num">{readyCount}</div>
          <div className="lbl">Ready for assessment</div>
        </div>
      </div>

      <div className="callout">
        <b>$0</b> of this written off by an estimated discount rate — every dollar traces back to
        an actual attendance record. The old spreadsheet guessed 12.5–20% of lessons would be
        missed and billed accordingly, whether or not that was true.
      </div>

      {school.completions.length > 0 && (
        <div className="callout" style={{ background: 'var(--blue-pale)', color: 'var(--navy)' }}>
          {school.completions.map((c, i) => {
            const name = studentById(school, c.studentId)?.name ?? c.studentId;
            const next = STAGE_ORDER[STAGE_ORDER.indexOf(c.stage as never) + 1];
            return (
              <div key={i}>
                {c.result === 'regressed' ? (
                  <>
                    <b>{name}</b>’s promotion from {c.stage} was undone,{' '}
                    {formatDateLabel(c.completedDate)}.
                  </>
                ) : (
                  <>
                    <b>{name}</b> passed the {c.stage} check and was promoted to {next},{' '}
                    {formatDateLabel(c.completedDate)}.
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="section-header">
        <h3>This week</h3>
      </div>
      <div className="table-card">
        <table>
          <tbody>
            <tr>
              <th>Day</th>
              <th>Class</th>
              <th>Venue</th>
              <th>Level</th>
            </tr>
            {school.classes.map((cls) => (
              <tr key={cls.id}>
                <td>{DOW_SHORT[cls.dayOfWeek]}</td>
                <td>{cls.label}</td>
                <td>{cls.venue}</td>
                <td>
                  {cls.studentIds
                    .map((id) => studentById(school, id)?.level)
                    .filter(Boolean)
                    .join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- roster ---------- */

function Roster({ school }: { school: School }) {
  const { pending, run } = useAction();
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const venueCount = new Set(school.students.map((s) => s.venue)).size;

  const [form, setForm] = useState({
    name: '',
    level: STAGE_ORDER[0] as string,
    parentName: '',
    venue: Object.keys(POOL_PROFILES)[0],
    rate: 80,
    classId: school.classes[0]?.id ?? '',
  });

  const availableClasses = school.classes.filter((c) => {
    const hasSpace = c.studentIds.length < c.capacity;
    const levelOk = c.levels.includes(form.level);
    const venueOk = c.venue === form.venue;
    return hasSpace && levelOk && venueOk;
  });

  if (adding) {
    return (
      <>
        <h1>Add student</h1>
        <div className={`card${pending ? ' pending' : ''}`} style={{ maxWidth: 480 }}>
          <label className="field">
            <span>Student name</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Emma Tan"
            />
          </label>
          <label className="field">
            <span>Level</span>
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              {STAGE_ORDER.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Parent name</span>
            <input
              value={form.parentName}
              onChange={(e) => setForm({ ...form, parentName: e.target.value })}
              placeholder="e.g. Sarah Tan"
              list="parents"
            />
            <datalist id="parents">
              {parentNames(school).map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>Venue</span>
            <select value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })}>
              {Object.keys(POOL_PROFILES).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Rate ($/lesson)</span>
            <input
              type="number"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>Class</span>
            <select
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
              disabled={availableClasses.length === 0}
            >
              {availableClasses.length === 0 ? (
                <option>No suitable class available</option>
              ) : (
                availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} ({c.venue}, {DOW_SHORT[c.dayOfWeek]} {c.timeLabel})
                  </option>
                ))
              )}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-outline" onClick={() => setAdding(false)}>Cancel</button>
            <button
              className="btn btn-navy"
              onClick={() => {
                run(() => addStudentAction(form.name, form.level, form.parentName, form.venue, form.rate, form.classId));
                setAdding(false);
                setForm({ name: '', level: STAGE_ORDER[0], parentName: '', venue: Object.keys(POOL_PROFILES)[0], rate: 80, classId: school.classes[0]?.id ?? '' });
              }}
            >
              Add student
            </button>
          </div>
        </div>
      </>
    );
  }

  if (deleting) {
    const student = studentById(school, deleting);
    return (
      <>
        <h1>Remove student</h1>
        <div className={`card${pending ? ' pending' : ''}`} style={{ maxWidth: 420 }}>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>
            Remove <b>{student?.name}</b>? This also deletes their attendance records, make-up credits, and progress history.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="btn btn-outline" onClick={() => setDeleting(null)}>Cancel</button>
            <button
              className="btn"
              style={{ background: 'var(--coral)', color: '#fff' }}
              onClick={() => {
                run(() => deleteStudentAction(deleting));
                setDeleting(null);
              }}
            >
              Remove {student?.name.split(' ')[0]}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Roster</h1>
          <div className="dash-sub">
            {school.students.length} active students across {venueCount} venue{venueCount === 1 ? '' : 's'}
          </div>
        </div>
        <button className="btn btn-navy btn-sm" onClick={() => setAdding(true)}>
          <IconPlus size={12} /> Add student
        </button>
      </div>
      <div className="table-card">
        <table>
          <tbody>
            <tr>
              <th>Student</th>
              <th>Level</th>
              <th>Venue</th>
              <th>Parent</th>
              <th>Rate</th>
              <th />
            </tr>
            {school.students.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.level}</td>
                <td>{s.venue}</td>
                <td>{s.parentName}</td>
                <td>${s.rate}/lesson</td>
                <td>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ padding: 6, minWidth: 32, minHeight: 32 }}
                    onClick={() => setDeleting(s.id)}
                  >
                    <IconTrash size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- billing ---------- */

function Billing({ school }: { school: School }) {
  const { pending, run } = useAction();
  const parents = parentNames(school);

  if (!invoicesGenerated(school, PERIOD)) {
    return (
      <>
        <h1>Billing</h1>
        <div className="dash-sub">{MONTH_LABEL}</div>
        <div className={`card${pending ? ' pending' : ''}`} style={{ maxWidth: 520 }}>
          <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>
            Invoices for {MONTH_LABEL.split(' ')[0]} haven&apos;t been generated yet. Generating
            pulls actual attendance for the period and applies your absence-billing rules — no
            estimated discount involved.
          </p>
          <button
            className="btn btn-navy"
            style={{ marginTop: 12 }}
            onClick={() => run(generateInvoicesAction)}
          >
            Generate invoices for {MONTH_LABEL.split(' ')[0]}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Billing</h1>
      <div className="dash-sub">{MONTH_LABEL} · generated from actual attendance</div>
      <div className={`table-card${pending ? ' pending' : ''}`}>
        <table>
          <tbody>
            <tr>
              <th>Parent</th>
              <th>Children</th>
              <th>Amount</th>
              <th>Status</th>
              <th />
            </tr>
            {parents.map((parent) => {
              const invoice = invoiceForParent(school, parent, PERIOD);
              const paid = invoiceStatus(school, parent, PERIOD) === 'paid';
              return (
                <tr key={parent}>
                  <td>{parent}</td>
                  <td>{parentChildren(school, parent).map((s) => s.name).join(', ')}</td>
                  <td>${invoice.total}</td>
                  <td>
                    {paid ? (
                      <span className="pill pill-green">
                        <IconCheck /> Paid
                      </span>
                    ) : (
                      <span className="pill pill-amber">Pending</span>
                    )}
                  </td>
                  <td>
                    {!paid && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => run(() => markInvoicePaidAction(parent))}
                      >
                        Mark as paid
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- curriculum ---------- */

function Curriculum() {
  const [level, setLevel] = useState<string>('Stage 1');
  const template = templateForLevel(level);
  const official = STAGE_ROADMAP.find((s) => s.name === level)?.official ?? false;

  return (
    <>
      <h1>Curriculum — {level}</h1>
      <div className="dash-sub">
        {official
          ? 'Official criteria are locked; your coaching breakdown underneath each one is yours to edit.'
          : 'Your own pre-SwimSafer progression — fully editable, not an official SwimSafer level.'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {STAGE_ORDER.map((name) => (
          <button
            key={name}
            className={`btn btn-sm ${name === level ? 'btn-navy' : 'btn-outline'}`}
            onClick={() => setLevel(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {template.sequences.map((seq) => (
        <div key={seq.name}>
          <div className="section-header">
            <h3>{seq.name}</h3>
          </div>
          <div className="table-card" style={{ padding: '4px 16px' }}>
            {seq.criteria.map((c) => (
              <div key={c.id}>
                <div className="curric-lock-row">
                  {official ? <IconLock /> : <IconPencil />}
                  <span>
                    {c.text}
                    {c.timed && <span className="pill pill-slate">target {c.thresholdLabel}</span>}
                  </span>
                  {c.needsVerify && <span className="verify-tag">verify wording</span>}
                </div>
                {c.subSkills.map((sub) => (
                  <div className="curric-sub-row" key={sub.id}>
                    <IconPencil />
                    <span>{sub.text}</span>
                    {sub.weight > 1 && <span className="sub-weight">weight {sub.weight}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------- venues ---------- */

function Venues() {
  return (
    <>
      <h1>Venues</h1>
      <div className="dash-sub">
        Pool profiles are confirmed once per venue and reused every time a class is scheduled
        there.
      </div>
      <div className="kpi-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {Object.entries(POOL_PROFILES).map(([venue, profile]) => (
          <div className="card" key={venue} style={{ borderLeft: '3px solid var(--blue)' }}>
            <div className="kicker">{venue}</div>
            <p style={{ fontSize: 13, lineHeight: 1.7 }}>
              {profile.lengthM}m × {profile.widthM}m · depth {profile.depth}
              <br />
              {profile.lanes ? `${profile.lanes} lanes` : 'No fixed lanes'} · teaching zone:{' '}
              {profile.teachingZone}
              <br />
              Equipment on site: {profile.equipment.join(', ')}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- classes ---------- */

function Classes({ school }: { school: School }) {
  const { pending, run } = useAction();
  const [blockDate, setBlockDate] = useState('');

  return (
    <>
      <h1>Classes</h1>
      <div className="dash-sub">
        Capacity and level bands are what the make-up finder checks — a make-up can only be
        offered into a class serving the right level with room left.
      </div>
      <div className={`table-card${pending ? ' pending' : ''}`}>
        <table>
          <tbody>
            <tr>
              <th>Class</th>
              <th>Day / Time</th>
              <th>Venue</th>
              <th>Levels served</th>
              <th>Capacity</th>
              <th>Enrolled</th>
            </tr>
            {school.classes.map((cls) => (
              <tr key={cls.id}>
                <td>{cls.label}</td>
                <td>
                  {DOW_SHORT[cls.dayOfWeek]} · {cls.timeLabel}
                </td>
                <td>{cls.venue}</td>
                <td style={{ fontSize: 12 }}>{cls.levels.join(', ')}</td>
                <td>
                  <input
                    type="number"
                    min={1}
                    className="cap-input"
                    defaultValue={cls.capacity}
                    onBlur={(e) => {
                      const next = Number.parseInt(e.target.value, 10);
                      if (next !== cls.capacity) run(() => setCapacityAction(cls.id, next));
                    }}
                  />
                </td>
                <td>{cls.studentIds.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-header" style={{ marginTop: 26 }}>
        <h3>Coach availability</h3>
      </div>
      <div className="card" style={{ maxWidth: 480 }}>
        <p style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.6, marginBottom: 10 }}>
          Block a date to keep it out of the make-up finder — regular classes still run, but no
          make-up will be offered into them that day.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="date"
            value={blockDate}
            onChange={(e) => setBlockDate(e.target.value)}
            style={{
              flex: 1,
              border: '1.5px solid var(--line)',
              borderRadius: 8,
              padding: 9,
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          />
          <button
            className="btn btn-navy btn-sm"
            onClick={() => {
              run(() => blockDateAction(blockDate));
              setBlockDate('');
            }}
          >
            Block
          </button>
        </div>
        {school.blockedDates.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {school.blockedDates.map((date) => (
              <span key={date} className="pill pill-slate" style={{ margin: '3px 4px 0 0' }}>
                {formatDateLabel(date)}
                <button
                  onClick={() => run(() => unblockDateAction(date))}
                  style={{
                    border: 0,
                    background: 'none',
                    cursor: 'pointer',
                    marginLeft: 4,
                    color: 'var(--red)',
                    fontWeight: 700,
                  }}
                  aria-label={`Unblock ${date}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- schedule ---------- */

function Schedule({ school }: { school: School }) {
  const [weekStart, setWeekStart] = useState(weekStartOf(TODAY));
  const { pending, run } = useAction();

  return (
    <div className={pending ? 'pending' : undefined}>
      <h1>Schedule</h1>
      <div className="dash-sub">
        Your regular classes are shown in blue — fixed, not editable here. Click any open cell to
        mark yourself free for a make-up; parents see this exact grid and can book straight into
        it, for whichever of their children needs it.
      </div>

      <div className="cal-nav" style={{ maxWidth: 640, marginBottom: 14 }}>
        <button onClick={() => setWeekStart(addDaysStr(weekStart, -7))} aria-label="Previous week">
          <IconBack />
        </button>
        <h3 style={{ fontSize: 14, color: 'var(--navy)' }}>{formatWeekLabel(weekStart)}</h3>
        <button
          onClick={() => setWeekStart(addDaysStr(weekStart, 7))}
          style={{ transform: 'scaleX(-1)' }}
          aria-label="Next week"
        >
          <IconBack />
        </button>
      </div>

      <div className="week-grid-wrap">
        <WeekGrid
          school={school}
          weekStart={weekStart}
          onCell={(date, hour) => run(() => toggleSlotAction(date, hour))}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          marginTop: 14,
          fontSize: 12,
          color: 'var(--slate)',
          flexWrap: 'wrap',
        }}
      >
        <span>
          <span className="legend-dot" style={{ background: 'var(--blue-pale)' }} />
          Regular class
        </span>
        <span>
          <span className="legend-dot" style={{ background: 'var(--green-pale)' }} />
          Free — open to book
        </span>
        <span>
          <span className="legend-dot" style={{ background: '#FDE9E2' }} />
          Make-up booked
        </span>
      </div>
    </div>
  );
}
