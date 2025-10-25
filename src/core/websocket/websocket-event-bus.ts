type Listener = (...args: unknown[]) => void;

class EventBus {
  private events: Record<string, Listener[]> = {};

  on(event: string, callback: Listener) {
    this.events[event] = [...(this.events[event] || []), callback];
  }

  off(event: string, callback: Listener) {
    this.events[event] = (this.events[event] || []).filter(cb => cb !== callback);
  }

  emit(event: string, ...args: unknown[]) {
    (this.events[event] || []).forEach(cb => cb(...args));
  }
}

export const WebSocketEventBus = new EventBus();
