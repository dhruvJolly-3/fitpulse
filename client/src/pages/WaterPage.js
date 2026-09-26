import React, { useState, useEffect } from 'react';
import useToday from '../utils/useToday';
import Pulse from '../components/Pulse';
import { format } from 'date-fns';
import { useAuth, api } from '../context/AuthContext';
import WeekBars from '../components/WeekBars';
import RangeToggle from '../components/RangeToggle';
import { rangeStart, dailySeries, loggedAverage } from '../utils/series';

const QUICK_AMOUNTS = [150, 250, 350, 500];
const DRINK_TYPES = [
  { v: 'water', label: 'Water', icon: '💧' },
  { v: 'green_tea', label: 'Green Tea', icon: '🍵' },
  { v: 'coffee', label: 'Coffee', icon: '☕' },
  { v: 'juice', label: 'Juice', icon: '🧃' },
  { v: 'sports_drink', label: 'Sports', icon: '🥤' },
];

export default function WaterPage() {
  const today = useToday(); // updates at midnight / when the app is reopened
  const { user } = useAuth();
  const [log, setLog] = useState(null);
  const [amount, setAmount] = useState(250);
  const [type, setType] = useState('water');
  const [adding, setAdding] = useState(false);
  const [weekData, setWeekData] = useState([]);
  const [range, setRange] = useState(7); // 7 or 30 days of history

  const target = user?.waterTarget || 2500;

  const fetchLog = () => api.get(`/water/${today}`).then(r => setLog(r.data)).catch(() => {});

  // Last 7 or 30 days from the server; days with no log show as 0
  const fetchWeek = (days = range) => {
    api.get(`/water/history/week?startDate=${rangeStart(days)}&days=${days}`)
      .then(r => setWeekData(dailySeries(r.data, days, 'amount', l => l.total)))
      .catch(() => {});
  };

  useEffect(() => {
    fetchLog();
    fetchWeek();
  }, [today]);

  const addWater = async (a, t) => {
    setAdding(true);
    await api.post(`/water/${today}/add`, { amount: a, type: t, time: new Date() });
    fetchLog();
    fetchWeek();
    setAdding(false);
  };

  const removeEntry = async (id) => {
    await api.delete(`/water/${today}/entry/${id}`);
    fetchLog();
    fetchWeek();
  };

  const total = log?.total || 0;
  const pct = Math.min(total / target * 100, 100);
  const remaining = Math.max(target - total, 0);

  return (
    <div className="fade-up">
      <header className="page-header">
        <div className="page-heading">
          <Pulse mood="drink" />
          <div>
          <h1 className="page-title">Hydration</h1>
          <div className="page-date">stay hydrated, stay sharp</div>
        </div>
        </div>
      </header>

      <div className="page-body">
        <div className="grid g-12">
          {/* Today's total */}
          <div className="card dark span-5">
            <div className="card-h">
              <span className="label">today</span>
              <span className={`pill ${remaining > 0 ? 'out' : 'matcha'}`}>{remaining > 0 ? `${Math.round(pct)}%` : 'goal reached'}</span>
            </div>
            <div className="num" style={{ fontSize: 64, lineHeight: 1 }}>
              {(total / 1000).toFixed(2)}<span style={{ fontSize: '0.35em', color: 'var(--cream-50)' }}> / {(target / 1000).toFixed(1)} L</span>
            </div>
            <div className="bar lime" style={{ marginTop: 16 }}><i style={{ width: `${pct}%` }} /></div>
            <div style={{ fontSize: 13, color: 'var(--cream-50)', marginTop: 14 }}>
              {remaining > 0 ? `${remaining}ml to reach your goal` : 'Daily goal reached — nice.'}
            </div>
          </div>

          {/* Quick add */}
          <div className="card span-7">
            <div className="card-h"><h3>Quick add</h3><span className="label">ml</span></div>
            <div className="chips" style={{ marginBottom: 14 }}>
              {QUICK_AMOUNTS.map(a => (
                <button key={a} className={`chip lg ${amount === a ? 'on' : ''}`}
                  onClick={() => { setAmount(a); addWater(a, type); }} disabled={adding}>
                  {a}ml
                </button>
              ))}
            </div>

            <div className="chips">
              {DRINK_TYPES.map(d => (
                <button key={d.v} className={`chip ${type === d.v ? 'on' : ''}`} onClick={() => setType(d.v)}>
                  <span>{d.icon}</span>{d.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <div className="input-affix" style={{ flex: 1 }}>
                <input type="number" placeholder="Custom" value={amount} onChange={e => setAmount(+e.target.value)} />
                <span>ml</span>
              </div>
              <button className="btn primary" onClick={() => addWater(amount, type)} disabled={adding || !amount}>
                {adding ? '…' : '+ Add'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid g-12">
          {/* Weekly chart */}
          <div className="card span-7">
            <div className="card-h">
              <div>
                <h3>{range}-day hydration</h3>
                <span className="label">target {target}ml · avg {Math.round(loggedAverage(weekData, 'amount'))}ml</span>
              </div>
              <RangeToggle value={range} onChange={d => { setRange(d); fetchWeek(d); }} />
            </div>
            <WeekBars data={weekData} xKey="day" yKey="amount" label="Water" target={target}
              isToday={d => d.date === today} format={v => `${v}ml`} />
          </div>

          {/* Today's log */}
          <div className="card span-5">
            <div className="card-h"><h3>Today's log</h3><span className="label">{log?.entries?.length || 0} drinks</span></div>
            {log?.entries?.length > 0 ? (
              [...log.entries].reverse().map((e, i) => {
                const dt = DRINK_TYPES.find(d => d.v === e.type) || DRINK_TYPES[0];
                return (
                  <div key={e._id || i} className="line-item">
                    <div className="ic">{dt.icon}</div>
                    <div>
                      <div className="t">{dt.label}</div>
                      <div className="s mono">
                        {e.time ? new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                    <div className="end">
                      <span className="kc">{e.amount}ml</span>
                      <button className="icon-btn" onClick={() => removeEntry(e._id)} title="Remove">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="muted" style={{ fontSize: 13 }}>Nothing logged yet today.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
