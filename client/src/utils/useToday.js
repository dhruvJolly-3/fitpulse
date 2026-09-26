import { useEffect, useState } from 'react';
import { format } from 'date-fns';

// Today's date as 'YYYY-MM-DD' that stays correct while the app is open.
// Pages used to compute this once when the file loaded, so an installed app
// left open overnight kept logging to yesterday. This hook re-checks:
//   • at the next local midnight
//   • whenever the tab / installed app comes back to the foreground
// and re-renders the page (whose effects refetch because they depend on it).
export const todayStr = () => format(new Date(), 'yyyy-MM-dd');

export default function useToday() {
  const [today, setToday] = useState(todayStr);

  useEffect(() => {
    const refresh = () => setToday(prev => (prev === todayStr() ? prev : todayStr()));

    // Timer to just after the next midnight, re-armed after it fires
    let timer;
    const arm = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
      timer = setTimeout(() => { refresh(); arm(); }, next - now);
    };
    arm();

    // Phones pause timers in the background, so also check on return
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return today;
}
