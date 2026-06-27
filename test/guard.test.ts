import { describe, it, expect, vi } from "vitest";
import { installNavGuard } from "../src/guard";

// addEventListener/removeEventListener 만 갖춘 가짜 타깃
function fakeTarget() {
  const listeners = new Map<string, EventListener>();
  return {
    listeners,
    addEventListener: vi.fn((type: string, fn: EventListener) => {
      listeners.set(type, fn);
    }),
    removeEventListener: vi.fn((type: string) => {
      listeners.delete(type);
    }),
  };
}

describe("installNavGuard", () => {
  it("beforeunload 핸들러를 설치한다", () => {
    const t = fakeTarget();
    installNavGuard(t);
    expect(t.addEventListener).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function)
    );
    expect(t.listeners.has("beforeunload")).toBe(true);
  });

  it("해제 함수를 호출하면 핸들러가 제거된다", () => {
    const t = fakeTarget();
    const release = installNavGuard(t);
    release();
    expect(t.removeEventListener).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function)
    );
    expect(t.listeners.has("beforeunload")).toBe(false);
  });

  it("해제를 두 번 호출해도 removeEventListener 는 한 번만", () => {
    const t = fakeTarget();
    const release = installNavGuard(t);
    release();
    release();
    expect(t.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it("핸들러는 returnValue 를 설정하고 preventDefault 한다", () => {
    const t = fakeTarget();
    installNavGuard(t);
    const handler = t.listeners.get("beforeunload")!;
    const e = {
      preventDefault: vi.fn(),
      returnValue: undefined as unknown,
    } as unknown as BeforeUnloadEvent;
    handler(e as unknown as Event);
    expect((e as BeforeUnloadEvent).preventDefault).toHaveBeenCalled();
    expect((e as BeforeUnloadEvent).returnValue).toBe("");
  });
});
