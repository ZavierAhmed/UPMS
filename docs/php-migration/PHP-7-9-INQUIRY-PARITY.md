# PHP-7.9 inquiry category parity

The React public form offers exactly buckets, cans, containers, stickers and cartons. PHP InquiryInput and Express validation add the two new exact lowercase IDs with labels Stickers and Cartons. The data fields, normalization, limits, errors, rate limiting, idempotency storage, fingerprint algorithm, cross-worker locking, SMTP TLS and DevelopmentFile mechanics are unchanged.

## Intentional legacy compatibility

The API whitelist still accepts `custom` as an API-only legacy value. It is not offered or promoted by the website. This preserves previously integrated clients and exact historically accepted submissions, including their idempotent replays; fresh legacy API requests are deliberately still accepted under the same validation rules. It is not an alias for either new category. Unknown categories remain invalid. No old stored record, category, fingerprint or message is rewritten.

An eventual API-only retirement would need a separately reviewed compatibility policy. This milestone does not silently invalidate historical keys or bypass validation to retrieve them. Keeping an already-supported bounded value is distinct from allowing arbitrary category strings.

## Executed evidence

- Complete accepted PHP/Express inquiry differential suites run on PHP 8.3 and 8.4 with the two new categories, including explicit HTTP 200 assertions. Existing invalid inputs, request-size/origin errors, concurrency/deduplication, SMTP TLS and unknown-outcome checks remain.
- A new baseline-crossing compatibility fixture creates a custom request using the exact PHP-7.8 checkout, then replays it through PHP-7.9. Both PHP runtimes retain the original reference, full saved key entry/fingerprint and byte-identical outbox message; there is still one message. Changing that old key's category to Stickers returns 409 idempotency_conflict, without another delivery.
- Express's baseline submission instance receives identically normalized old/new custom input, returns the same cached result and delivers once; changing the category conflicts. Its in-memory replay lifetime is not misrepresented as restart-persistent storage.
- Actual React contact-form submissions for Stickers and Cartons each return development_saved and write the correctly labeled private message. Replaying each request preserves its reference and message count. The isolated outbox has exactly two messages.
- All five category-detail links preselect the expected option. New WhatsApp links use the corresponding titles. The retired custom value remains absent from public catalog links and form options.

The compatibility fixture uses newly created synthetic journals only, never owner inquiry records. No real SMTP mail was sent. Runtime totals and evidence paths/hashes are in TEST-RESULTS and EVIDENCE.json.
