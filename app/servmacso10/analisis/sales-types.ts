export type Metric = {
  current: number;
  previous: number;
  change: number | null;
};
export type SalesSummary = {
  sales: Metric;
  revenue: Metric;
  revenueUsd: Metric;
  averageTicket: Metric;
  requests: Metric;
  conversion: Metric;
  exchangeRateCoverage: { sales: number; total: number };
  conversionDefinition: string;
  marginReason: string;
};
export type SalesTimeline = {
  items: Array<{ bucket: string; sales: number; revenue: number }>;
};
export type SalesProducts = {
  items: Array<{
    model: string;
    category: string;
    units: number;
    revenue: number;
    average_days_to_sale: number | null;
    dated_sales: number;
  }>;
};
export type SalesChannels = {
  items: Array<{
    place_type: string;
    location: string;
    customer_kind: string;
    sales: number;
    revenue: number;
  }>;
};
export type SalesStock = {
  active: number;
  averageAgeDays: number;
  over30: number;
  over60: number;
  ageDefinition: string;
  items: Array<{
    id: string;
    title: string;
    sku: string;
    age_days: number;
    created_at: string;
  }>;
};
export type SellerRow = {
  owner_id: number;
  username: string;
  sales: number;
  revenue: number;
  average_ticket: number;
  active: number;
  last_sale: string | null;
  change: number | null;
};
export type Sellers = { items: SellerRow[] };
