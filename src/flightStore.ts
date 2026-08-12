export type FlightRuntime = {
  progress: number;
  mouseX: number;
  mouseY: number;
  lowPerformance: boolean;
  reducedMotion: boolean;
};

export const flightRuntime: FlightRuntime = {
  progress: 0,
  mouseX: 0,
  mouseY: 0,
  lowPerformance: false,
  reducedMotion: false,
};

type FlightRuntimeListener = () => void;

const runtimeListeners = new Set<FlightRuntimeListener>();

function emitRuntimeChange() {
  runtimeListeners.forEach((listener) => listener());
}

export function setRuntimeProgress(progress: number) {
  const nextProgress = Math.min(1, Math.max(0, progress));
  if (nextProgress === flightRuntime.progress) return;
  flightRuntime.progress = nextProgress;
  emitRuntimeChange();
}

export function setRuntimeMouse(mouseX: number, mouseY: number) {
  const nextMouseX = Math.min(1, Math.max(-1, mouseX));
  const nextMouseY = Math.min(1, Math.max(-1, mouseY));
  if (nextMouseX === flightRuntime.mouseX && nextMouseY === flightRuntime.mouseY) return;
  flightRuntime.mouseX = nextMouseX;
  flightRuntime.mouseY = nextMouseY;
  emitRuntimeChange();
}

export function setRuntimePerformanceFlags(flags: Partial<Pick<FlightRuntime, "lowPerformance" | "reducedMotion">>) {
  const changed = Object.entries(flags).some(
    ([key, value]) => flightRuntime[key as keyof FlightRuntime] !== value,
  );
  if (!changed) return;
  Object.assign(flightRuntime, flags);
  emitRuntimeChange();
}

export function subscribeFlightRuntime(listener: FlightRuntimeListener) {
  runtimeListeners.add(listener);
  return () => runtimeListeners.delete(listener);
}
