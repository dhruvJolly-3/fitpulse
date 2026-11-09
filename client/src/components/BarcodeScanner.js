import React, { useEffect, useRef, useState } from 'react';

// Camera barcode scanner for packaged food (EAN-13 / EAN-8 / UPC).
// Uses the browser's built-in BarcodeDetector where it exists (Chrome on
// Android, desktop Chrome/Edge) and falls back to ZXing (loaded on demand,
// so it never weighs down the main bundle) on Safari and Firefox.
// Typing the number printed under the barcode always works as a last resort.
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

export default function BarcodeScanner({ onDetected, onCancel }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('starting'); // starting | scanning | error
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');

  useEffect(() => {
    let stream = null;
    let stopped = false;
    let raf = null;
    let zxingControls = null;

    const done = (code) => {
      if (stopped) return;
      stopped = true;
      if (navigator.vibrate) navigator.vibrate(60);
      onDetected(code);
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setError('Camera is not available in this browser. Type the barcode number instead.');
        return;
      }
      try {
        if ('BarcodeDetector' in window) {
          const supported = await window.BarcodeDetector.getSupportedFormats();
          const formats = FORMATS.filter(f => supported.includes(f));
          if (formats.length) {
            const detector = new window.BarcodeDetector({ formats });
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
            if (stopped) return;
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setStatus('scanning');
            const tick = async () => {
              if (stopped) return;
              try {
                const codes = await detector.detect(videoRef.current);
                if (codes[0]?.rawValue) return done(codes[0].rawValue);
              } catch { /* frame not ready yet */ }
              raf = requestAnimationFrame(tick);
            };
            tick();
            return;
          }
        }
        // Fallback: ZXing decodes frames from the same <video> element
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (stopped) return;
        const reader = new BrowserMultiFormatReader();
        setStatus('scanning');
        zxingControls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' }, audio: false },
          videoRef.current,
          (result) => { if (result) done(result.getText()); },
        );
      } catch (err) {
        setStatus('error');
        setError(err?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access, or type the barcode number below.'
          : 'Could not start the camera. Type the barcode number below.');
      }
    };
    start();

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      zxingControls?.stop();
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [onDetected]);

  const submitManual = (e) => {
    e.preventDefault();
    const code = manual.replace(/\D/g, '');
    if (code.length >= 6) onDetected(code);
  };

  return (
    <div>
      {status !== 'error' && (
        <div className="scanner">
          <video ref={videoRef} muted playsInline />
          <div className="scan-frame" />
          {status === 'scanning' && <div className="scan-line" />}
        </div>
      )}
      <p className="muted" style={{ fontSize: 12, margin: '10px 0' }}>
        {status === 'error' ? error : status === 'starting' ? 'Starting camera…' : 'Point the camera at the barcode on the pack.'}
      </p>
      <form onSubmit={submitManual} style={{ display: 'flex', gap: 8 }}>
        <input inputMode="numeric" placeholder="Or type the barcode number" value={manual} onChange={e => setManual(e.target.value)} />
        <button className="btn primary sm" disabled={manual.replace(/\D/g, '').length < 6}>Look up</button>
      </form>
      <button className="btn ghost sm block" style={{ marginTop: 10 }} onClick={onCancel}>Back to search</button>
    </div>
  );
}
