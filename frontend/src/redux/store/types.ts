export interface AppState {
  mnu: MnuState;
  auth: AuthState;
  websockets: WebsocketsState;
  accounts: AccountsState;
  transactions: TransactionsState;
}

//===============
// Menu
//===============
export interface MnuState {
  showOverview: boolean;
  menuOpen: boolean;
  showAuthentication: boolean;
  anchorElCategories: HTMLElement | null;
  anchorElClosedAccounts: HTMLElement | null;
  anchorEl: HTMLElement | null;
  myBetsOpen: boolean;
  analyticsType: string | null;
}

//===============
// Authentication
//===============
export interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean | null;
  JWT: string | null;
  userId: string | null;
  userName: string | null;
}

//===============
// WebSockets
//===============
export interface WebsocketsState {
  isConnected: boolean; // true if the client application is connected to the websocket server
  isAppVisible: boolean; // true if the client application is visible
  connectionsAndUsernames: IConnectionAndUsername[];
  showConnections: boolean;
  lastConnectionsTimestamp: string;
  lastConnectionsTimestampISO: string; // for comparisons: Full ISO value.
}

export interface IConnectionAndUsername {
  connectionId: string;
  username: string | null;
}

//===============
// Accounts
//===============
export interface AccountsState {
  showNewAccountForm: boolean;
  accounts: IAccount[];
  recordToBroadcast: IBroadcastPayload | null; // when this state changes, the new value should be broadcasted
  stateToBroadcast: IAccountState | null; // when this state changes, the new value should be broadcasted
  newAccountForm: {
    id: string;
    balance: number;
    errors: Record<string, string>;
  };
}

export interface INewAccount {
  account_id: string;
  balance: number;
}

export interface IAccount extends INewAccount {
  viewed: boolean;
  is_disabled: boolean;
  user_id: string;
}

export interface IAccountState {
  account_id: string;
  is_disabled: boolean;
  is_deleted: boolean;
}

//======================
// Account Transactions
//======================
export interface TransactionsState {
  transactions: ITransaction[];
  analyticsData: IAccountsAnalyticsDataItem[];
}

export interface INewTransaction {
  id: string;
  accountId: string;
  amount: number;
}
export interface ITransaction extends INewTransaction {
  createdAt: string;
}

export interface IAccountsAnalyticsDataItem {
  totalAmount: number;
  date: string;
  count: number;
}

export type IBroadcastPayload = INewAccount | INewTransaction;
export function isNewAccount(payload: IBroadcastPayload): payload is INewAccount {
  return (payload as INewAccount).account_id !== undefined;
}
export function isNewTransaction(payload: IBroadcastPayload): payload is INewTransaction {
  return (payload as INewTransaction).accountId !== undefined;
}
