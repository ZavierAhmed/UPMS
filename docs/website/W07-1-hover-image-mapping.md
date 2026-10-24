# Primary and hover image mapping

| Category | Primary | Hover | Actual source |
|---|---|---|---|
| Plastic Buckets | `bucket-20l-front`, blue | `bucket-10l-front`, white | Bucket.pdf page 1, Im0.png / Im1.png |
| Lubricant Cans | `blow-design-02` | `blow-design-03` | Company_Profile_New_HD_Bottles (1).pdf pages 2 / 3, Im4.png on each page |
| Plastic Cans | `jerrycan-20l`, green | `jerrycan-30l`, blue | Bucket.pdf page 3, Im1.png / Im0.png |
| Custom Packaging | Existing concept graphic | Background/arrow treatment | Explicit illustration; no photographed product claimed |

The existing `catalog.js` retains full source pages, XObjects, dimensions and responsive URLs. Company product data centrally selects primary/hover objects from the same category gallery. Plastic Cans starts at 20L and retains both detail images. No new photo assets, recoloring, capacity inference or certifications are introduced.

Secondary images are mounted on fine-pointer hover or focus intent. The primary remains visible until the secondary has loaded successfully; a missing secondary does not fade the primary away. At most one secondary per card is mounted, retained for reuse, with responsive sources. Touch users retain the primary and browse other images in the detail gallery. There is no cycling or autoplay.
