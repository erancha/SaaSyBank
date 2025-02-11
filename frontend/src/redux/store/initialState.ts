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
  accounts: {
    accounts: [],
    currentAccountId: null,
    showNewAccountForm: false,
    newRecordToUpload: null,
    stateToUpload: null,
    // accountIdToDelete: null,
    newAccountForm: {
      id: '',
      balance: 0,
      errors: {},
    },
  },
  transactions: {
    transactions: [],
    analyticsData: [],
    newRecordToUpload: null,
  },
};

export default initialState;
