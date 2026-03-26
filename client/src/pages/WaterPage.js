import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth, api } from '../context/AuthContext';

const today = format(new Date(), 'yyyy-MM-dd');
const QUICK_AMOUNTS = [150, 250, 350, 500];
const DRINK_TYPES = [
  { v: 'water', label: 'Water', icon: '💧', color: '#5b8eff' },
  { v: 'green_tea', label: 'Green Tea', icon: '🍵', color: '#2ed9c3' },
  { v: 'coffee', label: 'Coffee', icon: '☕', color: '#ff9f43' },
  { v: 'juice', label: 'Juice', icon: '🧃', color: '#b5f23d' },
  { v: 'sports_drink', label: 'Sports', icon: '🥤', color: '#a78bfa' },
];

export default function WaterPage() {
  const { user } = useAuth();
  const [log, setLog] = useState(null);
  const [amount, setAmount] = useState(250);
  const [type, setType] = useState('water');
  const [adding, setAdding] = useState(false);
  const [weekData, setWeekData] = useState([]);

  const target = user?.waterTarget || 2500;

  const fetchLog = () => api.get(`/water/${today}`).then(r => setLog(r.data)).catch(() => {});

  useEffect(() => {
    fetchLog();
    // Build week mock data
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { day: format(d, 'EEE'), amount: Math.floor(Math.random() * 1500) + 1000 };
    });
    setWeekData(days);
  }, []);

  const addWater = async (a, t) => {
    setAdding(true);
    await api.post(`/water/${today}/add`, { amount: a, type: t, time: new Date() });
    fetchLog();
    setAdding(false);
  };

  const removeEntry = async (id) => {
    await api.delete(`/water/${today}/entry/${id}`);
    fetchLog();
  };

  const total = log?.total || 0;
  const pct = Math.min(total / target * 100, 100);
  const remaining = Math.max(target - total, 0);

  // Wave animation fill
  const waveHeight = pct;

  return (
    <div className="fade-up">
      <div className="page-header">
        <h1 className="page-title">Hydration</h1>
        <p className="page-subtitle">Stay hydrated, stay sharp</p>
      </div>

      <div className="page-body">
        {/* Big water display */}
        <div className="card" style={{ marginBottom: 16, textAlign: 'center', padding: '32px 24px', position: 'relative', overflow: 'hidden' }}>
          {/* Animated water bg */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${waveHeight}%`,
            background: 'linear-gradient(to top, rgba(91,142,255,0.2), rgba(91,142,255,0.05))',
            transition: 'height 0.8s cubic-bezier(0.4,0,0.2,1)',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>💧</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--accent2)', lineHeight: 1 }}>
              {(total / 1000).toFixed(2)}<span style={{ fontSize: '1.5rem' }}>L</span>
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: '0.85rem', marginTop: 6 }}>
              {remaining > 0 ? `${remaining}ml to reach goal` : '🎉 Goal reached!'}
            </div>
            <div style={{ marginTop: 16, height: 8, background: 'var(--bg-raised)', borderRadius: 4, overflow: 'hidden', maxWidth: 280, margin: '16px auto 0' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent2)', borderRadius: 4, transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 280, margin: '6px auto 0', fontSize: '0.72rem', color: 'var(--text-3)' }}>
              <span>0ml</span>
              <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>{Math.round(pct)}%</span>
              <span>{target}ml</span>
            </div>
          </div>
        </div>

        {/* Quick add buttons */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Quick Add</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {QUICK_AMOUNTS.map(a => (
              <button key={a} className={`btn btn-secondary ${amount === a ? '' : ''}`}
                onClick={() => { setAmount(a); addWater(a, type); }}
                style={{ flex: 1, padding: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, background: amount === a ? 'var(--accent2-dim)' : undefined, borderColor: amount === a ? 'var(--accent2)' : undefined }}
                disabled={adding}>
                {a}ml
              </button>
            ))}
          </div>

          {/* Drink type */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DRINK_TYPES.map(d => (
              <button key={d.v} onClick={() => setType(d.v)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 14px', borderRadius: 'var(--r-md)', border: `1px solid ${type === d.v ? d.color : 'var(--border)'}`, background: type === d.v ? `${d.color}15` : 'transparent', cursor: 'pointer', transition: 'all 0.15s', flex: 1 }}>
                <span style={{ fontSize: '1.2rem' }}>{d.icon}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: type === d.v ? d.color : 'var(--text-3)' }}>{d.label}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <input type="number" placeholder="Custom ml" value={amount}
              onChange={e => setAmount(+e.target.value)}
              style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={() => addWater(amount, type)} disabled={adding || !amount}>
              {adding ? '…' : '+ Add'}
            </button>
          </div>
        </div>

        {/* Weekly chart */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">7-Day Hydration</div>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={weekData}>
              <defs>
                <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5b8eff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#5b8eff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [`${v}ml`, 'Water']} />
              <Area type="monotone" dataKey="amount" stroke="#5b8eff" fill="url(#waterGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Today's log */}
        {log?.entries?.length > 0 && (
          <div className="card">
            <div className="card-title">Today's Log</div>
            {[...log.entries].reverse().map((e, i) => {
              const dt = DRINK_TYPES.find(d => d.v === e.type) || DRINK_TYPES[0];
              return (
                <div key={e._id || i} className="drop-animate" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.2rem' }}>{dt.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{dt.label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                        {e.time ? new Date(e.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: dt.color, fontWeight: 700 }}>{e.amount}ml</span>
                    <button className="btn btn-ghost btn-icon" onClick={() => removeEntry(e._id)} style={{ color: 'var(--text-3)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
