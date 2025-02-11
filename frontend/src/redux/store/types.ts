//=================
// Root State
//=================

/**
 * The root state type that combines all feature states.
 * Used for type-safe access to the Redux store.
 */
export interface AppState {
  mnu: MnuState;
  auth: AuthState;
  websockets: WebsocketsState;
  accounts: AccountsState;
  transactions: TransactionsState;
}

//=================
// Menu State
//=================
export interface MnuState {
  showOverview: boolean;
  menuOpen: boolean;
  anchorEl: HTMLElement | null;
  analyticsType: string | null;
}

//=================
// Auth State
//=================
export interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  JWT: string | null;
  userId: string | null;
  username: string | null;
}

//=================
// WebSocket State
//=================
export interface WebsocketsState {
  isConnected: boolean; // true if the client application is connected to the websocket server
  isAppVisible: boolean; // true if the client application is visible
  connectionsAndUsernames: IConnectionAndUsername[];
  showConnections: boolean;
  lastConnectionsTimestamp: string;
  lastConnectionsTimestampISO: string; // for comparisons: Full ISO value.
}

//===============
// Accounts
//===============
/**
 * Defines the shape of the accounts state in Redux.
 * Extends IUploadState to support sending new accounts to the backend.
 */
export interface AccountsState extends IUploadState {
  showNewAccountForm: boolean;
  accounts: IAccount[];
  currentAccountId: string | null;
  stateToUpload: IAccountState | null; // when this state changes, the new value should be uploaded
  // accountIdToDelete: IAccount | null;
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

//==============
// Transactions
//==============
/**
 * Defines the shape of the transactions state in Redux.
 * Extends IUploadState to support sending new transactions to the backend.
 */
export interface TransactionsState extends IUploadState {
  transactions: ITransaction[];
  analyticsData: IAccountsAnalyticsDataItem[];
}

export enum BankingFunctionType {
  Deposit = 'deposit',
  Withdraw = 'withdraw',
  Transfer = 'transfer'
}

/**
 * Represents a new transaction to be sent to the backend.
 * Used as the data payload when uploading a transaction.
 */
export interface INewTransaction {
  id: string; // Unique identifier for the transaction
  amount: number; // Amount of money involved
  bankingFunction: string; // Type of transaction: deposit/withdraw/transfer
  accountId: string; // Source account ID
  toAccountId: string; // Target account ID (same as accountId for deposit/withdraw)
}

/**
 * Represents a transaction as stored in the Redux state.
 * Extends INewTransaction to include execution timestamp.
 */
export interface ITransaction extends INewTransaction {
  executed_at: string; // Timestamp when the transaction was executed
}

/**
 * Defines the structure of a message that will be sent to the backend.
 * This is like an envelope containing:
 * - A label (type) indicating what kind of record it is
 * - The actual content (data) to be sent
 *
 * Used by WebSocketService to standardize how different types of records
 * are sent to the backend.
 */
export interface IUploadPayload {
  type: 'account' | 'transaction'; // Discriminator to identify the record type
  data: INewAccount | INewTransaction; // The actual record data to be sent
}

/**
 * Defines how pending upload state is stored in Redux.
 * Components that need to send data to the backend will extend this interface
 * to include the newRecordToUpload field in their state.
 *
 * Think of this as an outbox that holds a record until WebSocketService picks it up
 * and sends it to the backend.
 */
export interface IUploadState {
  newRecordToUpload: IUploadPayload | null; // Current record waiting to be sent, null if nothing to send
}

export interface IConnectionAndUsername {
  connectionId: string;
  username: string | null;
}

export interface IAccountsAnalyticsDataItem {
  totalAmount: number;
  date: string;
  count: number;
}
