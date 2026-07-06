---
name: E-Commerce Store
description: Product shop for wigs, hair care, tools & accessories alongside existing service booking.
type: feature
---
- `products` table: name, price, compare_at_price, category, tags[], image_url, stock_quantity, sku, is_featured, is_active
- `orders` + `order_items` tables for checkout flow
- CartContext supports dual types: `service` and `product` items
- Public routes: /shop (catalog), /shop/:id (detail with "You May Also Like")
- Admin routes: /products (CRUD + image upload), /orders (status management)
- "Shop" link in public navbar (desktop + mobile)
- Homepage "Shop the Collection" section shows featured products
- Products use `site-images` storage bucket for photos
