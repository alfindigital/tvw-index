# Close-price validation toast — E2E

## desktop-light — PASS
- ✅ invalid price format shows an error toast
- ✅ error toast has error styling — `error`
- ✅ invalid characters are not written into the field
- ✅ close button dismisses the error toast
- ✅ empty price on Enter shows an error toast
- ✅ empty-price toast is dismissible
- ✅ valid prices are accepted in both fields — `[{"ticker":"BBCA","price":9750,"weight":"52.00%"},{"ticker":"BBRI","price":4500,"weight":"48.00%"}]`
- ✅ index weights recomputed from the valid prices — `expected ["52.00%","48.00%"] got ["52.00%","48.00%"]`
- ✅ no validation error toast remains after valid input — `0`

## mobile-light — PASS
- ✅ invalid price format shows an error toast
- ✅ error toast has error styling — `error`
- ✅ invalid characters are not written into the field
- ✅ close button dismisses the error toast
- ✅ empty price on Enter shows an error toast
- ✅ empty-price toast is dismissible
- ✅ valid prices are accepted in both fields — `[{"ticker":"BBCA","price":9750,"weight":"52.00%"},{"ticker":"BBRI","price":4500,"weight":"48.00%"}]`
- ✅ index weights recomputed from the valid prices — `expected ["52.00%","48.00%"] got ["52.00%","48.00%"]`
- ✅ no validation error toast remains after valid input — `0`

## mobile-dark — PASS
- ✅ invalid price format shows an error toast
- ✅ error toast has error styling — `error`
- ✅ invalid characters are not written into the field
- ✅ close button dismisses the error toast
- ✅ empty price on Enter shows an error toast
- ✅ empty-price toast is dismissible
- ✅ valid prices are accepted in both fields — `[{"ticker":"BBCA","price":9750,"weight":"52.00%"},{"ticker":"BBRI","price":4500,"weight":"48.00%"}]`
- ✅ index weights recomputed from the valid prices — `expected ["52.00%","48.00%"] got ["52.00%","48.00%"]`
- ✅ no validation error toast remains after valid input — `0`
