# Refresh updates close prices — E2E

## desktop-light — PASS
- ✅ Refresh triggered quote server calls — `12 -> 14`
- ✅ server returned a price for both tickers — `{"ICBP":7600,"ASII":4800,"BBNI":3860,"BMRI":4230,"TLKM":2600,"BBRI":3250,"UNTR":24200,"ADRO":2840,"BBCA":6475,"KLBF":785}`
- ✅ BBCA price field shows the fetched close (6475) — `{"ticker":"BBCA","price":6475,"weight":"49.90%"}`
- ✅ BBRI price field shows the fetched close (3250) — `{"ticker":"BBRI","price":3250,"weight":"50.10%"}`
- ✅ every row holds a non-zero close price after refresh — `[6475,3250] -> [6475,3250]`
- ✅ index weights recomputed from fetched prices — `expected ["49.90%","50.10%"] got ["49.90%","50.10%"]`
- ✅ update toast shown
- ✅ second Refresh re-fetched — `14 -> 16`
- ✅ BBCA price field updated to the new close (12950) — `[{"ticker":"BBCA","price":12950,"weight":"66.58%"},{"ticker":"BBRI","price":3250,"weight":"33.42%"}]`
- ✅ BBRI price unchanged — `[{"ticker":"BBCA","price":12950,"weight":"66.58%"},{"ticker":"BBRI","price":3250,"weight":"33.42%"}]`
- ✅ index weights recomputed after the price change — `expected ["66.58%","33.42%"] got ["66.58%","33.42%"]`
- ✅ results view visibly changed between the two refreshes — `[{"ticker":"BBCA","price":6475,"weight":"49.90%"},{"ticker":"BBRI","price":3250,"weight":"50.10%"}] !== [{"ticker":"BBCA","price":12950,"weight":"66.58%"},{"ticker":"BBRI","price":3250,"weight":"33.42%"}]`

## mobile-light — PASS
- ✅ Refresh triggered quote server calls — `12 -> 14`
- ✅ server returned a price for both tickers — `{"BBCA":6475,"BBRI":3250,"BBNI":3860,"ADRO":2840,"ICBP":7600,"TLKM":2600,"BMRI":4230,"KLBF":785,"UNTR":24200,"ASII":4800}`
- ✅ BBCA price field shows the fetched close (6475) — `{"ticker":"BBCA","price":6475,"weight":"49.90%"}`
- ✅ BBRI price field shows the fetched close (3250) — `{"ticker":"BBRI","price":3250,"weight":"50.10%"}`
- ✅ every row holds a non-zero close price after refresh — `[6475,3250] -> [6475,3250]`
- ✅ index weights recomputed from fetched prices — `expected ["49.90%","50.10%"] got ["49.90%","50.10%"]`
- ✅ update toast shown
- ✅ second Refresh re-fetched — `14 -> 16`
- ✅ BBCA price field updated to the new close (12950) — `[{"ticker":"BBCA","price":12950,"weight":"66.58%"},{"ticker":"BBRI","price":3250,"weight":"33.42%"}]`
- ✅ BBRI price unchanged — `[{"ticker":"BBCA","price":12950,"weight":"66.58%"},{"ticker":"BBRI","price":3250,"weight":"33.42%"}]`
- ✅ index weights recomputed after the price change — `expected ["66.58%","33.42%"] got ["66.58%","33.42%"]`
- ✅ results view visibly changed between the two refreshes — `[{"ticker":"BBCA","price":6475,"weight":"49.90%"},{"ticker":"BBRI","price":3250,"weight":"50.10%"}] !== [{"ticker":"BBCA","price":12950,"weight":"66.58%"},{"ticker":"BBRI","price":3250,"weight":"33.42%"}]`
