/** Debounce + throttle helpers (stable, typed). */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<Args extends any[]>(fn: (...args: Args) => void, delay = 300) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: Args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  return debounced;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<Args extends any[]>(fn: (...args: Args) => void, limit = 300) {
  let inThrottle = false;
  let lastArgs: Args | undefined;
  const throttled = (...args: Args) => {
    if (inThrottle) {
      lastArgs = args;
      return;
    }
    inThrottle = true;
    fn(...args);
    setTimeout(() => {
      inThrottle = false;
      if (lastArgs) {
        const pending = lastArgs;
        lastArgs = undefined;
        throttled(...pending);
      }
    }, limit);
  };
  throttled.cancel = () => {
    inThrottle = false;
    lastArgs = undefined;
  };
  return throttled;
}
