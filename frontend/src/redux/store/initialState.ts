import { AppState } from './types';

const initialState: AppState = {
  mnu: {
    showOverview: false,
    menuOpen: false,
    anchorEl: null,
    analyticsType: null,
  },
  auth: {
    isAuthenticated: false,
    isAdmin: false,
    JWT: null,
    userId: null,
    username: null,
  },
  websockets: {
    isConnected: false,
    isAppVisible: true,
    connectionsAndUsernames: [],
    showConnections: false,
    lastConnectionsTimestamp: '',
    lastConnectionsTimestampISO: '',
  },
  crud: {
    createCommand: null,
    readCommand: null,
    updateCommand: null,
    deleteCommand: null,
  },
  accounts: {
    accounts: [],
    currentAccountId: null,
    showNewAccountForm: false,
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
