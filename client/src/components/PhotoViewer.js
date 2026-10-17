import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';

// Full-screen view of one photo (loads the full-size image on open).
export default function PhotoViewer({ photo, onClose, onDelete }) {
  const [full, setFull] = useState(null);
  useEffect(() => {
    let live = true;
    api.get(`/photos/${photo._id}`).then(r => live && setFull(r.data.image)).catch(() => {});
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => { live = false; window.removeEventListener('keydown', esc); };
  }, [photo._id, onClose]);

  return (
    <div className="modal-overlay viewer" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="viewer-body">
        <img src={full || photo.thumb} alt={photo.note || 'Photo'} className={full ? '' : 'blurry'} />
        <div className="viewer-bar">
          <span className="mono">{photo.date}{photo.weight ? ` · ${photo.weight} kg` : ''}{photo.pose ? ` · ${photo.pose}` : ''}{photo.mealType ? ` · ${photo.mealType.replace('_', ' ')}` : ''}</span>
          <span style={{ display: 'flex', gap: 8 }}>
            {onDelete && <button className="btn ghost sm" onClick={() => onDelete(photo)}>Delete</button>}
            <button className="btn primary sm" onClick={onClose}>Close</button>
          </span>
        </div>
      </div>
    </div>
  );
}
