export function createMountGate() {
  let inFlight = false;
  return {
    tryStart(alreadyMounted) {
      if (inFlight || alreadyMounted) return false;
      inFlight = true;
      return true;
    },
    release() {
      inFlight = false;
    },
  };
}
