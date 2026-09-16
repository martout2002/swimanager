'use client';

import {
  DOW_SHORT,
  GRID_END_HOUR,
  GRID_START_HOUR,
  addDaysStr,
  formatHourLabel,
  parseDate,
} from '@/lib/swim';
import { classesOnDate, slotAt, studentById, type School } from '@/lib/school';

/**
 * The coach's week. Regular classes are fixed; every other cell is either free, booked,
 * or empty. The owner paints availability, a parent taps a free cell to book.
 */
export function WeekGrid({
  school,
  weekStart,
  onCell,
}: {
  school: School;
  weekStart: string;
  onCell?: (date: string, hour: number, kind: 'free' | 'empty') => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDaysStr(weekStart, i));

  return (
    <div className="week-grid">
      <div className="wg-corner" />
      {days.map((d) => (
        <div key={d} className="wg-daylabel">
          {DOW_SHORT[parseDate(d).getDay()]}
          <br />
          <span className="dnum">{parseDate(d).getDate()}</span>
        </div>
      ))}

      {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i).map(
        (hour) => (
          <Row key={hour} hour={hour} days={days} school={school} onCell={onCell} />
        ),
      )}
    </div>
  );
}

function Row({
  hour,
  days,
  school,
  onCell,
}: {
  hour: number;
  days: string[];
  school: School;
  onCell?: (date: string, hour: number, kind: 'free' | 'empty') => void;
}) {
  return (
    <>
      <div className="wg-hourlabel">{formatHourLabel(hour)}</div>
      {days.map((d) => {
        const here = classesOnDate(school, d).filter((c) => Math.floor(c.startHour) === hour);
        if (here.length) {
          return (
            <div key={d} className="grid-cell class-cell">
              {here.map((c) => c.label).join(', ')}
              <span style={{ fontSize: 9 }}>{here[0].timeLabel}</span>
            </div>
          );
        }

        const slot = slotAt(school, d, hour);
        if (slot?.studentId) {
          const student = studentById(school, slot.studentId);
          return (
            <div key={d} className="grid-cell booked-cell" title={`${student?.name} — make-up`}>
              {student?.name.split(' ')[0]}
              <span style={{ fontSize: 9 }}>Make-up</span>
            </div>
          );
        }
        if (slot) {
          return (
            <div
              key={d}
              className="grid-cell available-cell"
              role={onCell ? 'button' : undefined}
              tabIndex={onCell ? 0 : undefined}
              onClick={onCell ? () => onCell(d, hour, 'free') : undefined}
            >
              Free
            </div>
          );
        }
        return (
          <div
            key={d}
            className="grid-cell empty-cell"
            role={onCell ? 'button' : undefined}
            tabIndex={onCell ? 0 : undefined}
            onClick={onCell ? () => onCell(d, hour, 'empty') : undefined}
          />
        );
      })}
    </>
  );
}
