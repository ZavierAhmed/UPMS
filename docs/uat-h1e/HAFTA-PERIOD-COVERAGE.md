# Employee Hafta period coverage

Coverage derives from an explicit immutable opening and successful independent base/extension reconciliation. Date boundaries are inclusive. Money remains exact decimal arithmetic.

| State | Condition | Opening at From | Closing at To |
| --- | --- | --- | --- |
| FULL | Valid opening date <= From | Opening plus signed earlier recorded events | Reconciled balance through To |
| PARTIAL | From < valid opening date <= To | Unknown / UNVERIFIED; never zero | Numeric only with successful reconciliation, explicitly qualified as of To and showing coverage start |
| UNVERIFIED | Missing opening, opening after To, or failed reconciliation | UNVERIFIED | UNVERIFIED; no unqualified numeric balance |

Recorded period earnings, direct payments and existing-payment allocations remain visible even when balance coverage is incomplete. They are recorded activity, not proof of missing earlier liability. An opening itself is not cash or a Hafta payment.

Overall state is UNVERIFIED if any selected employee is unverified, otherwise PARTIAL if any is partial, otherwise FULL. Aggregate opening/closing is null when a contributing employee's respective balance is unknown. Empty selections do not invent a zero verified payable. Workbook metadata carries aggregate state and balance limitations; each UI/PDF/Excel statement carries its employee coverage explanation and as-of date.

Ahmed's actual opening is 1000.00 on November 3. November 2-8 is PARTIAL: unknown beginning, recorded earned 2000.00 and applied 1200.00, verified closing **1800.00 as of November 8**. November 3-8 is FULL with 1000.00 opening and 1800.00 closing. Subsequent covered weeks carry 1800.00 when no later activity changes it. A genuine zero opening in the separate synthetic fixture yields 800.00. Neither example authorizes changing Ahmed's retained opening.

Native consistency/audit/source verification is not external proof of physical funds or full database row isolation. Reports retain these evidence limits.
