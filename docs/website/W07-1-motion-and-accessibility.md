# Motion and accessibility

Cards rise 5px with a stronger soft shadow. Product images scale 1.025 on fine-pointer hover; decorations and arrows move subtly. Crossfades and hover transitions run around 250–300ms with ease-out timing. Existing section reveals share a short upward entrance; hero content and gallery changes use the same restrained language. There are no animation dependencies or continuous JavaScript loops.

The entire card remains one link with an always-visible CTA. Focus has an orange outline and equivalent visual treatment. Decorative circles, secondary photos and arrow glyphs are hidden from assistive technology. The primary retains meaningful alt text. Gallery arrows, thumbnail pressed state, count announcements, keyboard and real touch gestures are preserved.

`prefers-reduced-motion: reduce` disables animations/transitions and added transforms. Content is visible before JavaScript and when IntersectionObserver is absent: the implementation does not hide content waiting for an observer. Motion uses transforms/opacity rather than animated layout dimensions. Fixed image regions and declared dimensions preserve layout.

Chrome checks verify focus, reduced motion, no-JavaScript content, missing observer, mobile gestures and stable card dimensions. Lighthouse accessibility is 100 on all four sampled pages.
