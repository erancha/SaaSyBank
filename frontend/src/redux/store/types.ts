//=================
// Root State
//=================

import { CrudState } from 'redux/crud/types';

/**
 * The root state type that combines all feature states.
 * Used for type-safe access to the Redux store.
 */
export interface AppState {
  mnu: MnuState;
  auth: AuthState;
  websockets: WebsocketsState;
  crud: CrudState;
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
export interface AccountsState {
  accounts: IAccount[];
  currentAccountId: string | null;
  showNewAccountForm: boolean;
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
  onroute: boolean; // on route from the frontend to the backend for persistance into the database
  is_disabled: boolean;
  user_id: string;
}

//==============
// Transactions
//==============
export interface TransactionsState {
  transactions: ITransaction[];
  analyticsData: any[];
}

export enum BankingFunctionType {
  Deposit = 'deposit',
  Withdraw = 'withdraw',
  Transfer = 'transfer',
}

/**
 * Represents a new transaction to be sent to the backend.
 * Used as the data payload when uploading a transaction.
 */
export interface INewTransaction {
  id: string; // Unique identifier for the transaction
  amount: number; // Amount of money involved
  bankingFunction: string; // Type of transaction: deposit/withdraw/transfer
  account_id: string; // Source account ID
  to_account_id: string | null; // Target account ID (same as account_id for deposit/withdraw)
}

/**
 * Represents a transaction as stored in the Redux state.
 * Extends INewTransaction to include execution timestamp.
 */
export interface ITransaction extends INewTransaction {
  executed_at: string; // Timestamp when the transaction was executed
  onroute: boolean; // on route from the frontend to the backend for persistance into the database
  from_account_id?: string; // Source account ID for received transfers
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
