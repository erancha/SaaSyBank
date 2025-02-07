import { IConnectionAndUsername } from '../store/types';

// save the current websocket connection state.
export const SET_WS_CONNECTED = 'SET_WS_CONNECTED';
export interface ISetWSConnectedAction {
  type: typeof SET_WS_CONNECTED;
  payload: boolean;
}
export const setWSConnectedAction = (isConnected: boolean): ISetWSConnectedAction => ({
  type: SET_WS_CONNECTED,
  payload: isConnected,
});

// save the visiblility of the application (whether the page is displayed in the browser or not).
export const SET_APP_VISIBLE = 'SET_APP_VISIBLE';
export interface ISetAppVisibleAction {
  type: typeof SET_APP_VISIBLE;
  payload: boolean;
}
export const setAppVisibleAction = (isVisible: boolean): ISetAppVisibleAction => ({
  type: SET_APP_VISIBLE,
  payload: isVisible,
});

// save all connected users in the state:
export const SET_CONNECTIONS_AND_USERNAMES = 'SET_CONNECTIONS_AND_USERNAMES';
export interface ISetConnectionsAndUsernamesAction {
  type: typeof SET_CONNECTIONS_AND_USERNAMES;
  payload: IConnectionAndUsername[] | null;
}
export const setConnectionsAndUsernamesAction = (connectionsAndUsernames: IConnectionAndUsername[] | null): ISetConnectionsAndUsernamesAction => ({
  type: SET_CONNECTIONS_AND_USERNAMES,
  payload: connectionsAndUsernames,
});

// show or hide the connected users:
export const TOGGLE_CONNECTIONS = 'TOGGLE_CONNECTIONS';
export interface IToggleConnectionsAction {
  type: typeof TOGGLE_CONNECTIONS;
  payload: boolean;
}
export const toggleConnectionsAction = (show: boolean): IToggleConnectionsAction => ({
  type: TOGGLE_CONNECTIONS,
  payload: show,
});
