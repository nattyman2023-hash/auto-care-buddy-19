// Centralized promo / sale price logic for products and services.

export interface PromoLike {
  is_on_promo?: boolean | null;
  sale_price?: number | null;
}

interface ProductLike extends PromoLike {
  price: number;
  compare_at_price?: number | null;
}

interface ServiceLike extends PromoLike {
  base_price: number;
}

/** Effective price for a product (sale_price if on promo, else price). */
export const productPrice = (p: ProductLike) => {
  if (p.is_on_promo && p.sale_price != null) return Number(p.sale_price);
  return Number(p.price);
};

/** Strike-through original price for a product, if any. */
export const productOriginal = (p: ProductLike): number | null => {
  if (p.is_on_promo && p.sale_price != null) return Number(p.price);
  if (p.compare_at_price && p.compare_at_price > p.price) return Number(p.compare_at_price);
  return null;
};

export const productOnSale = (p: ProductLike) =>
  productOriginal(p) != null;

/** Effective price for a service. */
export const servicePrice = (s: ServiceLike) => {
  if (s.is_on_promo && s.sale_price != null) return Number(s.sale_price);
  return Number(s.base_price);
};

export const serviceOriginal = (s: ServiceLike): number | null => {
  if (s.is_on_promo && s.sale_price != null) return Number(s.base_price);
  return null;
};

export const serviceOnSale = (s: ServiceLike) =>
  serviceOriginal(s) != null;

/** Discount percent, rounded. */
export const discountPercent = (original: number, current: number) => {
  if (!original || original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
};
