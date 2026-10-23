# Data Model (database version 1)

The app keeps its data in the phone browser's built-in database (IndexedDB),
in a database named `sari-sari-store`. Nothing is sent to the internet.

## `products`

One record per product. The key is `id`, assigned automatically and never reused.

| Field | Type | Rules |
|---|---|---|
| `id` | whole number | Assigned by the database |
| `name` | text | Required, 1–80 characters, extra spaces removed |
| `barcode` | text, **optional** | Left out entirely when the product has no barcode. Stored as text, so leading zeros are kept. **Unique** — enforced by the database index `barcode`. No spaces, max 64 characters. |
| `category` | text | Max 40 characters. Empty becomes "Others". |
| `costPriceCentavos` | whole number | ₱12.50 is stored as `1250`. 0 to 99,999,999 (₱999,999.99). |
| `sellingPriceCentavos` | whole number | Same as cost price. May be lower than cost (the app warns). |
| `stockQuantity` | whole number | 0 to 99,999 |
| `unit` | text | Required, e.g. piece, pack, bottle, sachet, can. Max 20 characters. |
| `lowStockThreshold` | whole number | 0 to 99,999. 0 turns the low-stock alert off. |
| `isActive` | true / false | `false` = deactivated. Products are never deleted. |
| `createdAt`, `updatedAt` | whole number | Milliseconds since 1 January 1970 UTC (`Date.now()`) |

**Stock status** is worked out when needed, not stored:

- **Out of stock**: `stockQuantity` is 0
- **Low stock**: `stockQuantity` is above 0 and at or below `lowStockThreshold` (when the threshold is above 0)
- **In stock**: everything else

## `meta`

Small key–value facts about the app.

| Key | Meaning |
|---|---|
| `firstOpenedAt` | When the app was first opened on this phone |
| `openCount` | How many times the app has been opened |

## Changing the structure later

Raise `DB_VERSION` in `src/lib/db/database.ts` and add a new upgrade step.
Existing steps must never be edited. Planned future stores (POS): `sales`,
`saleItems` and `stockMovements`, each linked to `products.id`.
