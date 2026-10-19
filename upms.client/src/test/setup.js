import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
afterEach(() => cleanup());
vi.stubGlobal("scrollTo", vi.fn());
// Layout and intersection behavior are exercised in the real browser smoke checks.
vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
