import React, { useEffect, useRef, useState } from 'react';

// Camera barcode scanner (EAN-13/8, UPC-A/E) using ZXing, which works in every
// modern browser and inside the Android / iOS app WebViews. If the camera
// isn't available or allowed, the barcode can be typed in instead.
export default function BarcodeScanner({ onDetected, onClose }) {
  const video = useRef(null);
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');

  useEffect(() => {
    let reader, stopped = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } = await import('@zxing/library');
        const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
        ]]]);
        reader = new BrowserMultiFormatReader(hints, 150);
        if (stopped) return;
        await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          video.current,
          (result) => {
            if (!result || stopped) return;
            stopped = true;
            navigator.vibrate?.(60);
            reader.reset();
            onDetected(result.getText());
          },
        );
      } catch (err) {
        if (stopped) return;
        setError(err?.name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow it in your browser or phone settings, or type the barcode below.'
          : 'No camera available here. Type the barcode below.');
      }
    })();
    return () => { stopped = true; reader?.reset(); };
  }, [onDetected]);

  const submitManual = (e) => {
    e.preventDefault();
    const code = manual.replace(/\D/g, '');
    if (code.length >= 6) onDetected(code);
  };

  return (
    <div className="scanner">
      {!error ? (
        <div className="scanner-view">
          <video ref={video} muted playsInline />
          <div className="scanner-frame" aria-hidden="true"><span /></div>
          <p className="scanner-hint">Point the camera at the barcode</p>
        </div>
      ) : <div className="notice">{error}</div>}
      <form className="scanner-manual" onSubmit={submitManual}>
        <input inputMode="numeric" placeholder="Or type the barcode number" value={manual} onChange={e => setManual(e.target.value)} />
        <button className="btn ghost sm" type="submit">Look up</button>
      </form>
      <button className="link-btn" type="button" onClick={onClose}>Back to search</button>
    </div>
  );
}
