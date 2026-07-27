# Icon button aria-label / screen-reader name E2E

- Scenarios: 5
- Failing scenarios: **0**

Each button is checked for: `aria-label`, `aria-hidden` icon, `.sr-only` fallback,
role+name resolution, and the accessible name reported by Chromium's a11y tree
while the button is focused via Tab.

## mobile-light ✅

| Button | aria-label | sr-only | icon hidden | a11y role | announced name |
| --- | --- | --- | --- | --- | --- |
| refresh | Refresh prices | Refresh prices | true | button | Refresh prices |
| sort | Sort watchlist | Sort watchlist | true | button | Sort watchlist |
| save | Save watchlist as template | Save watchlist as template | true | button | Save watchlist as template |

| Check | Status | Detail |
| --- | --- | --- |
| refresh: button rendered | ✅ | — |
| refresh: aria-label is "Refresh prices" | ✅ | got="Refresh prices" |
| refresh: icon is aria-hidden | ✅ | got="true" |
| refresh: sr-only fallback text matches | ✅ | got="Refresh prices" |
| refresh: resolvable by role+accessible name | ✅ | count=1 |
| refresh: reachable via Tab | ✅ | — |
| refresh: a11y role is button when focused | ✅ | role=button |
| refresh: announced name equals label when focused | ✅ | name="Refresh prices" |
| refresh: activeElement name matches label | ✅ | active="Refresh prices" |
| sort: button rendered | ✅ | — |
| sort: aria-label is "Sort watchlist" | ✅ | got="Sort watchlist" |
| sort: icon is aria-hidden | ✅ | got="true" |
| sort: sr-only fallback text matches | ✅ | got="Sort watchlist" |
| sort: resolvable by role+accessible name | ✅ | count=1 |
| sort: reachable via Tab | ✅ | — |
| sort: a11y role is button when focused | ✅ | role=button |
| sort: announced name equals label when focused | ✅ | name="Sort watchlist" |
| sort: activeElement name matches label | ✅ | active="Sort watchlist" |
| save: button rendered | ✅ | — |
| save: aria-label is "Save watchlist as template" | ✅ | got="Save watchlist as template" |
| save: icon is aria-hidden | ✅ | got="true" |
| save: sr-only fallback text matches | ✅ | got="Save watchlist as template" |
| save: resolvable by role+accessible name | ✅ | count=1 |
| save: reachable via Tab | ✅ | — |
| save: a11y role is button when focused | ✅ | role=button |
| save: announced name equals label when focused | ✅ | name="Save watchlist as template" |
| save: activeElement name matches label | ✅ | active="Save watchlist as template" |

## mobile-dark ✅

| Button | aria-label | sr-only | icon hidden | a11y role | announced name |
| --- | --- | --- | --- | --- | --- |
| refresh | Refresh prices | Refresh prices | true | button | Refresh prices |
| sort | Sort watchlist | Sort watchlist | true | button | Sort watchlist |
| save | Save watchlist as template | Save watchlist as template | true | button | Save watchlist as template |

