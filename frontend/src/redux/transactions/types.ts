import { ITransaction } from '../store/types';

// Transaction CRUD params
export interface ICreateTransactionParams {
  id: string;
  amount: number;
  bankingFunction: string;
  account_id: string;
  to_account_id?: string;
}

export interface IReadTransactionParams {
  account_id?: string;
}

// Transaction-specific action types
export const SET_TRANSACTIONS = 'SET_TRANSACTIONS';
export const ADD_TRANSACTION = 'ADD_TRANSACTION';

// Transaction-specific action interfaces
export interface ISetTransactionsAction {
  type: typeof SET_TRANSACTIONS;
  payload: ITransaction[];
}

export interface IAddTransactionAction {
  type: typeof ADD_TRANSACTION;
  payload: ITransaction;
}

export type TransactionActionTypes = ISetTransactionsAction | IAddTransactionAction;
