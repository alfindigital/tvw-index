# Refresh updates prices — E2E

## desktop-light — FAIL
- ❌ server function was called on Refresh — `calls=0`
- ❌ BBCA close price updated to 1,000 — `[{"ticker":"BBCA","price":6250,"weight":""},{"ticker":"BBRI","price":2960,"weight":""}]`
- ❌ BBRI close price updated to 2,000 — `[{"ticker":"BBCA","price":6250,"weight":""},{"ticker":"BBRI","price":2960,"weight":""}]`
- ❌ prices actually changed vs. before — `[6250,2960] -> [6250,2960]`
- ❌ weights reflect new prices (20% / 80%) — `["",""]`
- ❌ success toast shown
- ❌ Refresh re-fetched (new server calls) — `0 -> 0`
- ❌ BBCA close price updated to 4,000 — `[{"ticker":"BBCA","price":6250,"weight":""},{"ticker":"BBRI","price":2960,"weight":""}]`
- ❌ weights recomputed to 50% / 50% — `["",""]`
- ❌ results view changed between refreshes — `[{"ticker":"BBCA","price":6250,"weight":""},{"ticker":"BBRI","price":2960,"weight":""}] !== [{"ticker":"BBCA","price":6250,"weight":""},{"ticker":"BBRI","price":2960,"weight":""}]`

## mobile-light — FAIL
- ❌ server function was called on Refresh — `calls=0`
- ❌ BBCA close price updated to 1,000 — `[{"ticker":"BBCA","price":6250,"weight":""},{"ticker":"BBRI","price":2960,"weight":""}]`
- ❌ BBRI close price updated to 2,000 — `[{"ticker":"BBCA","price":6250,"weight":""},{"ticker":"BBRI","price":2960,"weight":""}]`
- ❌ prices actually changed vs. before — `[6250,2960] -> [6250,2960]`
- ❌ weights reflect new prices (20% / 80%) — `["",""]`
- ❌ success toast shown
- ❌ Refresh re-fetched (new server calls) — `0 -> 0`
- ❌ BBCA close price updated to 4,000 — `[{"ticker":"BBCA","price":6250,"weight":""},{"ticker":"BBRI","price":2960,"weight":""}]`
- ❌ weights recomputed to 50% / 50% — `["",""]`
- ❌ results view changed between refreshes — `[{"ticker":"BBCA","price":6250,"weight":""},{"ticker":"BBRI","price":2960,"weight":""}] !== [{"ticker":"BBCA","price":6250,"weight":""},{"ticker":"BBRI","price":2960,"weight":""}]`
