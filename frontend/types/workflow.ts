export const assetStatuses = [
  'DRAFT',
  'PROCESSING',
  'REVIEW_REQUIRED',
  'APPROVED',
  'PUBLISHED',
] as const;

export type AssetStatus = (typeof assetStatuses)[number];
