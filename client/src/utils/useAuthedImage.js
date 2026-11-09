import { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';

// Progress photos need the Authorization header, which a plain <img src>
// can't send. Fetch the bytes through the API client and expose an object URL.
export default function useAuthedImage(path) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!path) return undefined;
    let url = null;
    let cancelled = false;
    api.get(path, { responseType: 'blob' })
      .then(r => {
        if (cancelled) return;
        url = URL.createObjectURL(r.data);
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);
  return src;
}
