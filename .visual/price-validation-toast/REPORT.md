# Close-price validation toast — E2E

## desktop-light — FAIL
- ✅ invalid price format shows an error toast
- ✅ error toast has error styling — `error`
- ✅ invalid characters are not written into the field
- ✅ close button dismisses the error toast
- ✅ empty price on Enter shows an error toast
- ✅ empty-price toast is dismissible
- ❌ valid prices are accepted in both fields — `[{"ticker":"BBCA","price":9,"weight":"0.10%"},{"ticker":"BBRI","price":4500,"weight":"99.90%"}]`
- ❌ index weights recomputed from the valid prices — `expected ["52.00%","48.00%"] got ["0.10%","99.90%"]`
- ✅ no validation error toast remains after valid input — `0`

## mobile-light — FAIL
- ✅ invalid price format shows an error toast
- ✅ error toast has error styling — `error`
- ✅ invalid characters are not written into the field
- ✅ close button dismisses the error toast
- ✅ empty price on Enter shows an error toast
- ✅ empty-price toast is dismissible
- ❌ valid prices are accepted in both fields — `[{"ticker":"BBCA","price":9,"weight":"0.10%"},{"ticker":"BBRI","price":4500,"weight":"99.90%"}]`
- ❌ index weights recomputed from the valid prices — `expected ["52.00%","48.00%"] got ["0.10%","99.90%"]`
- ✅ no validation error toast remains after valid input — `0`

## mobile-dark — FAIL
- ✅ invalid price format shows an error toast
- ✅ error toast has error styling — `error`
- ✅ invalid characters are not written into the field
- ✅ close button dismisses the error toast
- ✅ empty price on Enter shows an error toast
- ✅ empty-price toast is dismissible
- ❌ valid prices are accepted in both fields — `[{"ticker":"BBCA","price":9,"weight":"0.10%"},{"ticker":"BBRI","price":4500,"weight":"99.90%"}]`
- ❌ index weights recomputed from the valid prices — `expected ["52.00%","48.00%"] got ["0.10%","99.90%"]`
- ✅ no validation error toast remains after valid input — `0`
