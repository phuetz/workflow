/**
 * Google Analytics Integration Types
 * Web analytics and reporting platform
 */

export interface GoogleAnalyticsCredentials {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

export type GoogleAnalyticsOperation =
  | 'getReport'
  | 'getRealtime'
  | 'trackEvent'
  | 'trackPageview';

export interface GoogleAnalyticsResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface GoogleAnalyticsReportRequest {
  viewId: string;
  dateRanges: Array<{
    startDate: string; // YYYY-MM-DD
    endDate: string;
  }>;
  metrics: Array<{
    expression: string; // e.g., 'ga:sessions', 'ga:users'
  }>;
  dimensions?: Array<{
    name: string; // e.g., 'ga:country', 'ga:deviceCategory'
  }>;
  orderBys?: Array<{
    fieldName: string;
    sortOrder?: 'ASCENDING' | 'DESCENDING';
  }>;
}

export interface GoogleAnalyticsReport {
  columnHeader?: {
    dimensions?: string[];
    metricHeader?: {
      metricHeaderEntries?: Array<{
        name: string;
        type: string;
      }>;
    };
  };
  data?: {
    rows?: Array<{
      dimensions?: string[];
      metrics?: Array<{
        values?: string[];
      }>;
    }>;
    totals?: Array<{
      values?: string[];
    }>;
  };
}
