# Form usability

Existing sidebar/header/fonts/cards remain. Item details use three desktop columns (description spans two), ordinary transaction fieldsets use two. Tablet uses two columns; mobile one. Grid tracks use minmax(0,1fr), children min-width0. Notes/address span the grid. Save actions have separate footers. Settings password fields also use a responsive grid. No form nth-child rules.

Bottle rows give selection most width, narrow quantity, and only purchase/challan rows show rate/amount. Exact BigInt previews and separate quantity/amount totals do not change service calculations. Remove line remains explicit and Add bottle line remains visible.

Baseline source435eee was archived and independently built in ignored tmp/v11-baseline, without changing the current working sources.30 baseline form screenshots and rectangles: tmp/simple-v11-before. Final33 form/report/settings viewport screenshots and rectangles: tmp/simple-v1/v11-demo/form-measurements.json and form-*.png. Widths1440/768/390. Visual review additionally caught and fixed inherited label flex-basis creating large selector gaps. All source screenshots are synthetic and retained locally.
