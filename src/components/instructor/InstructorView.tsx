"use client";

import { useState } from "react";
import { IconBack, IconCheck, IconLock, IconPencil } from "@/components/icons";
import { useAction } from "@/components/Toast";
import {
  markAttendanceAction,
  promoteStudentAction,
  regressStudentAction,
  setTimedValueAction,
  toggleCriterionAction,
  toggleSubSkillAction,
} from "@/lib/actions";
import { STAGE_ORDER, type Criterion } from "@/lib/curriculum";
import {
  BILLING_RULES,
  STATUS_ORDER,
  TODAY,
  addMonthsStr,
  criterionAchieved,
  criterionPct,
  formatDateLabel,
  monthLabel,
  sequencePct,
  stagePct,
  stageReady,
  ymd,
} from "@/lib/swim";
import {
  attendanceStatus,
  classById,
  classesOnDate,
  studentById,
  studentsForClassDate,
  type School,
} from "@/lib/school";

type Screen = "calendar" | "day" | "roster" | "assess";

export function InstructorView({ school }: { school: School }) {
  const [screen, setScreen] = useState<Screen>("calendar");
  const [calMonth, setCalMonth] = useState(TODAY.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [classId, setClassId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  return (
    <div className="stage">
      <div className="phone">
        {screen === "calendar" && (
          <Calendar
            school={school}
            calMonth={calMonth}
            selectedDate={selectedDate}
            onMonth={setCalMonth}
            onPick={(date) => {
              setSelectedDate(date);
              setScreen("day");
            }}
          />
        )}

        {screen === "day" && (
          <Day
            school={school}
            date={selectedDate}
            onBack={() => setScreen("calendar")}
            onOpenClass={(id) => {
              setClassId(id);
              setScreen("roster");
            }}
          />
        )}

        {screen === "roster" && classId && (
          <Roster
            school={school}
            classId={classId}
            date={selectedDate}
            onBack={() => setScreen("day")}
            onAssess={(id) => {
              setStudentId(id);
              setScreen("assess");
            }}
          />
        )}

        {screen === "assess" && studentId && (
          <Assess
            school={school}
            studentId={studentId}
            onBack={() => setScreen("roster")}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- calendar ---------- */

function Calendar({
  school,
  calMonth,
  selectedDate,
  onMonth,
  onPick,
}: {
  school: School;
  calMonth: string;
  selectedDate: string;
  onMonth: (month: string) => void;
  onPick: (date: string) => void;
}) {
  const [year, month] = calMonth.split("-").map(Number);
  const startWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const shiftMonth = (n: number) =>
    onMonth(addMonthsStr(`${calMonth}-01`, n).slice(0, 7));

  return (
    <>
      <div className="phone-header">
        <div className="cal-nav" style={{ width: "100%" }}>
          <button onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <IconBack />
          </button>
          <h2 style={{ fontSize: 16 }}>{monthLabel(year, month)}</h2>
          <button
            onClick={() => shiftMonth(1)}
            style={{ transform: "scaleX(-1)" }}
            aria-label="Next month"
          >
            <IconBack />
          </button>
        </div>
      </div>

      <div className="phone-body">
        <div className="cal-grid">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="cal-dow">
              {d}
            </div>
          ))}
          {Array.from({ length: startWeekday }, (_, i) => (
            <div key={`pad-${i}`} className="cal-cell empty" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const date = ymd(year, month, i + 1);
            const classes = [
              date === TODAY && "today",
              date === selectedDate && "selected",
              school.blockedDates.includes(date) && "blocked",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div
                key={date}
                className={`cal-cell ${classes}`}
                onClick={() => onPick(date)}
              >
                <span>{i + 1}</span>
                {classesOnDate(school, date).length > 0 && (
                  <span className="dot" />
                )}
              </div>
            );
          })}
        </div>
        <p
          style={{
            fontSize: 11.5,
            color: "var(--slate)",
            marginTop: 14,
            textAlign: "center",
          }}
        >
          Green dot = classes scheduled that day. Tap any date to view or mark
          attendance.
        </p>
      </div>
    </>
  );
}

/* ---------- a day's classes ---------- */

function Day({
  school,
  date,
  onBack,
  onOpenClass,
}: {
  school: School;
  date: string;
  onBack: () => void;
  onOpenClass: (id: string) => void;
}) {
  const classes = classesOnDate(school, date);
  const when = date > TODAY ? "upcoming" : date < TODAY ? "past" : "today";

  return (
    <>
      <div className="phone-header">
        <button className="back-btn" onClick={onBack} aria-label="Back">
          <IconBack />
        </button>
        <div>
          <h2>{formatDateLabel(date)}</h2>
          <div className="sub">
            {classes.length} class{classes.length === 1 ? "" : "es"} scheduled ·{" "}
            {when}
          </div>
        </div>
      </div>

      <div className="phone-body">
        {classes.length === 0 ? (
          <div className="card">
            <p style={{ fontSize: 13, color: "var(--slate)" }}>
              No classes scheduled this day.
            </p>
          </div>
        ) : (
          classes.map((cls) => {
            const roster = studentsForClassDate(school, cls.id, date);
            const marked = roster.filter((r) =>
              attendanceStatus(school, r.id, date),
            ).length;
            return (
              <button
                key={cls.id}
                className="class-card"
                onClick={() => onOpenClass(cls.id)}
              >
                <div>
                  <div className="class-time">{cls.timeLabel}</div>
                  <div className="class-meta">
                    {cls.label} · {cls.venue}
                    {marked ? ` · ${marked}/${roster.length} marked` : ""}
                  </div>
                </div>
                <div className="class-count">{roster.length}</div>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}

/* ---------- attendance ---------- */

function Roster({
  school,
  classId,
  date,
  onBack,
  onAssess,
}: {
  school: School;
  classId: string;
  date: string;
  onBack: () => void;
  onAssess: (studentId: string) => void;
}) {
  const cls = classById(school, classId);
  const { pending, run } = useAction();
  if (!cls) return null;

  return (
    <>
      <div className="phone-header">
        <button className="back-btn" onClick={onBack} aria-label="Back">
          <IconBack />
        </button>
        <div>
          <h2>{cls.label}</h2>
          <div className="sub">
            {formatDateLabel(date)} · {cls.timeLabel} · {cls.venue}
          </div>
        </div>
      </div>

      <div className={`phone-body${pending ? " pending" : ""}`}>
        {studentsForClassDate(school, classId, date).map(({ id, makeup }) => {
          const student = studentById(school, id);
          const current = attendanceStatus(school, id, date);
          if (!student) return null;
          return (
            <div className="student-row" key={id}>
              <div className="name-line">
                <div>
                  <div className="name">
                    {student.name}
                    {makeup && <span className="pill pill-slate">Make-up</span>}
                  </div>
                  <div className="level">{student.level}</div>
                </div>
              </div>
              <div className="status-grid">
                {STATUS_ORDER.map((key) => (
                  <button
                    key={key}
                    className={`status-btn ${current === key ? `on-${key}` : ""}`}
                    onClick={() =>
                      run(() => markAttendanceAction(id, date, key))
                    }
                  >
                    {BILLING_RULES[key].label}
                  </button>
                ))}
              </div>
              <button className="assess-link" onClick={() => onAssess(id)}>
                Assess skills →
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- assessment ---------- */

function Assess({
  school,
  studentId,
  onBack,
}: {
  school: School;
  studentId: string;
  onBack: () => void;
}) {
  const student = studentById(school, studentId);
  const [checking, setChecking] = useState(false);
  const { pending, run } = useAction();
  if (!student) return null;

  const stage = student.progress;
  const pct = stagePct(stage);
  const ready = stageReady(stage);
  const nextLevel =
    STAGE_ORDER[STAGE_ORDER.indexOf(student.level as never) + 1];
  const undoTarget = school.undoTargets[studentId];

  return (
    <>
      <div className="phone-header">
        <button className="back-btn" onClick={onBack} aria-label="Back">
          <IconBack />
        </button>
        <div>
          <h2>{student.name}</h2>
          <div className="sub">
            {student.level} · {pct}% complete
          </div>
        </div>
      </div>

      <div className={`phone-body${pending ? " pending" : ""}`}>
        {undoTarget && (
          <button
            className="btn btn-outline btn-sm"
            style={{ marginBottom: 12 }}
            onClick={() => run(() => regressStudentAction(studentId))}
          >
            ↶ Undo promotion — back to {undoTarget}
          </button>
        )}

        {ready && !checking && (
          <div className="ready-banner">
            <span>
              <IconCheck /> Ready for {student.level} assessment
            </span>
            {nextLevel ? (
              <button
                className="btn btn-sm btn-on-green"
                onClick={() => setChecking(true)}
              >
                Start assessment check
              </button>
            ) : (
              <span
                className="pill"
                style={{ background: "rgba(255,255,255,.25)", color: "#fff" }}
              >
                Top stage
              </span>
            )}
          </div>
        )}

        {ready && checking && (
          <div className="check-panel">
            <div className="kicker">Assessment check — {student.level}</div>
            <p style={{ fontSize: 13, lineHeight: 1.5 }}>
              This records that you&apos;ve personally observed {student.name}{" "}
              perform every {student.level} requirement to the SwimSafer
              standard, today.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setChecking(false)}
              >
                Not yet
              </button>
              <button
                className="btn btn-coral btn-sm"
                onClick={() => {
                  setChecking(false);
                  run(() => promoteStudentAction(studentId));
                }}
              >
                Record pass
              </button>
            </div>
          </div>
        )}

        <div className="lane-divider">
          <span />
        </div>

        {stage.sequences.map((seq) => (
          <div className="sequence" key={seq.name}>
            <div className="sequence-title">
              <span>{seq.name}</span>
              <span className="pct">{sequencePct(seq)}%</span>
            </div>
            {seq.criteria.map((c) => (
              <CriterionRow
                key={c.id}
                criterion={c}
                studentId={studentId}
                run={run}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function CriterionRow({
  criterion,
  studentId,
  run,
}: {
  criterion: Criterion;
  studentId: string;
  run: ReturnType<typeof useAction>["run"];
}) {
  const pct = criterionPct(criterion);
  const achieved = criterionAchieved(criterion);
  const plain = !criterion.timed && criterion.subSkills.length === 0;

  return (
    <div className="criterion">
      <div className="crit-top">
        {plain ? (
          <div
            className={`crit-check ${criterion.checked ? "checked" : ""}`}
            role="checkbox"
            aria-checked={criterion.checked}
            tabIndex={0}
            onClick={() =>
              run(() => toggleCriterionAction(studentId, criterion.id))
            }
          >
            {criterion.checked && <IconCheck />}
          </div>
        ) : (
          <div
            className="crit-lock"
            title="Official SwimSafer criterion — locked"
          >
            <IconLock />
          </div>
        )}
        <div className="crit-text">
          {criterion.text}
          {criterion.needsVerify && (
            <span className="verify-tag">
              wording pending verification against official card
            </span>
          )}
        </div>
      </div>

      {criterion.timed && (
        <div className="timed-row">
          <input
            type="text"
            defaultValue={criterion.recordedValue}
            onBlur={(e) => {
              if (e.target.value !== criterion.recordedValue) {
                run(() =>
                  setTimedValueAction(studentId, criterion.id, e.target.value),
                );
              }
            }}
          />
          <span className="threshold">target {criterion.thresholdLabel}</span>
          <span className={`pill ${achieved ? "pill-green" : "pill-amber"}`}>
            {achieved ? "Pass" : "Not yet"}
          </span>
        </div>
      )}

      {!criterion.timed && criterion.subSkills.length > 0 && (
        <>
          <div className="sub-block">
            <div className="sub-block-label">
              <IconPencil /> Your coaching breakdown — editable
            </div>
            {criterion.subSkills.map((sub) => (
              <div className="sub-row" key={sub.id}>
                <div
                  className={`sub-check ${sub.checked ? "checked" : ""}`}
                  role="checkbox"
                  aria-checked={sub.checked}
                  tabIndex={0}
                  onClick={() =>
                    run(() =>
                      toggleSubSkillAction(studentId, criterion.id, sub.id),
                    )
                  }
                >
                  {sub.checked && <IconCheck />}
                </div>
                <div className="sub-text">{sub.text}</div>
                {sub.weight > 1 && (
                  <div className="sub-weight">weight {sub.weight}</div>
                )}
              </div>
            ))}
          </div>
          <div className="crit-pct-tag">{pct}% of this skill demonstrated</div>
        </>
      )}
    </div>
  );
}
