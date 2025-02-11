// show or hide the overview.
export const TOGGLE_OVERVIEW = 'TOGGLE_OVERVIEW';
export interface IToggleOverviewAction {
  type: typeof TOGGLE_OVERVIEW;
  payload: boolean;
}
export const toggleOverviewAction = (show: boolean): IToggleOverviewAction => ({
  type: TOGGLE_OVERVIEW,
  payload: show,
});

// open or close the menu.
export const TOGGLE_MENU = 'TOGGLE_MENU';
export interface IToggleMenuAction {
  type: typeof TOGGLE_MENU;
  payload: boolean 
}
export const toggleMenuAction = (show: boolean): IToggleMenuAction => ({
  type: TOGGLE_MENU,
  payload: show,
});

export const SET_ANCHOR_EL = 'SET_ANCHOR_EL';
export interface ISetAnchorElAction {
  type: typeof SET_ANCHOR_EL;
  payload: HTMLElement | null;
}
export const setAnchorElAction = (anchorEl: HTMLElement | null): ISetAnchorElAction => ({
  type: SET_ANCHOR_EL,
  payload: anchorEl,
});

export const SET_REPORT_NAME = 'SET_REPORT_NAME';
export interface ISetAnalyticsTypeAction {
  type: typeof SET_REPORT_NAME;
  payload: string | null;
}
export const setAnalyticsTypeAction = (analyticsType: string | null): ISetAnalyticsTypeAction => ({
  type: SET_REPORT_NAME,
  payload: analyticsType,
});
