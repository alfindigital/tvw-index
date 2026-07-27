# Refresh updates close prices — E2E

## desktop-light — FAIL
- ✅ Refresh triggered quote server calls — `12 -> 14`
- ✅ server returned a price for both tickers — `{"BBRI":2960,"ASII":4930,"TLKM":2580,"BBCA":6250,"UNTR":25425,"ICBP":6975,"ADRO":2490,"KLBF":715,"BBNI":3500,"BMRI":4100}`
- ✅ BBCA price field shows the fetched close (6250) — `{"ticker":"BBCA","price":6250,"weight":"51.36%"}`
- ✅ BBRI price field shows the fetched close (2960) — `{"ticker":"BBRI","price":2960,"weight":"48.64%"}`
- ❌ prices changed from the empty seed state — `[6250,2960] -> [6250,2960]`
- ✅ index weights recomputed from fetched prices — `expected ["51.36%","48.64%"] got ["51.36%","48.64%"]`
- ❌ success toast shown
- ✅ second Refresh re-fetched — `14 -> 16`
- ✅ BBCA price field updated to the new close (12500) — `[{"ticker":"BBCA","price":12500,"weight":"67.86%"},{"ticker":"BBRI","price":2960,"weight":"32.14%"}]`
- ✅ BBRI price unchanged — `[{"ticker":"BBCA","price":12500,"weight":"67.86%"},{"ticker":"BBRI","price":2960,"weight":"32.14%"}]`
- ✅ index weights recomputed after the price change — `expected ["67.86%","32.14%"] got ["67.86%","32.14%"]`
- ✅ results view visibly changed between the two refreshes — `[{"ticker":"BBCA","price":6250,"weight":"51.36%"},{"ticker":"BBRI","price":2960,"weight":"48.64%"}] !== [{"ticker":"BBCA","price":12500,"weight":"67.86%"},{"ticker":"BBRI","price":2960,"weight":"32.14%"}]`

## mobile-light — FAIL
- ✅ Refresh triggered quote server calls — `12 -> 14`
- ✅ server returned a price for both tickers — `{"BBCA":6250,"UNTR":25425,"KLBF":715,"TLKM":2580,"BMRI":4100,"ASII":4930,"ICBP":6975,"ADRO":2490,"BBRI":2960,"BBNI":3500}`
- ✅ BBCA price field shows the fetched close (6250) — `{"ticker":"BBCA","price":6250,"weight":"51.36%"}`
- ✅ BBRI price field shows the fetched close (2960) — `{"ticker":"BBRI","price":2960,"weight":"48.64%"}`
- ❌ prices changed from the empty seed state — `[6250,2960] -> [6250,2960]`
- ✅ index weights recomputed from fetched prices — `expected ["51.36%","48.64%"] got ["51.36%","48.64%"]`
- ❌ success toast shown
- ✅ second Refresh re-fetched — `14 -> 16`
- ✅ BBCA price field updated to the new close (12500) — `[{"ticker":"BBCA","price":12500,"weight":"67.86%"},{"ticker":"BBRI","price":2960,"weight":"32.14%"}]`
- ✅ BBRI price unchanged — `[{"ticker":"BBCA","price":12500,"weight":"67.86%"},{"ticker":"BBRI","price":2960,"weight":"32.14%"}]`
- ✅ index weights recomputed after the price change — `expected ["67.86%","32.14%"] got ["67.86%","32.14%"]`
- ✅ results view visibly changed between the two refreshes — `[{"ticker":"BBCA","price":6250,"weight":"51.36%"},{"ticker":"BBRI","price":2960,"weight":"48.64%"}] !== [{"ticker":"BBCA","price":12500,"weight":"67.86%"},{"ticker":"BBRI","price":2960,"weight":"32.14%"}]`
