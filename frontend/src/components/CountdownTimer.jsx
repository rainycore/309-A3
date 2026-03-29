// Generated with Claude Code
import { useState, useEffect } from 'react';

export default function CountdownTimer({ expiresAt, onExpire }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, new Date(expiresAt) - new Date());
      setRemaining(diff);
      if (diff === 0 && onExpire) onExpire();
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const urgent = remaining < 60000;

  return (
    <span className={`countdown ${urgent ? 'urgent' : ''}`}>
      {remaining === 0 ? 'Expired' : `${mins}:${String(secs).padStart(2, '0')}`}
    </span>
  );
}
