# Backup File Format (version 2)

A backup is a single UTF-8 JSON text file, named like
`sarisari-backup-2026-10-24-1430.json` (date and time on the phone that made it).
"Back up without photos" files end in `-no-photos.json`.
It contains **every product**, both active and deactivated, and (unless left out) every product photo.

App 1.1 writes **version 2**. It can still restore **version 1** files made by app 1.0, which have no photos.

## Example

```json
{
  "format": "sari-sari-store-backup",
  "formatVersion": 2,
  "appVersion": "1.1.0",
  "exportedAt": "2026-10-24T06:30:00.000Z",
  "includesPhotos": true,
  "productCount": 2,
  "photoCount": 1,
  "products": [
    {
      "id": 1,
      "name": "Coke Mismo 290ml",
      "category": "Beverages",
      "unit": "bottle",
      "costPriceCentavos": 1650,
      "sellingPriceCentavos": 2000,
      "stockQuantity": 24,
      "lowStockThreshold": 5,
      "isActive": true,
      "createdAt": 1792800000000,
      "updatedAt": 1792800000000,
      "barcode": "4801981116072"
    },
    {
      "id": 2,
      "name": "Ice tubig",
      "category": "Others",
      "unit": "piece",
      "costPriceCentavos": 300,
      "sellingPriceCentavos": 500,
      "stockQuantity": 40,
      "lowStockThreshold": 0,
      "isActive": true,
      "createdAt": 1792800000000,
      "updatedAt": 1792800000000
    }
  ],
  "photos": [
    {"productId":1,"updatedAt":1792800000000,"full":{"type":"image/jpeg","width":800,"height":600,"data":"/9j/4AAQ…"},"thumb":{"type":"image/jpeg","width":160,"height":160,"data":"/9j/4AAQ…"}}
  ]
}
```

## Top-level fields

| Field | Meaning |
|---|---|
| `format` | Always `"sari-sari-store-backup"`. Identifies the file. |
| `formatVersion` | `2` (or `1` for app 1.0 files). Files newer than the app understands are refused. |
| `appVersion` | The app version that made the backup (for information only). |
| `exportedAt` | When the backup was made, in UTC (ISO 8601). |
| `includesPhotos` | `false` for "Back up without photos" (version 2 only). |
| `productCount` / `photoCount` | Must equal the number of `products` / `photos`, which catches cut-off files. |
| `products` | The products, sorted by `id`. |
| `photos` | One entry per product that has a photo (version 2 only). Each photo is on a single line. |

## Product fields

These are the same as in the database (see [DATA_MODEL.md](DATA_MODEL.md)).

- **Prices are whole centavos.** `2000` means ₱20.00. Decimals are not allowed.
- **Barcodes are text**, so leading zeros are kept. A product without a barcode has no `barcode` field at all.
- `createdAt` and `updatedAt` are milliseconds since 1 January 1970 UTC.

## Photo fields

| Field | Meaning |
|---|---|
| `productId` | The `id` of the product it belongs to. It must be in the same file. |
| `updatedAt` | When the photo was last changed |
| `full` | About 800 px on the longest side, JPEG. `data` is the picture's bytes as **base64** text. |
| `thumb` | A 160 × 160 square for lists, JPEG, also base64 |

Allowed picture types: `image/jpeg`, `image/png`, `image/webp`. Limits: 2 MB for a full photo, 256 KB for a thumbnail.

## What restoring checks

**Nothing is changed unless every check passes.**

1. The file is readable JSON, not empty, and at most 250 MB.
2. `format` is correct.
3. `formatVersion` is not newer than this app understands. If it is, the app asks you to update first.
4. `productCount` (and in version 2, `photoCount`) matches.
5. `exportedAt` is a valid date.
6. Every product has a valid `id`, valid dates, and passes the same rules as the product form (name, prices, stock and so on).
7. No two products share an `id` or a `barcode`.
8. Every photo belongs to a product in the file, there's at most one per product, and its type, size and base64 data are valid.

## How restoring works

1. A preview shows the backup's date, its product and photo counts, and what's on the phone now.
   It warns if the backup is **older** than your latest changes, and if a backup **without photos**
   would remove photos that are on the phone.
2. You confirm twice: **Replace my products**, then **Replace** in the confirmation box.
3. In one database transaction, the app:
   - saves the current products **and photos** as a **safety copy**,
   - removes them, and
   - adds the backup's products (with their original IDs and dates) and photos.

   If anything fails, nothing changes.
4. **Undo last restore** puts the safety copy back. Only the most recent restore can be undone.

Restoring **replaces** all products and photos; it does not merge. To combine two phones' products, add the missing ones by hand.
