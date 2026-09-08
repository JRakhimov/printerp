import { useState, useEffect } from 'react';

/**
 * Hook to toggle a boolean every `intervalMs` (defaults to 5000ms / 5s)
 */
export function useTimeCycle(intervalMs: number = 5000): boolean {
  const [toggle, setToggle] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setToggle((prev) => !prev);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return toggle;
}

/**
 * Calculates estimated completion time from remaining minutes
 */
export function formatEstimatedFinish(remainingMinutes: number): { short: string; withPrefix: string } {
  const now = new Date();
  const finish = new Date(now.getTime() + remainingMinutes * 60_000);

  const hours = String(finish.getHours()).padStart(2, '0');
  const minutes = String(finish.getMinutes()).padStart(2, '0');
  const time = `${hours}:${minutes}`;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const finishDay = new Date(finish.getFullYear(), finish.getMonth(), finish.getDate());
  const diffDays = Math.round((finishDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return {
      short: time,
      withPrefix: `закончит в ${time}`,
    };
  } else if (diffDays === 1) {
    return {
      short: `Завтра ${time}`,
      withPrefix: `закончит завтра в ${time}`,
    };
  } else {
    const day = String(finish.getDate()).padStart(2, '0');
    const month = String(finish.getMonth() + 1).padStart(2, '0');
    return {
      short: `${day}.${month} ${time}`,
      withPrefix: `закончит ${day}.${month} в ${time}`,
    };
  }
}
