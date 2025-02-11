import { Dispatch } from 'redux';
import { AuthContextProps } from 'react-oidc-context';
import appConfigData from '../../appConfig.json';

export const SET_AUTH_LOGIN_SUCCESS = 'SET_AUTH_LOGIN_SUCCESS';
export interface ISetAuthLoginSuccessAction {
  type: typeof SET_AUTH_LOGIN_SUCCESS;
  payload: { JWT: string; userId: string; username: string };
}
const setAuthLoginSuccessAction = (JWT: string, userId: string, username: string): ISetAuthLoginSuccessAction => ({
  type: SET_AUTH_LOGIN_SUCCESS,
  payload: { JWT, userId, username },
});

export const SET_IS_ADMIN = 'SET_IS_ADMIN';
export interface ISetIsAdminAction {
  type: typeof SET_IS_ADMIN;
  payload: boolean;
}
export const setIsAdminAction = (): ISetIsAdminAction => ({
  type: SET_IS_ADMIN,
  payload: true,
});

export const SET_AUTH_LOGOUT = 'SET_AUTH_LOGOUT';
export interface ISetAuthLogoutAction {
  type: typeof SET_AUTH_LOGOUT;
}
const setAuthLogoutAction = (): ISetAuthLogoutAction => ({
  type: SET_AUTH_LOGOUT,
});

//==================
// Action Creators
//==================
export const loginWithGoogleAction = (auth: AuthContextProps) => async (dispatch: Dispatch) => {
  try {
    await auth.signinRedirect();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Google Sign-in failed';
    // alert(errorMessage);
    console.error({ errorMessage });
    dispatch(setAuthLogoutAction());
  }
};

export const checkAuthStatusAction = (auth: AuthContextProps) => async (dispatch: Dispatch) => {
  try {
    if (auth.user?.profile.name && auth.user.id_token) {
      dispatch(setAuthLoginSuccessAction(auth.user.id_token.toString(), auth.user.profile.sub, auth.user.profile.name));
    } else {
      if (auth.isAuthenticated) console.warn('Invalid auth.user');
      dispatch(setAuthLogoutAction());
    }
  } catch (error) {
    console.error(error);
    dispatch(setAuthLogoutAction());
  }
};

export const logoutUserAction = (auth: AuthContextProps) => async (dispatch: Dispatch) => {
  try {
    await auth.removeUser();
    window.location.href = `https://${appConfigData.COGNITO.domain}/logout?client_id=${appConfigData.COGNITO.userPoolWebClientId}&logout_uri=${appConfigData.COGNITO.redirectSignOut}`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Logout failed';
    console.error({ errorMessage });
  } finally {
    dispatch(setAuthLogoutAction());
  }
};
