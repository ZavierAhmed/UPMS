# V1.2A responsive form layout

The screen-only shared `.simple-v1.authenticated main` removes the1680px content cap; `.v1-form` occupies100% of its available parent with no1100px cap. All grid children can shrink. Form action footers span the grid and no longer inherit the global sidebar margin. Item information retains three balanced desktop columns, ordinary sections two; cards reorganize at narrower widths and mobile uses one column with full-width primary actions.

| Viewport | Before item form | After form | Available parent |
|---|---:|---:|---:|
|1920|1100|1584|1584|
|1440|1100|1104|1104|
|1024|748|748|748|
|768|720|720|720|
|390|358|358|358|

The1440 layout already had only1104px after sidebar and padding. The largest visible width correction is on1920 screens; smaller screens retain their useful full width. Challan columns now allocate the largest track to Bottle, at least160px to Available, balanced financial tracks and a44px accessible Remove action. Below1101 the existing card layout returns visible labels. Prices and totals use grouping and two decimals without converting exact decimal strings to floating point; underlying rate and discount payloads remain unchanged.

Measured45 form/viewport combinations cover add item, stock production, purchase, challan, client/vendor payment, expense and client/vendor forms at1920/1440/1024/768/390. All matched parent width within2px; every measured control stayed inside the viewport and at least40px high. Edit forms share the same wrapper; opening workflows share transaction and party fieldsets. Existing tables, ledger styling, sidebar, typography and colors are retained.

Before screenshots: `tmp/v12a-before/{item,stock,challan,payment,expense}-{width}.png` (25 images), with bounds in layout.json. After: `tmp/v12-browser-a-demo/form-{route}-{width}.png` and layout.json (45 images). Filled challan: `tmp/v12-browser-a-04/challan-rate-discount.png`. Final read-only mobile screenshot: `tmp/v12-browser-a-demo/mobile-line-editor.png`.

Print media remains separate: the actual downloaded delivery note renders on one A4 page without rates, money, discount or GST. The company register remains one landscape page. Screenshots and generated exports stay in ignored evidence directories.
