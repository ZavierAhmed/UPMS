# Exact delivery challan numbering

Durable numeric positions1–1000 format DC-0001…DC-1000. Position1001 is DC-A0001;1002 is DC-A0002. Positions through10999 end at DC-A9999. Position11000 is blocked for owner decision; no guessed B block. DC-1001 is never issued. There is no annual reset or lexical number ordering.

The control row is protected by the transaction/identity guard; document numeric sequence and official number are independently unique. Draft/cancel uses neither. Assignment, stock/ledger/audit and durable idempotency outcome share a transaction. Lost-COMMIT replay returns the original identity; conflicting intent fails.

Real isolated tests prove first/second,999/1000/1001/1002, concurrency, failed-post rollback, no draft consumption, frozen earlier numbers, A9999 boundary and actual lost-COMMIT recovery. Boundary tests directly position the control row only in their isolated test schema; no thousand-document run or real-number reset occurs.

Only genuinely new synthetic targets initialize1, with explicit cutover evidence. Existing company numbering/import is blocked pending an owner-reviewed next position, conflict scan and historical source evidence. Legacy issued numbers remain unchanged in their original tables.