| Check | Status | Detail |
| --- | --- | --- |
| refresh: button rendered | ✅ | — |
| refresh: aria-label is "Refresh prices" | ✅ | got="Refresh prices" |
| refresh: icon is aria-hidden | ✅ | got="true" |
| refresh: sr-only fallback text matches | ✅ | got="Refresh prices" |
| refresh: resolvable by role+accessible name | ✅ | count=1 |
| refresh: reachable via Tab | ✅ | — |
| refresh: a11y role is button when focused | ✅ | role=button |
| refresh: announced name equals label when focused | ✅ | name="Refresh prices" |
| refresh: activeElement name matches label | ✅ | active="Refresh prices" |
| sort: button rendered | ✅ | — |
| sort: aria-label is "Sort watchlist" | ✅ | got="Sort watchlist" |
| sort: icon is aria-hidden | ✅ | got="true" |
| sort: sr-only fallback text matches | ✅ | got="Sort watchlist" |
| sort: resolvable by role+accessible name | ✅ | count=1 |
| sort: reachable via Tab | ✅ | — |
| sort: a11y role is button when focused | ✅ | role=button |
| sort: announced name equals label when focused | ✅ | name="Sort watchlist" |
| sort: activeElement name matches label | ✅ | active="Sort watchlist" |
| save: button rendered | ✅ | — |
| save: aria-label is "Save watchlist as template" | ✅ | got="Save watchlist as template" |
| save: icon is aria-hidden | ✅ | got="true" |
| save: sr-only fallback text matches | ✅ | got="Save watchlist as template" |
| save: resolvable by role+accessible name | ✅ | count=1 |
| save: reachable via Tab | ✅ | — |
| save: a11y role is button when focused | ✅ | role=button |
| save: announced name equals label when focused | ✅ | name="Save watchlist as template" |
| save: activeElement name matches label | ✅ | active="Save watchlist as template" |

## mobile-320 ✅

| Button | aria-label | sr-only | icon hidden | a11y role | announced name |
| --- | --- | --- | --- | --- | --- |
| refresh | Refresh prices | Refresh prices | true | button | Refresh prices |
| sort | Sort watchlist | Sort watchlist | true | button | Sort watchlist |
| save | Save watchlist as template | Save watchlist as template | true | button | Save watchlist as template |

| Check | Status | Detail |
| --- | --- | --- |
| refresh: button rendered | ✅ | — |
| refresh: aria-label is "Refresh prices" | ✅ | got="Refresh prices" |
| refresh: icon is aria-hidden | ✅ | got="true" |
| refresh: sr-only fallback text matches | ✅ | got="Refresh prices" |
| refresh: resolvable by role+accessible name | ✅ | count=1 |
| refresh: reachable via Tab | ✅ | — |
| refresh: a11y role is button when focused | ✅ | role=button |
| refresh: announced name equals label when focused | ✅ | name="Refresh prices" |
| refresh: activeElement name matches label | ✅ | active="Refresh prices" |
| sort: button rendered | ✅ | — |
| sort: aria-label is "Sort watchlist" | ✅ | got="Sort watchlist" |
| sort: icon is aria-hidden | ✅ | got="true" |
| sort: sr-only fallback text matches | ✅ | got="Sort watchlist" |
| sort: resolvable by role+accessible name | ✅ | count=1 |
| sort: reachable via Tab | ✅ | — |
| sort: a11y role is button when focused | ✅ | role=button |
| sort: announced name equals label when focused | ✅ | name="Sort watchlist" |
| sort: activeElement name matches label | ✅ | active="Sort watchlist" |
| save: button rendered | ✅ | — |
| save: aria-label is "Save watchlist as template" | ✅ | got="Save watchlist as template" |
| save: icon is aria-hidden | ✅ | got="true" |
| save: sr-only fallback text matches | ✅ | got="Save watchlist as template" |
| save: resolvable by role+accessible name | ✅ | count=1 |
| save: reachable via Tab | ✅ | — |
| save: a11y role is button when focused | ✅ | role=button |
| save: announced name equals label when focused | ✅ | name="Save watchlist as template" |
| save: activeElement name matches label | ✅ | active="Save watchlist as template" |

## desktop-light ✅

| Button | aria-label | sr-only | icon hidden | a11y role | announced name |
| --- | --- | --- | --- | --- | --- |
| refresh | Refresh prices | Refresh prices | true | button | Refresh prices |
| sort | Sort watchlist | Sort watchlist | true | button | Sort watchlist |
| save | Save watchlist as template | Save watchlist as template | true | button | Save watchlist as template |

