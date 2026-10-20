import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { products } from "../../data/company";
import { emptyInquiry, validateInquiry } from "./validation";
import "./inquiry.css";
const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export default function InquiryForm({ initialCategory = "" }) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  const [values, setValues] = useState({
    ...emptyInquiry,
    productCategory: initialCategory,
  });
  const [errors, setErrors] = useState({}),
    [notice, setNotice] = useState(null),
    [pending, setPending] = useState(false),
    [receipt, setReceipt] = useState(null);
  const busy = useRef(false),
    attempt = useRef(null),
    summary = useRef(null);
  useEffect(() => {
    if (notice) summary.current?.focus();
  }, [notice]);
  function change(event) {
    const { name, value } = event.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[name];
      return next;
    });
  }
  async function submit(event) {
    event.preventDefault();
    if (busy.current || receipt) return;
    const invalid = validateInquiry(values);
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      setNotice({
        kind: "error",
        text: "Please check the highlighted fields. Your details have been kept.",
      });
      return;
    }
    const payload = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, value.trim()]),
    );
    const serialized = JSON.stringify(payload);
    if (attempt.current?.uncertain && attempt.current.body !== serialized) {
      setNotice({
        kind: "error",
        text: "The previous delivery status is uncertain. Retry with the original details or contact us before starting a different inquiry.",
      });
      return;
    }
    if (!attempt.current || attempt.current.body !== serialized)
      attempt.current = {
        key: crypto.randomUUID(),
        body: serialized,
        uncertain: false,
      };
    busy.current = true;
    setPending(true);
    setNotice(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);
    try {
      const response = await fetch("/api/v1/public/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": attempt.current.key,
        },
        body: attempt.current.body,
        signal: controller.signal,
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => null);
      if (
        response.ok &&
        ["smtp_accepted", "development_saved"].includes(data?.status) &&
        /^[a-f0-9]{32}$/.test(data?.reference)
      ) {
        setReceipt(data);
        setNotice({ kind: "success", text: data.message });
        attempt.current.uncertain = false;
      } else {
        const recognized = [
          "validation_failed",
          "rate_limited",
          "delivery_unavailable",
          "delivery_rejected",
          "delivery_unknown",
          "idempotency_conflict",
          "busy",
          "invalid_submission",
          "request_too_large",
          "origin_not_allowed",
          "invalid_request",
          "invalid_json",
          "unsupported_content",
          "invalid_idempotency_key",
        ];
        const safe = recognized.includes(data?.code);
        if (data?.code === "validation_failed" && data.errors) {
          const serverErrors = {};
          for (const key of Object.keys(emptyInquiry)) {
            if (
              Array.isArray(data.errors[key]) &&
              typeof data.errors[key][0] === "string"
            )
              serverErrors[key] = data.errors[key][0];
          }
          setErrors(serverErrors);
        }
        const uncertain =
          !safe ||
          ["delivery_unknown", "idempotency_conflict"].includes(data?.code) ||
          (attempt.current.uncertain &&
            !["delivery_unavailable", "delivery_rejected"].includes(
              data?.code,
            ));
        attempt.current.uncertain = uncertain;
        if (!uncertain) attempt.current = null;
        const messages = {
          request_too_large:
            "Your inquiry is too large. Please shorten the message and try again.",
          invalid_submission:
            "This inquiry could not be accepted. Please contact us directly.",
          validation_failed:
            "Please check the highlighted fields. Your details have been kept.",
          rate_limited:
            "Too many attempts. Please wait before trying again, or call or email us.",
          delivery_unavailable:
            "Online inquiries are currently unavailable. Your inquiry has not been sent. Please call or email us.",
          delivery_rejected:
            "The mail service did not accept your inquiry. Please call or email us, or try again later.",
          delivery_unknown:
            "Delivery could not be confirmed. Contact us before submitting again.",
          idempotency_conflict:
            "These details differ from a previous attempt. Please contact us to confirm its delivery.",
        };
        setNotice({
          kind: "error",
          text:
            messages[data?.code] ||
            "We could not confirm delivery. Your details are still here. Retry unchanged details to check the same request, or contact us directly.",
          correlation: safe ? data.correlationId : null,
          uncertain,
        });
      }
    } catch {
      attempt.current.uncertain = true;
      setNotice({
        kind: "error",
        text: "We could not confirm delivery because the connection was interrupted. Your details are still here. Retry unchanged details to check the same request, or contact us directly.",
        uncertain: true,
      });
    } finally {
      clearTimeout(timer);
      busy.current = false;
      setPending(false);
    }
  }
  function reset() {
    attempt.current = null;
    setReceipt(null);
    setNotice(null);
    setErrors({});
    setValues({ ...emptyInquiry, productCategory: initialCategory });
  }
  function field(name, label, props = {}) {
    return (
      <div className={`inquiry-field ${name === "message" ? "wide" : ""}`}>
        <label htmlFor={`inquiry-${name}`}>
          {label}
          {[
            "customerName",
            "email",
            "phone",
            "productCategory",
            "message",
          ].includes(name) ? (
            <span aria-hidden="true"> *</span>
          ) : (
            <span className="optional"> (optional)</span>
          )}
        </label>
        {name === "message" ? (
          <textarea
            id={`inquiry-${name}`}
            name={name}
            value={values[name]}
            onChange={change}
            rows={6}
            required
            maxLength={4000}
            aria-invalid={!!errors[name]}
            aria-describedby={errors[name] ? `${name}-error` : undefined}
          />
        ) : name === "productCategory" ? (
          <select
            id={`inquiry-${name}`}
            name={name}
            value={values[name]}
            onChange={change}
            required
            aria-invalid={!!errors[name]}
            aria-describedby={errors[name] ? `${name}-error` : undefined}
          >
            <option value="">Select a category</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={`inquiry-${name}`}
            name={name}
            value={values[name]}
            onChange={change}
            required={["customerName", "email", "phone"].includes(name)}
            aria-invalid={!!errors[name]}
            aria-describedby={errors[name] ? `${name}-error` : undefined}
            {...props}
          />
        )}{" "}
        {errors[name] && (
          <p className="field-error" id={`${name}-error`}>
            {errors[name]}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="inquiry-panel inquiry-form-panel">
      <p className="eyebrow">REQUEST A QUOTE</p>
      <h2>Tell us what you need.</h2>
      <p>
        Share your packaging requirements. Our team will use your contact
        details to respond to your inquiry.
      </p>
      <p className="small-note">
        Fields marked * are required. This is an inquiry, not an order
        confirmation.
      </p>
      {notice && (
        <div
          ref={summary}
          tabIndex={-1}
          className={`inquiry-notice ${notice.kind}`}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          <strong>
            {notice.kind === "success"
              ? receipt?.status === "development_saved"
                ? "Saved for local testing"
                : "Accepted by our mail server"
              : "Please review your inquiry"}
          </strong>
          <p>{notice.text}</p>
          {notice.correlation && (
            <small>Support reference: {notice.correlation}</small>
          )}
          {receipt && (
            <p>
              Inquiry reference: <strong>{receipt.reference}</strong>
            </p>
          )}
        </div>
      )}
      {receipt ? (
        <button type="button" className="button dark-button" onClick={reset}>
          Start another inquiry
        </button>
      ) : (
        <form
          method="post"
          action="/api/v1/public/inquiries"
          noValidate
          onSubmit={submit}
          aria-label="Packaging inquiry"
          aria-busy={pending}
        >
          <fieldset disabled={!ready || pending}>
            <legend className="visually-hidden">
              Your contact details and packaging requirements
            </legend>
            <div className="inquiry-fields">
              {field("customerName", "Customer name", {
                autoComplete: "name",
                maxLength: 100,
              })}
              {field("companyName", "Company name", {
                autoComplete: "organization",
                maxLength: 150,
              })}
              {field("email", "Email address", {
                type: "email",
                autoComplete: "email",
                maxLength: 254,
              })}
              {field("phone", "Phone number", {
                type: "tel",
                autoComplete: "tel",
                maxLength: 40,
              })}
              {field("productCategory", "Product category")}
              {field("quantity", "Approximate quantity", {
                maxLength: 80,
                placeholder: "e.g. 500 containers",
              })}
              {field("capacity", "Required capacity / size", {
                maxLength: 80,
                placeholder: "e.g. 20L bucket",
              })}
              {field("message", "Inquiry message")}
            </div>
            <div className="inquiry-honeypot" aria-hidden="true">
              <label htmlFor="inquiry-website">Leave this field empty</label>
              <input
                id="inquiry-website"
                name="website"
                value={values.website}
                onChange={change}
                tabIndex={-1}
                autoComplete="off"
                maxLength={200}
              />
            </div>
            <button
              className="button dark-button inquiry-submit"
              type="submit"
              disabled={!ready || pending}
            >
              {pending ? "Sending inquiry…" : "Send inquiry ↗"}
            </button>
          </fieldset>
          <p className="small-note">
            Confirmation appears only after the server reports a handoff. You
            can also reach us by phone or email.
          </p>
        </form>
      )}
    </div>
  );
}
