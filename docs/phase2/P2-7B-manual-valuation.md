# Manual credit valuation

Users enter base credit and manual GST credit as exact nonnegative decimal strings, at most two fractional places. Their sum must be positive and fit DECIMAL(20,2). No tax percentage, arbitrary journal, extra charge, refund or money-account input is accepted. A mandatory valuation explanation, evidence reference, correction reference and reason document the negotiated amount.

All credit types share the original document base cap, original manual GST cap and original receivable total cap. Base credit also shares the selected original sales line's base cap. A note may contain a GST-only credit if the synthetic GST policy and original manual component support it. The system does not infer a per-line GST allocation. One original line per note is the supported safe contract; separate lines require separate notes and unique correction evidence.

Draft and administrator views display original components, prior credits, remaining capacities, financial quantity, settlement and exact hash/version. Concurrent postings serialize under the shared guards and revalidate immutable usage before any effect.
