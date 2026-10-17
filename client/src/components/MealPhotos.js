import React, { useRef, useState } from 'react';
import { api } from '../context/AuthContext';
import { preparePhoto } from '../utils/image';

// Photo log for one meal: a camera button plus thumbnails of that meal's photos.
// On phones the file picker offers the camera directly.
export default function MealPhotos({ date, mealType, photos, onChange, onOpen }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file) => {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const { image, thumb } = await preparePhoto(file);
      await api.post('/photos', { kind: 'meal', date, mealType, image, thumb });
      onChange();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally { setBusy(false); input.current.value = ''; }
  };

  return (
    <div className="meal-photos">
      {photos.map(p => (
        <button key={p._id} className="meal-thumb" onClick={() => onOpen(p)} title="Open photo"><img src={p.thumb} alt={`${mealType} photo`} /></button>
      ))}
      <button className="meal-thumb add" onClick={() => input.current.click()} disabled={busy} title={`Add a ${mealType.replace('_', ' ')} photo`}>
        {busy ? '…' : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        )}
      </button>
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={e => upload(e.target.files[0])} />
      {error && <span className="meal-photo-err">{error}</span>}
    </div>
  );
}
