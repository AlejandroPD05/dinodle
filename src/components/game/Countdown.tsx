import { useEffect, useState } from 'react';
import { formatCountdown, msUntilNextUtcMidnight } from '../../utils/countdown';

export function Countdown() {
  const [remaining, setRemaining] = useState(() => msUntilNextUtcMidnight());

  useEffect(() => {
    const id = setInterval(() => setRemaining(msUntilNextUtcMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="countdown" role="timer">
      {formatCountdown(remaining)}
    </span>
  );
}