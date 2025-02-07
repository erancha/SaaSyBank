import { WebsocketsState } from '../store/types';
import initialState from '../store/initialState';
import {
  SET_WS_CONNECTED,
  ISetWSConnectedAction,
  SET_APP_VISIBLE,
  ISetAppVisibleAction,
  SET_CONNECTIONS_AND_USERNAMES,
  ISetConnectionsAndUsernamesAction,
  TOGGLE_CONNECTIONS,
  IToggleConnectionsAction,
} from './actions';

type HandledActions = ISetWSConnectedAction | ISetAppVisibleAction | ISetConnectionsAndUsernamesAction | IToggleConnectionsAction;

export const websocketsReducers = (state: WebsocketsState = initialState.websockets, action: HandledActions): WebsocketsState => {
  switch (action.type) {
    case SET_WS_CONNECTED: {
      const currentTimestamp = new Date();
      return {
        ...state,
        isConnected: action.payload,
        lastConnectionsTimestamp: action.payload ? currentTimestamp.toLocaleString('en-GB', options) : '',
        lastConnectionsTimestampISO: action.payload ? currentTimestamp.toISOString() : '',
      };
    }

    case SET_APP_VISIBLE: {
      return {
        ...state,
        isAppVisible: action.payload,
      };
    }

    case SET_CONNECTIONS_AND_USERNAMES: {
      const currentTimestamp = new Date();
      const lastConnectionsTimestampISO = currentTimestamp.toISOString();
      // console.log('SET_CONNECTIONS_AND_USERNAMES:', { lastConnectionsTimestampISO });
      return {
        ...state,
        connectionsAndUsernames: action.payload ? action.payload : state.connectionsAndUsernames,
        lastConnectionsTimestamp: currentTimestamp.toLocaleString('en-GB', options),
        lastConnectionsTimestampISO,
      };
    }

    case TOGGLE_CONNECTIONS:
      return {
        ...state,
        showConnections: action.payload,
      };

    default:
      return state;
  }
};

const options: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: 'numeric',
  hour12: false,
};
