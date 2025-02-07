import { AuthState } from '../store/types';
import initialState from '../store/initialState';
import {
  SET_AUTH_LOGIN_SUCCESS,
  ISetAuthLoginSuccessAction,
  SET_IS_ADMIN,
  ISetIsAdminAction,
  SET_AUTH_LOGOUT,
  ISetAuthLogoutAction,
} from './actions';

type HandledActions = ISetAuthLoginSuccessAction | ISetIsAdminAction | ISetAuthLogoutAction;

export const authReducers = (state: AuthState = initialState.auth, action: HandledActions): AuthState => {
  switch (action.type) {
    case SET_AUTH_LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        JWT: action.payload.JWT,
        userId: action.payload.userId,
        userName: action.payload.userName,
      };

    case SET_IS_ADMIN:
      return { ...state, isAdmin: action.payload };

    case SET_AUTH_LOGOUT:
      return {
        ...state,
        isAuthenticated: false,
        JWT: null,
        userId: null,
        userName: null,
      };

    default:
      return state;
  }
};
