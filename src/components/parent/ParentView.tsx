'use client';

import { useState } from 'react';
import { IconBack, IconCheck } from '@/components/icons';
import { Ring } from '@/components/Ring';
import { WeekGrid } from '@/components/WeekGrid';
import { useAction } from '@/components/Toast';
import { bookMakeupAction, bookSlotAction } from '@/lib/actions';
import { STAGE_ORDER, STAGE_ROADMAP } from '@/lib/curriculum';
import {
  PERIOD,
  TODAY,
  addDaysStr,
  computeCreditStatus,
  criterionAchieved,
  formatDateLabel,
  formatHourLabel,
  formatWeekLabel,
  stagePct,
  weekStartOf,
} from '@/lib/swim';
import {
  classById,
  creditsFor,
  eligibleMakeupSlots,
  hasAvailableCredit,
  invoiceForParent,
  invoiceStatus,
  invoicesGenerated,
  parentChildren,
  type Credit,
  type School,
  type Student,
} from '@/lib/school';
import { PayNowQr } from './PayNowQr';

type Tab = 'progress' | 'roadmap' | 'schedule';

export function ParentView({ school, parentName }: { school: School; parentName: string }) {
  const kids = parentChildren(school, parentName);
  const [childId, setChildId] = useState(kids[0]?.id ?? '');
  const [tab, setTab] = useState<Tab>('progress');

  const child = kids.find((k) => k.id === childId) ?? kids[0];
  if (!child) {
    return (
      <div className="stage">
        <div className="phone">
          <div className="phone-body">
            <div className="card">
              <p style={{ fontSize: 13, color: 'var(--slate)' }}>
                No children are linked to this account yet.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stage">
      <div className="phone">
        <div className="phone-status">
          <span>Signed in as {parentName}</span>
        </div>
        <div className="phone-header">
          <div>
            <h2>Progress</h2>
            <div className="sub">{[...new Set(kids.map((k) => k.venue))].join(' & ')}</div>
          </div>
        </div>

        <div className="phone-body">
          <div className="child-tabs">
            {kids.map((kid) => (
              <button
                key={kid.id}
                className={`child-tab ${kid.id === child.id ? 'active' : ''}`}
                onClick={() => setChildId(kid.id)}
              >
                <div className="cname">{kid.name.split(' ')[0]}</div>
                <div className="clevel">{kid.level}</div>
              </button>
            ))}
          </div>

          <div className="subtab-row">
            {(
              [
                ['progress', 'Progress'],
                ['roadmap', 'All stages'],
                ['schedule', 'Book a slot'],
              ] as [Tab, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                className={`subtab ${tab === value ? 'active' : ''}`}
                onClick={() => setTab(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'progress' && (
            <Progress school={school} child={child} parentName={parentName} />
          )}
          {tab === 'roadmap' && <Roadmap child={child} />}
          {tab === 'schedule' && <SlotPicker school={school} parentName={parentName} />}
        </div>
      </div>
    </div>
  );
}

/* ---------- progress + invoice ---------- */

function Progress({
  school,
  child,
  parentName,
}: {
  school: School;
  child: Student;
  parentName: string;
}) {
  const pct = stagePct(child.progress);
  const firstName = child.name.split(' ')[0];
  const notable = child.progress.sequences.flatMap((s) => s.criteria).filter((c) => !c.timed);
  const done = notable.filter(criterionAchieved).slice(0, 3);
  const next = notable.filter((c) => !criterionAchieved(c)).slice(0, 2);

  return (
    <>
      <div className="stage-summary">
        <Ring pct={pct} color="var(--blue)" />
        <div>
          <div className="sname">
            {firstName} — {child.level}
          </div>
          <div className="scaption">on track for the next assessment</div>
        </div>
      </div>

      <div className="card">
        <div className="kicker">What {firstName} has nailed</div>
        <p className="lesson-note">
          {done.length ? (
            done.map((c) => (
              <span key={c.id}>
                ✓ {c.text}
                <br />
              </span>
            ))
          ) : (
            <>Just getting started — check back after the next lesson.</>
          )}
        </p>
      </div>

      <div className="card">
        <div className="kicker">What we&apos;re working on next</div>
        <p className="lesson-note">
          {next.length ? (
            next.map((c) => (
              <span key={c.id}>
                {c.text}
                <br />
              </span>
            ))
          ) : (
            <>Every criterion in this stage is looking strong.</>
          )}
        </p>
      </div>

      <CreditsCard school={school} child={child} />
      <InvoiceCard school={school} parentName={parentName} />
    </>
  );
}

function InvoiceCard({ school, parentName }: { school: School; parentName: string }) {
  const [showQr, setShowQr] = useState(false);
  const monthName = new Date(`${PERIOD}-01`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  if (!invoicesGenerated(school, PERIOD)) {
    return (
      <div className="card">
        <p style={{ fontSize: 13, color: 'var(--slate)' }}>
          Your {monthName.split(' ')[0]} invoice hasn&apos;t been issued yet — it&apos;s generated
          from actual attendance once the month wraps up.
        </p>
      </div>
    );
  }

  const invoice = invoiceForParent(school, parentName, PERIOD);
  const paid = invoiceStatus(school, parentName, PERIOD) === 'paid';

  return (
    <div className="card">
      <div className="kicker">Invoice — {monthName}</div>
      {invoice.lines.map((line) => (
        <div className="invoice-line" key={line.studentId}>
          <span>
            {line.name} — {line.count} lesson{line.count === 1 ? '' : 's'}
          </span>
          <span>${line.amount}</span>
        </div>
      ))}
      <div className="invoice-total">
        <span>{paid ? 'Total' : 'Total due'}</span>
        <span>${invoice.total}</span>
      </div>

      {paid ? (
        <div style={{ marginTop: 12 }}>
          <span className="pill pill-green">
            <IconCheck /> Paid
          </span>
        </div>
      ) : (
        <>
          <button
            className="btn btn-coral btn-block"
            style={{ marginTop: 14 }}
            onClick={() => setShowQr(true)}
          >
            Pay now
          </button>
          {showQr && <PayNowQr reference={invoice.ref} />}
        </>
      )}
    </div>
  );
}

/* ---------- make-up credits ---------- */

function CreditsCard({ school, child }: { school: School; child: Student }) {
  const [openCreditId, setOpenCreditId] = useState<string | null>(null);
  const { pending, run } = useAction();
  const firstName = child.name.split(' ')[0];
  const credits = creditsFor(school, child.id);

  if (credits.length === 0) {
    return (
      <div className="card">
        <div className="kicker">{firstName}&apos;s make-up credits</div>
        <p style={{ fontSize: 12.5, color: 'var(--slate)', lineHeight: 1.5 }}>
          Earned automatically from a notified absence — up to one a month, and each one is valid
          for two months.
        </p>
      </div>
    );
  }

  return (
    <div className={`card${pending ? ' pending' : ''}`}>
      <div className="kicker">{firstName}&apos;s make-up credits</div>
      {credits.map((credit) => (
        <CreditRow
          key={credit.id}
          school={school}
          child={child}
          credit={credit}
          open={openCreditId === credit.id}
          onToggle={() => setOpenCreditId(openCreditId === credit.id ? null : credit.id)}
          run={run}
        />
      ))}
    </div>
  );
}

function CreditRow({
  school,
  child,
  credit,
  open,
  onToggle,
  run,
}: {
  school: School;
  child: Student;
  credit: Credit;
  open: boolean;
  onToggle: () => void;
  run: ReturnType<typeof useAction>['run'];
}) {
  const status = computeCreditStatus(credit);
  const firstName = child.name.split(' ')[0];
  const usedWhere = credit.usedClassId
    ? classById(school, credit.usedClassId)?.label
    : credit.usedHour != null
      ? `${formatHourLabel(credit.usedHour)} slot with your coach`
      : '';

  const slots = open && status === 'available' ? eligibleMakeupSlots(school, child.id, credit) : [];

  return (
    <div className="credit-card">
      <div className="credit-row">
        <span>
          {firstName} — earned {formatDateLabel(credit.issuedDate)}{' '}
          <span style={{ color: 'var(--slate)' }}>
            · valid until {formatDateLabel(credit.expiresDate)}
          </span>
        </span>
        {status === 'available' && <span className="pill pill-green">Available</span>}
        {status === 'used' && (
          <span className="pill pill-slate">
            Used {credit.usedDate ? formatDateLabel(credit.usedDate) : ''}
            {usedWhere ? ` — ${usedWhere}` : ''}
          </span>
        )}
        {status === 'expired' && <span className="pill pill-red">Expired</span>}
      </div>

      {status === 'available' && (
        <>
          <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={onToggle}>
            {open ? 'Hide slots' : 'Book make-up'}
          </button>
          {open &&
            (slots.length ? (
              slots.map((slot) => (
                <button
                  key={`${slot.classId}-${slot.date}`}
                  className="slot-row"
                  onClick={() =>
                    run(() => bookMakeupAction(child.id, credit.id, slot.classId, slot.date))
                  }
                >
                  <span>
                    {formatDateLabel(slot.date)} · {slot.time}
                  </span>
                  <span className="slot-meta">
                    {slot.label} · {slot.venue} · {slot.spotsLeft} spot
                    {slot.spotsLeft === 1 ? '' : 's'} left
                  </span>
                </button>
              ))
            ) : (
              <p style={{ fontSize: 12, color: 'var(--slate)', marginTop: 8 }}>
                No other class at {child.level} has room in the next couple of months — try the
                &quot;Book a slot&quot; tab for the coach&apos;s own availability instead.
              </p>
            ))}
        </>
      )}
    </div>
  );
}

/* ---------- all stages ---------- */

function Roadmap({ child }: { child: Student }) {
  const currentIdx = STAGE_ORDER.indexOf(child.level as never);
  const firstName = child.name.split(' ')[0];

  return (
    <>
      <div className="card">
        <p style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 2 }}>
          The full SwimSafer 2.0 journey — {firstName} is currently on{' '}
          <b style={{ color: 'var(--navy)' }}>{child.level}</b>.
        </p>
      </div>
      <div className="card" style={{ marginTop: 10 }}>
        {STAGE_ROADMAP.map((stage) => {
          const idx = STAGE_ORDER.indexOf(stage.name as never);
          const status = idx < currentIdx ? 'done' : idx === currentIdx ? 'current' : 'upcoming';
          return (
            <div className={`roadmap-row ${status}`} key={stage.name}>
              <div className="roadmap-dot" />
              <div style={{ flex: 1 }}>
                <div className="roadmap-top">
                  <strong>{stage.name}</strong>
                  {status === 'done' && (
                    <span className="pill pill-green">
                      <IconCheck /> Done
                    </span>
                  )}
                  {status === 'current' && <span className="pill pill-amber">Current</span>}
                  {status === 'upcoming' && <span className="pill pill-slate">Upcoming</span>}
                </div>
                <p className="roadmap-blurb">{stage.blurb}</p>
                {!stage.official && (
                  <span
                    className="verify-tag"
                    style={{ background: 'var(--blue-pale)', color: 'var(--blue)' }}
                  >
                    school level, not SwimSafer-official
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- book a slot ---------- */

function SlotPicker({ school, parentName }: { school: School; parentName: string }) {
  const [weekStart, setWeekStart] = useState(weekStartOf(TODAY));
  const [pending, setPending] = useState<{ date: string; hour: number } | null>(null);
  const { pending: busy, run } = useAction();

  const eligibleKids = parentChildren(school, parentName).filter((kid) =>
    hasAvailableCredit(school, kid.id),
  );

  return (
    <div className={busy ? 'pending' : undefined}>
      <div className="cal-nav" style={{ marginBottom: 10 }}>
        <button onClick={() => setWeekStart(addDaysStr(weekStart, -7))} aria-label="Previous week">
          <IconBack />
        </button>
        <h3 style={{ fontSize: 13, color: 'var(--navy)' }}>{formatWeekLabel(weekStart)}</h3>
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
          onCell={(date, hour, kind) => {
            if (kind === 'free') setPending({ date, hour });
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 10,
          fontSize: 11,
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
          Free — tap to book
        </span>
        <span>
          <span className="legend-dot" style={{ background: '#FDE9E2' }} />
          Already booked
        </span>
      </div>

      {pending && (
        <div className="card" style={{ marginTop: 12, borderColor: 'var(--blue)' }}>
          <div className="kicker">
            Book {formatDateLabel(pending.date)}, {formatHourLabel(pending.hour)} for…
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--slate)', marginBottom: 8 }}>
            Choose which child this make-up is for — it&apos;ll use one of their available credits.
          </p>
          {eligibleKids.length ? (
            eligibleKids.map((kid) => (
              <button
                key={kid.id}
                className="btn btn-coral btn-sm"
                style={{ margin: '0 6px 6px 0' }}
                onClick={() => {
                  run(() => bookSlotAction(kid.id, pending.date, pending.hour));
                  setPending(null);
                }}
              >
                {kid.name.split(' ')[0]}
              </button>
            ))
          ) : (
            <p style={{ fontSize: 12, color: 'var(--slate)' }}>
              No child has an available make-up credit right now.
            </p>
          )}
          <button
            className="btn btn-outline btn-sm"
            style={{ marginTop: 2 }}
            onClick={() => setPending(null)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
