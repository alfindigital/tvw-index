# Tooltip ↔ aria-describedby E2E

- Scenarios: 3
- Failing scenarios: **2**

## mobile-light ❌

| Check | Status | Detail |
| --- | --- | --- |
| refresh: button visible | ✅ | — |
| refresh: no tooltip association at rest | ✅ | {"ids":[],"targets":[]} |
| refresh: reachable via Tab | ✅ | — |
| refresh: aria-describedby present on focus | ✅ | {"ids":["radix-_r_7_"],"targets":[{"id":"radix-_r_7_","exists":true,"role":"tooltip","isPopper":true,"text":"Refresh pri |
| refresh: aria-describedby resolves to an element on focus | ✅ | [{"id":"radix-_r_7_","exists":true,"role":"tooltip","isPopper":true,"text":"Refresh prices"}] |
| refresh: described element is a tooltip on focus | ✅ | role=tooltip popper=true |
| refresh: tooltip text matches copy on focus | ✅ | text="Refresh prices" |
| refresh: association removed after blur | ✅ | {"ids":[],"targets":[]} |
| refresh: aria-describedby present on tap | ✅ | {"ids":["radix-_r_7_"],"targets":[{"id":"radix-_r_7_","exists":true,"role":"tooltip","isPopper":true,"text":"Refresh pri |
| refresh: aria-describedby resolves to an element on tap | ✅ | [{"id":"radix-_r_7_","exists":true,"role":"tooltip","isPopper":true,"text":"Refresh prices"}] |
| refresh: described element is a tooltip on tap | ✅ | role=tooltip popper=true |
| refresh: tooltip text matches copy on tap | ✅ | text="Refresh prices" |
| sort: button visible | ✅ | — |
| sort: no tooltip association at rest | ✅ | {"ids":[],"targets":[]} |
| sort: reachable via Tab | ✅ | — |
| sort: aria-describedby present on focus | ✅ | {"ids":["radix-_r_a_"],"targets":[{"id":"radix-_r_a_","exists":true,"role":"tooltip","isPopper":true,"text":"Sort watchl |
| sort: aria-describedby resolves to an element on focus | ✅ | [{"id":"radix-_r_a_","exists":true,"role":"tooltip","isPopper":true,"text":"Sort watchlist"}] |
| sort: described element is a tooltip on focus | ✅ | role=tooltip popper=true |
| sort: tooltip text matches copy on focus | ✅ | text="Sort watchlist" |
| sort: association removed after blur | ✅ | {"ids":[],"targets":[]} |
| save: button visible | ✅ | — |
| save: no tooltip association at rest | ✅ | {"ids":[],"targets":[]} |
| save: reachable via Tab | ❌ | — |
| save: aria-describedby present on focus | ❌ | {"ids":[],"targets":[]} |
| save: association removed after blur | ✅ | {"ids":[],"targets":[]} |
| save: aria-describedby present on tap | ❌ | {"ids":[],"targets":[]} |

## mobile-dark ❌

| Check | Status | Detail |
| --- | --- | --- |
| refresh: button visible | ❌ | — |
| sort: button visible | ❌ | — |
| save: button visible | ❌ | — |

## desktop-light ✅

| Check | Status | Detail |
| --- | --- | --- |
| refresh: button visible | ✅ | — |
| refresh: no tooltip association at rest | ✅ | {"ids":[],"targets":[]} |
| refresh: reachable via Tab | ✅ | — |
| refresh: aria-describedby present on focus | ✅ | {"ids":["radix-_r_7_"],"targets":[{"id":"radix-_r_7_","exists":true,"role":"tooltip","isPopper":true,"text":"Refresh pri |
| refresh: aria-describedby resolves to an element on focus | ✅ | [{"id":"radix-_r_7_","exists":true,"role":"tooltip","isPopper":true,"text":"Refresh prices"}] |
| refresh: described element is a tooltip on focus | ✅ | role=tooltip popper=true |
| refresh: tooltip text matches copy on focus | ✅ | text="Refresh prices" |
| refresh: association removed after blur | ✅ | {"ids":[],"targets":[]} |
| refresh: aria-describedby present on tap | ✅ | {"ids":["radix-_r_7_"],"targets":[{"id":"radix-_r_7_","exists":true,"role":"tooltip","isPopper":true,"text":"Refresh pri |
| refresh: aria-describedby resolves to an element on tap | ✅ | [{"id":"radix-_r_7_","exists":true,"role":"tooltip","isPopper":true,"text":"Refresh prices"}] |
| refresh: described element is a tooltip on tap | ✅ | role=tooltip popper=true |
| refresh: tooltip text matches copy on tap | ✅ | text="Refresh prices" |
| sort: button visible | ✅ | — |
| sort: no tooltip association at rest | ✅ | {"ids":[],"targets":[]} |
| sort: reachable via Tab | ✅ | — |
| sort: aria-describedby present on focus | ✅ | {"ids":["radix-_r_a_"],"targets":[{"id":"radix-_r_a_","exists":true,"role":"tooltip","isPopper":true,"text":"Sort watchl |
| sort: aria-describedby resolves to an element on focus | ✅ | [{"id":"radix-_r_a_","exists":true,"role":"tooltip","isPopper":true,"text":"Sort watchlist"}] |
| sort: described element is a tooltip on focus | ✅ | role=tooltip popper=true |
| sort: tooltip text matches copy on focus | ✅ | text="Sort watchlist" |
| sort: association removed after blur | ✅ | {"ids":[],"targets":[]} |
| save: button visible | ✅ | — |
| save: no tooltip association at rest | ✅ | {"ids":[],"targets":[]} |
| save: reachable via Tab | ✅ | — |
| save: aria-describedby present on focus | ✅ | {"ids":["radix-_r_6_"],"targets":[{"id":"radix-_r_6_","exists":true,"role":"tooltip","isPopper":true,"text":"Save watchl |
| save: aria-describedby resolves to an element on focus | ✅ | [{"id":"radix-_r_6_","exists":true,"role":"tooltip","isPopper":true,"text":"Save watchlist"}] |
| save: described element is a tooltip on focus | ✅ | role=tooltip popper=true |
| save: tooltip text matches copy on focus | ✅ | text="Save watchlist" |
| save: association removed after blur | ✅ | {"ids":[],"targets":[]} |
| save: aria-describedby present on tap | ✅ | {"ids":["radix-_r_6_"],"targets":[{"id":"radix-_r_6_","exists":true,"role":"tooltip","isPopper":true,"text":"Save watchl |
| save: aria-describedby resolves to an element on tap | ✅ | [{"id":"radix-_r_6_","exists":true,"role":"tooltip","isPopper":true,"text":"Save watchlist"}] |
| save: described element is a tooltip on tap | ✅ | role=tooltip popper=true |
| save: tooltip text matches copy on tap | ✅ | text="Save watchlist" |
