# Bottle item design

Fields: immutable code, free-form description, quality, colour, packing, remarks, active status and revision. All items are bottles; no category tree or unit conversion is exposed. Metadata changes are version checked and audited. Quantity is never accepted in the item-master API.

The list supports search; add/edit/detail routes are `/management/items/new`, `/management/items/:id/edit`, `/management/items/:id`. Detail shows current stock or Opening unverified, and links to explicit stock opening and movement history. Drafts freeze reviewed item metadata/version; a change before finalization requires review/revision. Posted line snapshots remain unchanged after master edits.

Sample synthetic item:700ml PB Rivo, HDPE, Black,15x80. This describes a test bottle and is not a company price or migrated record.
