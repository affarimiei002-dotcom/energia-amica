export type Commodity = 'electricity' | 'gas';
export type CommoditySelection = 'electricity' | 'gas' | 'both';
export type PriceType = 'fixed' | 'variable';
export type ConsumptionBand = 'low' | 'medium' | 'high';
export type AlertType = 'BETTER_OFFER' | 'EXPIRY_REMINDER';

export interface UserSupply {
  id?: string;
  user_id: string;
  commodity: Commodity;
  cap: string;
  annual_kwh?: number | null;
  annual_smc?: number | null;
  consumption_band?: ConsumptionBand | null;
  created_at?: string;
  updated_at?: string;
}

export interface CurrentContract {
  id?: string;
  user_id: string;
  commodity: Commodity;
  supplier_name?: string | null;
  offer_name?: string | null;
  price_type: PriceType;
  unit_price?: number | null;
  fixed_fee_monthly: number;
  expiry_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationPrefs {
  id?: string;
  user_id: string;
  min_savings_annual: number;
  max_better_offer_frequency_days: number;
  enable_expiry_reminders: boolean;
  expiry_offsets_days: number[];
  created_at?: string;
  updated_at?: string;
}

export interface Alert {
  id?: string;
  user_id: string;
  alert_type: AlertType;
  commodity?: Commodity | null;
  offer_id?: string | null;
  savings_annual_est?: number | null;
  message: string;
  sent_via: string;
  sent_at: string;
}

export interface Offer {
  id: string;
  source: string;
  source_offer_id: string;
  commodity: Commodity;
  supplier_name: string;
  offer_name: string;
  price_type?: PriceType | null;
  unit_price_est?: number | null;
  fixed_fee_monthly_est?: number | null;
  url_offer?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  raw?: any;
  imported_at: string;
}

export interface ImportRun {
  id: string;
  started_at: string;
  finished_at?: string | null;
  status: string;
  source: string;
  errors?: any;
}

export interface ConsumptionBandDefault {
  id: string;
  commodity: Commodity;
  band: ConsumptionBand;
  annual_value: number;
}

export interface Consent {
  id?: string;
  user_id: string;
  affiliate_lead_consent: boolean;
  analytics_consent: boolean;
  created_at?: string;
}

export interface OnboardingData {
  commoditySelection: CommoditySelection;
  cap: string;
  electricityConsumptionType: 'band' | 'exact';
  electricityBand?: ConsumptionBand;
  electricityKwh?: number;
  gasConsumptionType: 'band' | 'exact';
  gasBand?: ConsumptionBand;
  gasSmc?: number;
  electricityContract?: {
    supplier_name?: string;
    offer_name?: string;
    price_type: PriceType;
    unit_price?: number;
    fixed_fee_monthly: number;
    expiry_date: string;
  };
  gasContract?: {
    supplier_name?: string;
    offer_name?: string;
    price_type: PriceType;
    unit_price?: number;
    fixed_fee_monthly: number;
    expiry_date: string;
  };
  min_savings_annual: number;
  max_better_offer_frequency_days: number;
  enable_expiry_reminders: boolean;
}
