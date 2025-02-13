// Analytics CRUD params
export interface IAnalyticsParams {
  analyticsType?: string;
}

export interface IReadAnalyticsParams {
  analyticsType: string;
}

// Analytics-specific action types
export const SET_ANALYTICS_DATA = 'SET_ANALYTICS_DATA';

// Analytics-specific action interfaces
export interface ISetAnalyticsDataAction {
  type: typeof SET_ANALYTICS_DATA;
  payload: any[]; // TODO: Define specific analytics data type
}

export type AnalyticsActionTypes = ISetAnalyticsDataAction;
