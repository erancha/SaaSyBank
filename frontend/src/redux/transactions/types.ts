import { ITransaction } from '../store/types';

// Transaction CRUD params
export interface ICreateTransactionParams {
  amount: number;
  bankingFunction: string;
  accountId: string;
  toAccountId?: string;
}

export interface ITransactionUpdates {
  amount?: number;
  bankingFunction?: string;
  accountId?: string;
  toAccountId?: string;
}

export interface IUpdateTransactionParams extends ITransactionUpdates {
  id: string;
}

export interface IReadTransactionParams {
  accountId?: string;
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

export type TransactionActionTypes =
  | ISetTransactionsAction
  | IAddTransactionAction;
