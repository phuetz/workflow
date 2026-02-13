/**
 * Facebook Ads Integration Types
 * Advertising platform for campaigns and insights
 */

export interface FacebookAdsCredentials {
  accessToken: string;
  adAccountId: string; // Format: act_XXXXXXXXX
}

export type FacebookAdsOperation =
  | 'createCampaign'
  | 'getCampaign'
  | 'updateCampaign'
  | 'getInsights'
  | 'createAdSet'
  | 'getAdSet';

export interface FacebookAdsResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface FacebookCampaign {
  id?: string;
  name: string;
  objective?: 'BRAND_AWARENESS' | 'REACH' | 'TRAFFIC' | 'APP_INSTALLS' | 'VIDEO_VIEWS' | 'LEAD_GENERATION' | 'CONVERSIONS';
  status?: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  special_ad_categories?: string[];
  created_time?: string;
  updated_time?: string;
}

export interface FacebookAdSet {
  id?: string;
  name: string;
  campaign_id: string;
  billing_event?: 'IMPRESSIONS' | 'CLICKS' | 'LINK_CLICKS';
  optimization_goal?: 'IMPRESSIONS' | 'LINK_CLICKS' | 'REACH' | 'CONVERSIONS';
  daily_budget?: number;
  lifetime_budget?: number;
  status?: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  targeting?: Record<string, unknown>;
}

export interface FacebookInsights {
  impressions?: string;
  clicks?: string;
  spend?: string;
  reach?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  date_start?: string;
  date_stop?: string;
}
