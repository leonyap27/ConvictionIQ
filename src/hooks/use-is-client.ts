import { useEffect, useState } from "react";

/** Returns true only after client hydration completes. */
export function useIsClient(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
