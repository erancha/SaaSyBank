import { AppState } from './types';

const initialState: AppState = {
  mnu: {
    showOverview: false,
    menuOpen: false,
    showAuthentication: true,
    anchorElCategories: null,
    anchorElClosedAccounts: null,
    anchorEl: null,
    myBetsOpen: false,
    analyticsType: null,
  },
  auth: {
    isAuthenticated: false,
    isAdmin: false,
    JWT: null,
    userId: null,
    userName: null,
  },
  websockets: {
    isConnected: false,
    isAppVisible: true,
    connectionsAndUsernames: [],
    showConnections: false,
    lastConnectionsTimestamp: '',
    lastConnectionsTimestampISO: '',
  },
  accounts: {
    showNewAccountForm: false,
    accounts: [],
    recordToBroadcast: null,
    stateToBroadcast: null,
    newAccountForm: {
      id: '',
      balance: 0,
      errors: {},
    },
  },
  transactions: {
    transactions: [],
    analyticsData: [],
  },
};

export default initialState;
