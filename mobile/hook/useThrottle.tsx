import { useRef } from "react";

// Throttle Custom Hook (Prevent rapid spam clicks)
export function useThrottle<Args extends unknown[], R>(
  callback: (...args: Args) => R,
  delay = 2000,
): (...args: Args) => void {
  const lastRun = useRef<number>(0);
  return (...args: Args) => {
    const now = Date.now();
    if (now - lastRun.current >= delay) {
      lastRun.current = now;
      callback(...args);
    }
  };
}