| Check | Status | Detail |
| --- | --- | --- |
| refresh: button rendered | ✅ | — |
| refresh: aria-label is "Refresh prices" | ✅ | got="Refresh prices" |
| refresh: icon is aria-hidden | ✅ | got="true" |
| refresh: sr-only fallback text matches | ✅ | got="Refresh prices" |
| refresh: resolvable by role+accessible name | ✅ | count=1 |
| refresh: reachable via Tab | ✅ | — |
| refresh: a11y role is button when focused | ✅ | role=button |
| refresh: announced name equals label when focused | ✅ | name="Refresh prices" |
| refresh: activeElement name matches label | ✅ | active="Refresh prices" |
| sort: button rendered | ✅ | — |
| sort: aria-label is "Sort watchlist" | ✅ | got="Sort watchlist" |
| sort: icon is aria-hidden | ✅ | got="true" |
| sort: sr-only fallback text matches | ✅ | got="Sort watchlist" |
| sort: resolvable by role+accessible name | ✅ | count=1 |
| sort: reachable via Tab | ✅ | — |
| sort: a11y role is button when focused | ✅ | role=button |
| sort: announced name equals label when focused | ✅ | name="Sort watchlist" |
| sort: activeElement name matches label | ✅ | active="Sort watchlist" |
| save: button rendered | ✅ | — |
| save: aria-label is "Save watchlist as template" | ✅ | got="Save watchlist as template" |
| save: icon is aria-hidden | ✅ | got="true" |
| save: sr-only fallback text matches | ✅ | got="Save watchlist as template" |
| save: resolvable by role+accessible name | ✅ | count=1 |
| save: reachable via Tab | ✅ | — |
| save: a11y role is button when focused | ✅ | role=button |
| save: announced name equals label when focused | ✅ | name="Save watchlist as template" |
| save: activeElement name matches label | ✅ | active="Save watchlist as template" |

## desktop-dark ✅

| Button | aria-label | sr-only | icon hidden | a11y role | announced name |
| --- | --- | --- | --- | --- | --- |
| refresh | Refresh prices | Refresh prices | true | button | Refresh prices |
| sort | Sort watchlist | Sort watchlist | true | button | Sort watchlist |
| save | Save watchlist as template | Save watchlist as template | true | button | Save watchlist as template |

| Check | Status | Detail |
| --- | --- | --- |
| refresh: button rendered | ✅ | — |
| refresh: aria-label is "Refresh prices" | ✅ | got="Refresh prices" |
| refresh: icon is aria-hidden | ✅ | got="true" |
| refresh: sr-only fallback text matches | ✅ | got="Refresh prices" |
| refresh: resolvable by role+accessible name | ✅ | count=1 |
| refresh: reachable via Tab | ✅ | — |
| refresh: a11y role is button when focused | ✅ | role=button |
| refresh: announced name equals label when focused | ✅ | name="Refresh prices" |
| refresh: activeElement name matches label | ✅ | active="Refresh prices" |
| sort: button rendered | ✅ | — |
| sort: aria-label is "Sort watchlist" | ✅ | got="Sort watchlist" |
| sort: icon is aria-hidden | ✅ | got="true" |
| sort: sr-only fallback text matches | ✅ | got="Sort watchlist" |
| sort: resolvable by role+accessible name | ✅ | count=1 |
| sort: reachable via Tab | ✅ | — |
| sort: a11y role is button when focused | ✅ | role=button |
| sort: announced name equals label when focused | ✅ | name="Sort watchlist" |
| sort: activeElement name matches label | ✅ | active="Sort watchlist" |
| save: button rendered | ✅ | — |
| save: aria-label is "Save watchlist as template" | ✅ | got="Save watchlist as template" |
| save: icon is aria-hidden | ✅ | got="true" |
| save: sr-only fallback text matches | ✅ | got="Save watchlist as template" |
| save: resolvable by role+accessible name | ✅ | count=1 |
| save: reachable via Tab | ✅ | — |
| save: a11y role is button when focused | ✅ | role=button |
| save: announced name equals label when focused | ✅ | name="Save watchlist as template" |
| save: activeElement name matches label | ✅ | active="Save watchlist as template" |
