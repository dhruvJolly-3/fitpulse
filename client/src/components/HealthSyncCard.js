import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';

// Status of on-device health sync. Health Connect (Android) and Apple Health
// (iPhone) can only be read by a native app, so syncing happens in the
// FitPulse mobile app; the web app shows when it last ran.
const NAMES = { health_connect: 'Health Connect', apple_health: 'Apple Health' };

export default function HealthSyncCard() {
  const { user } = useAuth();
  const sync = user?.healthSync;
  const synced = sync?.lastSyncAt;
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 22 }}>{synced ? '🔄' : '📱'}</span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>
          {synced ? `Synced from ${NAMES[sync.source] || 'your phone'}` : 'Sync steps, sleep and workouts automatically'}
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
          {synced
            ? `Last sync ${formatDistanceToNow(new Date(synced), { addSuffix: true })}. Open the FitPulse app to sync again.`
            : 'Install the FitPulse mobile app and connect Health Connect (Android) or Apple Health (iPhone). Your watch or phone data then shows up here.'}
        </div>
      </div>
      {synced ? <span className="pill matcha">connected</span> : <span className="pill out">not connected</span>}
    </div>
  );
}
