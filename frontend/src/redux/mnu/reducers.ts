import { MnuState } from '../store/types';
import initialState from '../store/initialState';
import {
  TOGGLE_OVERVIEW,
  IToggleOverviewAction,
  TOGGLE_MENU,
  IToggleMenuAction,
  SET_ANCHOR_EL,
  ISetAnchorElAction,
  SET_ANCHOR_EL_CATEGORIES,
  ISetAnchorElCategoriesAction,
  SET_ANCHOR_EL_CLOSED_ACCOUNTS,
  ISetAnchorElClosedAccountsAction,
  SHOW_MY_BETS,
  IShowAccountTransactionsAction,
  SET_REPORT_NAME,
  ISetAnalyticsTypeAction,
} from './actions';

type HandledActions =
  | IToggleOverviewAction
  | IToggleMenuAction
  | ISetAnchorElAction
  | ISetAnchorElCategoriesAction
  | ISetAnchorElClosedAccountsAction
  | IShowAccountTransactionsAction
  | ISetAnalyticsTypeAction;

export const mnuReducers = (state: MnuState = initialState.mnu, action: HandledActions): MnuState => {
  switch (action.type) {
    case TOGGLE_OVERVIEW:
      return { ...state, showOverview: action.payload };
    case TOGGLE_MENU:
      return { ...state, menuOpen: action.payload.show, showAuthentication: action.payload.showAuthentication };
    case SET_ANCHOR_EL:
      return { ...state, anchorEl: action.payload };
    case SET_ANCHOR_EL_CATEGORIES:
      return { ...state, anchorElCategories: action.payload };
    case SET_ANCHOR_EL_CLOSED_ACCOUNTS:
      return { ...state, anchorElClosedAccounts: action.payload };
    case SHOW_MY_BETS:
      return { ...state, myBetsOpen: action.payload };
    case SET_REPORT_NAME:
      return { ...state, analyticsType: action.payload };
    default:
      return state;
  }
};
