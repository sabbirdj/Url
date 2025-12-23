// Simulating a PostgreSQL Schema via TypeScript interfaces

export enum DeviceType {
  DESKTOP = 'Desktop',
  MOBILE = 'Mobile',
  TABLET = 'Tablet',
  OTHER = 'Other'
}

export interface Link {
  id: string;
  originalUrl: string;
  alias: string; // The custom slug/short code
  createdAt: string; // ISO Date
  expiresAt?: string; // ISO Date, optional
  active: boolean;
  userId: string; // Foreign key simulation
}

// Simulates a high-volume analytics table (Time-Series data)
export interface ClickEvent {
  id: string;
  linkId: string;
  timestamp: string;
  country: string;
  city: string;
  device: DeviceType;
  referrer: string;
  userAgent: string;
}

export interface AnalyticsSummary {
  totalClicks: number;
  clicksByDate: { date: string; clicks: number }[];
  clicksByDevice: { name: string; value: number }[];
  clicksByCountry: { country: string; clicks: number }[];
  clicksByReferrer: { referrer: string; clicks: number }[];
}

export type CreateLinkDTO = {
  originalUrl: string;
  alias?: string;
  expiresAt?: string;
};
