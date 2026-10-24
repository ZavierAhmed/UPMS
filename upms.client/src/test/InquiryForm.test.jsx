import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import InquiryForm from "../components/inquiries/InquiryForm";
import App from "../App";
import {
  emptyInquiry,
  validateInquiry,
} from "../components/inquiries/validation";
const originalFetch = globalThis.fetch;
it('keeps static-only releases disabled without attempting inquiry delivery',()=>{
 const marker=document.createElement('meta');marker.name='public-static-release';marker.content='true';document.head.append(marker);
 try{
  globalThis.fetch=vi.fn();
  const {container}=render(<InquiryForm/>);
  expect(screen.getByRole('note').textContent).toContain('Online inquiry delivery is not enabled');
  expect(container.querySelector('fieldset').disabled).toBe(true);
  fireEvent.submit(container.querySelector('form'));
  expect(globalThis.fetch).not.toHaveBeenCalled();
 }finally{marker.remove();}
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});
const valid = {
  ...emptyInquiry,
  customerName: "Test Buyer",
  companyName: "Example Company",
  email: "buyer@example.test",
  phone: "+92 300 1234567",
  productCategory: "buckets",
  message: "Please discuss a packaging sample with us.",
};
const accepted = {
  status: "smtp_accepted",
  message:
    "Your inquiry was accepted by our mail server. Inbox receipt is not yet confirmed.",
  reference: "a".repeat(32),
  correlationId: "b".repeat(32),
};
function response(body, ok = true) {
  return { ok, json: async () => body };
}
function open() {
  return render(<InquiryForm />);
}
function fill() {
  for (const [label, value] of [
    ["Customer name", valid.customerName],
    ["Email address", valid.email],
    ["Phone number", valid.phone],
    ["Product category", valid.productCategory],
    ["Inquiry message", valid.message],
  ])
    fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), {
      target: { value },
    });
}
function send() {
  fireEvent.submit(screen.getByRole("form", { name: "Packaging inquiry" }));
}
describe("inquiry validation", () => {
  it("requires contact details, category and a useful message", () => {
    expect(Object.keys(validateInquiry(emptyInquiry)).sort()).toEqual([
      "customerName",
      "email",
      "message",
      "phone",
      "productCategory",
    ]);
    expect(validateInquiry(valid)).toEqual({});
  });
  it.each([
    ["email", "invalid"],
    ["email", "x@example.test\r\nBcc:x@example.test"],
    ["phone", "bad phone"],
    ["productCategory", "unsupported"],
    ["message", "short"],
    ["customerName", "x".repeat(101)],
    ["capacity", "x".repeat(81)],
  ])("rejects invalid %s", (key, value) => {
    expect(validateInquiry({ ...valid, [key]: value })[key]).toBeTruthy();
  });
  it("allows optional fields to be omitted", () => {
    expect(
      validateInquiry({
        ...valid,
        companyName: "",
        quantity: "",
        capacity: "",
      }),
    ).toEqual({});
  });
});
describe("inquiry form behavior", () => {
  it("labels validation errors and focuses the error summary without a network call", async () => {
    globalThis.fetch = vi.fn();
    open();
    send();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText(/^Customer name/).getAttribute("aria-invalid"),
    ).toBe("true");
    expect(
      screen.getByLabelText(/^Customer name/).getAttribute("aria-describedby"),
    ).toBe("customerName-error");
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("alert")),
    );
  });
  it("preselects a category from the existing query parameter", () => {
    render(
      <MemoryRouter initialEntries={["/contact?category=cans"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/^Product category/).value).toBe("cans");
  });
  it("ignores unrecognized category query values", () => {
    render(
      <MemoryRouter initialEntries={["/contact?category=untrusted"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/^Product category/).value).toBe("");
  });
  it("sends the API contract and waits for backend confirmation", async () => {
    let resolve;
    globalThis.fetch = vi.fn(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    open();
    fill();
    send();
    expect(screen.queryByText("Accepted by our mail server")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Sending inquiry…" }).disabled,
    ).toBe(true);
    expect(globalThis.fetch.mock.calls[0][0]).toBe("/api/v1/public/inquiries");
    const options = globalThis.fetch.mock.calls[0][1];
    expect(JSON.parse(options.body).productCategory).toBe("buckets");
    expect(options.headers["Idempotency-Key"]).toMatch(/^[a-f0-9-]{36}$/);
    await act(async () => resolve(response(accepted)));
    expect(screen.getByText("Accepted by our mail server")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "Inbox receipt is not yet confirmed",
    );
    expect(screen.queryByRole("form")).toBeNull();
  });
  it("prevents duplicate submissions while a delivery is in flight", async () => {
    let resolve;
    globalThis.fetch = vi.fn(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    open();
    fill();
    send();
    send();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    await act(async () => resolve(response(accepted)));
  });
  it("clearly distinguishes the local development outbox from email delivery", async () => {
    globalThis.fetch = vi.fn(async () =>
      response({
        ...accepted,
        status: "development_saved",
        message:
          "Development only: saved to the local outbox. No email was sent.",
      }),
    );
    open();
    fill();
    send();
    await screen.findByText("Saved for local testing");
    expect(screen.getByRole("status").textContent).toContain(
      "No email was sent",
    );
  });
  it("preserves editable fields after a known delivery failure and allows a corrected retry", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        response(
          { code: "delivery_unavailable", correlationId: "c".repeat(32) },
          false,
        ),
      )
      .mockResolvedValueOnce(response(accepted));
    open();
    fill();
    send();
    await screen.findByRole("alert");
    expect(screen.getByLabelText(/^Customer name/).value).toBe(
      valid.customerName,
    );
    fireEvent.change(screen.getByLabelText(/^Inquiry message/), {
      target: {
        value: "Revised packaging requirements after a temporary failure.",
      },
    });
    send();
    await screen.findByText("Accepted by our mail server");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
  it("maps server validation to accessible fields and keeps the draft", async () => {
    globalThis.fetch = vi.fn(async () =>
      response(
        {
          code: "validation_failed",
          errors: { phone: ["Please check this phone number."] },
        },
        false,
      ),
    );
    open();
    fill();
    send();
    await screen.findByText("Please check this phone number.");
    expect(
      screen.getByLabelText(/^Phone number/).getAttribute("aria-invalid"),
    ).toBe("true");
    expect(screen.getByLabelText(/^Inquiry message/).value).toBe(valid.message);
  });
  it("reuses the same idempotency key after an uncertain network result", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("private infrastructure"))
      .mockResolvedValueOnce(response(accepted));
    open();
    fill();
    send();
    await screen.findByRole("alert");
    send();
    await screen.findByText("Accepted by our mail server");
    expect(globalThis.fetch.mock.calls[0][1].headers["Idempotency-Key"]).toBe(
      globalThis.fetch.mock.calls[1][1].headers["Idempotency-Key"],
    );
    expect(screen.queryByText("private infrastructure")).toBeNull();
  });
  it("keeps an uncertain request key even if a retry is rate limited", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(response({ code: "rate_limited" }, false))
      .mockResolvedValueOnce(response(accepted));
    open();
    fill();
    send();
    await screen.findByRole("alert");
    send();
    await screen.findByText(/Too many attempts/);
    send();
    await screen.findByText("Accepted by our mail server");
    const keys = globalThis.fetch.mock.calls.map(
      (call) => call[1].headers["Idempotency-Key"],
    );
    expect(new Set(keys).size).toBe(1);
  });
  it("does not turn unrecognized 2xx payloads into a success", async () => {
    globalThis.fetch = vi.fn(async () =>
      response({ status: "ok", message: "fake" }),
    );
    open();
    fill();
    send();
    await screen.findByRole("alert");
    expect(screen.queryByText("Accepted by our mail server")).toBeNull();
    expect(screen.getByLabelText(/^Email address/).value).toBe(valid.email);
  });
  it("keeps rate-limit errors understandable without clearing input", async () => {
    globalThis.fetch = vi.fn(async () =>
      response({ code: "rate_limited" }, false),
    );
    open();
    fill();
    send();
    await screen.findByRole("alert");
    expect(screen.getByRole("alert").textContent).toContain(
      "Too many attempts",
    );
    expect(screen.getByLabelText(/^Customer name/).value).toBe(
      valid.customerName,
    );
  });
  it("blocks changed details after an uncertain delivery to avoid a second handoff", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network"));
    open();
    fill();
    send();
    await screen.findByRole("alert");
    fireEvent.change(screen.getByLabelText(/^Inquiry message/), {
      target: {
        value: "Different packaging requirements after an uncertain result.",
      },
    });
    send();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent).toContain(
      "previous delivery status is uncertain",
    );
  });
  it("bounds a stalled frontend request and keeps its draft", async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        }),
    );
    open();
    fill();
    send();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(40000);
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "connection was interrupted",
    );
    expect(screen.getByLabelText(/^Customer name/).value).toBe(
      valid.customerName,
    );
    expect(screen.getByRole("button", { name: /Send inquiry/ }).disabled).toBe(
      false,
    );
  });
  it("does not expose raw server exception messages", async () => {
    globalThis.fetch = vi.fn(async () =>
      response(
        { code: "server_error", message: "C:/private/secret.stack" },
        false,
      ),
    );
    open();
    fill();
    send();
    await screen.findByRole("alert");
    expect(screen.queryByText(/private\/secret/)).toBeNull();
  });
});
