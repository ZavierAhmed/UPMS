# Image delivery

21 extracted masters produce 84 WebP derivatives totaling 1,042,080 bytes. Product widths: 160px thumbnails and 320/640/960px responsive main images. Home/About range widths: 160/320/640/1200px. Raw PDFs and full-page exports are excluded from runtime and deployment packaging.

Home hero and selected detail image have eager/high priority. Listing cards, secondary images and thumbnail images are lazy. Width/height and fixed gallery stage reserve layout space. Only the selected main image is rendered; changing a slide requests its responsive variant. Small thumbnail files do not preload every full-size design. Browser resource evidence is recorded in `tmp/w07/browser-resources.json`; final Lighthouse measurements are recorded in the test report.

No slider library or extra runtime dependency is added. Existing management bundle size advisory is unchanged and outside this public milestone.

The targeted cans interaction sequence recorded 21 catalog requests and 196,036 encoded bytes after several slide selections and a viewport resize. This includes thumbnails and selected responsive variants; it is not an initial-load-only measurement.
