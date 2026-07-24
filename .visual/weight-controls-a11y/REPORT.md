# WeightControls a11y / tooltip E2E

- Scenarios: 4
- Failing scenarios: **2**

Each test asserts:
1. The icon button is rendered and has the correct `aria-label`.
2. The button contains matching `.sr-only` text for screen readers.
3. The tooltip portal text appears on **hover**, **keyboard focus**, and **mobile tap/focus**.

## desktop-light ✅

| Button | aria-label | sr-only | Hover | Focus | Mobile tap | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Save watchlist as template | Save watchlist as template | Save watchlist as template | Save watchlist | Save watchlist | — | ✅ |
| Refresh prices | Refresh prices | Refresh prices | Refresh prices | Refresh prices | — | ✅ |
| Sort watchlist | Sort watchlist | Sort watchlist | Sort watchlist | Sort watchlist | — | ✅ |

**Screenshots**
- save: ![save](desktop-light-save.png)
- refresh: ![refresh](desktop-light-refresh.png)
- sort: ![sort](desktop-light-sort.png)

## desktop-dark ✅

| Button | aria-label | sr-only | Hover | Focus | Mobile tap | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Save watchlist as template | Save watchlist as template | Save watchlist as template | Save watchlist | Save watchlist | — | ✅ |
| Refresh prices | Refresh prices | Refresh prices | Refresh prices | Refresh prices | — | ✅ |
| Sort watchlist | Sort watchlist | Sort watchlist | Sort watchlist | Sort watchlist | — | ✅ |

**Screenshots**
- save: ![save](desktop-dark-save.png)
- refresh: ![refresh](desktop-dark-refresh.png)
- sort: ![sort](desktop-dark-sort.png)

## mobile-light ❌

| Button | aria-label | sr-only | Hover | Focus | Mobile tap | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Save watchlist as template | Save watchlist as template | Save watchlist as template | Save watchlist | Save watchlist | — | ❌ |
| Refresh prices | Refresh prices | Refresh prices | Refresh prices | Refresh prices | — | ❌ |
| Sort watchlist | Sort watchlist | Sort watchlist | Sort watchlist | Sort watchlist | — | ❌ |

**Screenshots**
- save: ![save](mobile-light-save.png)
- refresh: ![refresh](mobile-light-refresh.png)
- sort: ![sort](mobile-light-sort.png)

## mobile-dark ❌

| Button | aria-label | sr-only | Hover | Focus | Mobile tap | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Save watchlist as template | Save watchlist as template | Save watchlist as template | Save watchlist | Save watchlist | — | ❌ |
| Refresh prices | Refresh prices | Refresh prices | Refresh prices | Refresh prices | — | ❌ |
| Sort watchlist | Sort watchlist | Sort watchlist | Sort watchlist | Sort watchlist | — | ❌ |

**Screenshots**
- save: ![save](mobile-dark-save.png)
- refresh: ![refresh](mobile-dark-refresh.png)
- sort: ![sort](mobile-dark-sort.png)
