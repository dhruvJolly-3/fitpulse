import React from 'react';
import { format, subDays, getDay } from 'date-fns';

// Last-30-days activity calendar. Rows are weeks starting Monday; days with a
// logged workout (not rest/off) are matcha, today is outlined in coral.
//   activeDates  Set of 'YYYY-MM-DD' strings that count as "active"
//   titleFor     optional (date) => tooltip text
export default function MonthCalendar({ activeDates, titleFor, days = 30 }) {
  const start = subDays(new Date(), days - 1);
  const lead = (getDay(start) + 6) % 7; // blank cells so the first day sits under its weekday
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const cells = Array.from({ length: days }, (_, i) => {
    const d = subDays(new Date(), days - 1 - i);
    const date = format(d, 'yyyy-MM-dd');
    return { date, label: format(d, 'd') };
  });

  return (
    <>
      <div className="dow-row">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="month-cal">
        {Array.from({ length: lead }, (_, i) => <div key={`pad${i}`} className="cell pad" />)}
        {cells.map(c => (
          <div key={c.date} title={titleFor ? titleFor(c.date) : c.date}
            className={`cell ${activeDates.has(c.date) ? 'l3' : ''} ${c.date === todayStr ? 'today' : ''}`}>
            {c.label}
          </div>
        ))}
      </div>
    </>
  );
}
