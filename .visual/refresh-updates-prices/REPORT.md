# Refresh updates close prices — E2E

## desktop-light — PASS
- ✅ Refresh triggered quote server calls — `12 -> 14`
- ✅ server returned a price for both tickers — `{"BBCA":6250,"ICBP":6975,"BBNI":3500,"ASII":4930,"KLBF":715,"BMRI":4100,"ADRO":2490,"UNTR":25425,"BBRI":2960,"TLKM":2580}`
- ✅ BBCA price field shows the fetched close (6250) — `{"ticker":"BBCA","price":6250,"weight":"51.36%"}`
- ✅ BBRI price field shows the fetched close (2960) — `{"ticker":"BBRI","price":2960,"weight":"48.64%"}`
- ✅ every row holds a non-zero close price after refresh — `[6250,2960] -> [6250,2960]`
- ✅ index weights recomputed from fetched prices — `expected ["51.36%","48.64%"] got ["51.36%","48.64%"]`
- ✅ update toast shown
- ✅ second Refresh re-fetched — `14 -> 16`
- ✅ BBCA price field updated to the new close (12500) — `[{"ticker":"BBCA","price":12500,"weight":"67.86%"},{"ticker":"BBRI","price":2960,"weight":"32.14%"}]`
- ✅ BBRI price unchanged — `[{"ticker":"BBCA","price":12500,"weight":"67.86%"},{"ticker":"BBRI","price":2960,"weight":"32.14%"}]`
- ✅ index weights recomputed after the price change — `expected ["67.86%","32.14%"] got ["67.86%","32.14%"]`
- ✅ results view visibly changed between the two refreshes — `[{"ticker":"BBCA","price":6250,"weight":"51.36%"},{"ticker":"BBRI","price":2960,"weight":"48.64%"}] !== [{"ticker":"BBCA","price":12500,"weight":"67.86%"},{"ticker":"BBRI","price":2960,"weight":"32.14%"}]`

## mobile-light — PASS
- ✅ Refresh triggered quote server calls — `12 -> 14`
- ✅ server returned a price for both tickers — `{"BBCA":6250,"BBRI":2960,"ICBP":6975,"BMRI":4100,"ASII":4930,"TLKM":2580,"UNTR":25425,"BBNI":3500,"KLBF":715,"ADRO":2490}`
- ✅ BBCA price field shows the fetched close (6250) — `{"ticker":"BBCA","price":6250,"weight":"51.36%"}`
- ✅ BBRI price field shows the fetched close (2960) — `{"ticker":"BBRI","price":2960,"weight":"48.64%"}`
- ✅ every row holds a non-zero close price after refresh — `[6250,2960] -> [6250,2960]`
- ✅ index weights recomputed from fetched prices — `expected ["51.36%","48.64%"] got ["51.36%","48.64%"]`
- ✅ update toast shown
- ✅ second Refresh re-fetched — `14 -> 16`
- ✅ BBCA price field updated to the new close (12500) — `[{"ticker":"BBCA","price":12500,"weight":"67.86%"},{"ticker":"BBRI","price":2960,"weight":"32.14%"}]`
- ✅ BBRI price unchanged — `[{"ticker":"BBCA","price":12500,"weight":"67.86%"},{"ticker":"BBRI","price":2960,"weight":"32.14%"}]`
- ✅ index weights recomputed after the price change — `expected ["67.86%","32.14%"] got ["67.86%","32.14%"]`
- ✅ results view visibly changed between the two refreshes — `[{"ticker":"BBCA","price":6250,"weight":"51.36%"},{"ticker":"BBRI","price":2960,"weight":"48.64%"}] !== [{"ticker":"BBCA","price":12500,"weight":"67.86%"},{"ticker":"BBRI","price":2960,"weight":"32.14%"}]`
