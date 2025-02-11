import { MnuState } from '../store/types';
import initialState from '../store/initialState';
import {
  TOGGLE_OVERVIEW,
  IToggleOverviewAction,
  TOGGLE_MENU,
  IToggleMenuAction,
  SET_ANCHOR_EL,
  ISetAnchorElAction,
  // SET_ANALYTICS_TYPE,
  // ISetAnalyticsTypeAction,
} from './actions';

type HandledActions =
  | IToggleOverviewAction
  | IToggleMenuAction
  | ISetAnchorElAction;
  // | ISetAnalyticsTypeAction;

export const mnuReducers = (state: MnuState = initialState.mnu, action: HandledActions): MnuState => {
  switch (action.type) {
    case TOGGLE_OVERVIEW:
      return { ...state, showOverview: action.payload };

    case TOGGLE_MENU:
      return { ...state, menuOpen: action.payload };

    case SET_ANCHOR_EL:
      return { ...state, anchorEl: action.payload };

    // case SET_ANALYTICS_TYPE:
    //   return { ...state, analyticsType: action.payload };

    default:
      return state;
  }
};
