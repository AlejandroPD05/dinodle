import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCalendarEntries } from '../../services/profileService';
import type { CalendarEntry } from '../../services/profileService';
import { getMonthDays } from '../../utils/calendar';

export function Calendar() {
  const { session } = useAuth();
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }
    getCalendarEntries(session.user.id)
      .then(setEntries)
      .catch((err: Error) => setError(err.message));
  }, [session]);

  if (error) {
    return <p role="alert">{error}</p>;
  }

  const today = new Date();
  const days = getMonthDays(today.getFullYear(), today.getMonth());
  const entryByDate = new Map(entries.map((entry) => [entry.date, entry.won]));
  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div>
      <h2>{today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h2>
      <div className="calendar-grid" role="list">
        {days.map((day) => {
          const dayStr = day.toISOString().slice(0, 10);
          const won = entryByDate.get(dayStr);
          const isToday = dayStr === todayStr;

          let symbol = '⬜';
          let outcome = 'sin jugar';
          if (won === true) {
            symbol = '🟩';
            outcome = 'victoria';
          }
          if (won === false) {
            symbol = '🟥';
            outcome = 'derrota';
          }

          const label = `Día ${day.getDate()}${isToday ? ' (hoy)' : ''}: ${outcome}`;

          return (
            <div key={dayStr} className="calendar-day" role="listitem" aria-label={label} title={label}>
              <span aria-hidden="true">{isToday ? `[${symbol}]` : symbol}</span> {day.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}