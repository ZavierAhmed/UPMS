# Corrective form usability

Current navigation/theme/header/dashboard are retained. The new BottleLineEditor supplies shared desktop headings and subtle row numbers. Production: Bottle/Quantity/Action. Purchases add purchase rate/amount. Challans add available stock, readonly selling rate and amount. The item selector gets the widest track. Remove uses a compact close icon with an accessible per-row name. Add bottle line stays visible.

Below1100px the rows become cards with meaningful field labels; mobile uses one column. No user-visible Bottle item1, Quantity1 or Rate PKR1 labels. Repeated controls retain accessible names inside a named row group. Server errors appear beside matching inputs, use aria-invalid/describedby, focus the first invalid field and retain state. Required markers do not misalign desktop row controls.

Actual browser screenshots and measured bounds at1440/768/390 are private under tmp/v12-browser-04 and tmp/v12-browser-demo. Final clean evidence: add-item.png, production-duplicate.png, challan-rate-discount.png, mobile-line-editor.png, form-*.png and layout.json in the demo directory. Earlier500-stock successful posting screenshots/requests remain in04. Demo review screenshots show the preserved300 bottles remaining after its seeded200-bottle sale. Scroll is reset before capture so fixed navigation/banner position is represented correctly.

Back/Forward and unsaved line selection/quantity restoration passed. Saved-draft old-rate retention and explicit price refresh passed through the actual browser. Public website design/assets remain unchanged.
