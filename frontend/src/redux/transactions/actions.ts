import { ITransaction } from '../store/types';
import { prepareCreateCommandAction, prepareReadCommandAction, prepareUpdateCommandAction } from '../crud/actions';
import { CommandType } from '../crud/types';
import { ICreateTransactionParams } from './types';

// Transaction-specific action types
export const SET_TRANSACTIONS = 'SET_TRANSACTIONS';
export const ADD_TRANSACTION = 'ADD_TRANSACTION';
export const SET_TRANSACTION_CONFIRMED_BY_BACKEND = 'SET_TRANSACTION_CONFIRMED_BY_BACKEND';
export const CLEAR_TRANSACTIONS = 'CLEAR_TRANSACTIONS';

// Transaction-specific action interfaces
export interface ISetTransactionsAction {
  type: typeof SET_TRANSACTIONS;
  payload: ITransaction[];
}

export interface IAddTransactionAction {
  type: typeof ADD_TRANSACTION;
  payload: ITransaction;
}

export interface ISetTransactionConfirmedByBackendAction {
  type: typeof SET_TRANSACTION_CONFIRMED_BY_BACKEND;
  payload: string; // transaction id
}

export interface IClearTransactionsAction {
  type: typeof CLEAR_TRANSACTIONS;
}

// CRUD operations
export const prepareCreateTransactionCommandAction = (transaction: ITransaction) =>
  prepareCreateCommandAction({
    type: 'transactions' as CommandType,
    params: {
      id: transaction.id,
      amount: transaction.amount,
      bankingFunction: transaction.bankingFunction,
      account_id: transaction.account_id,
      to_account_id: transaction.to_account_id,
    } as ICreateTransactionParams,
  });

export const prepareReadTransactionsCommandAction = (account_id: string) =>
  prepareReadCommandAction({
    type: 'transactions' as CommandType,
    params: { account_id },
  });

export const prepareUpdateTransactionCommandAction = (transactionId: string, updates: Partial<ITransaction>) =>
  prepareUpdateCommandAction({
    type: 'transactions' as CommandType,
    params: {
      id: transactionId,
      ...updates,
    },
  });

// Regular actions
export const setTransactionsAction = (transactions: ITransaction[]): ISetTransactionsAction => ({
  type: SET_TRANSACTIONS,
  payload: transactions,
});

export const addTransactionAction = (transaction: ITransaction): IAddTransactionAction => ({
  type: ADD_TRANSACTION,
  payload: transaction,
});

export const setTransactionConfirmedByBackendAction = (transactionId: string): ISetTransactionConfirmedByBackendAction => ({
  type: SET_TRANSACTION_CONFIRMED_BY_BACKEND,
  payload: transactionId,
});

export const clearTransactionsAction = (): IClearTransactionsAction => ({
  type: CLEAR_TRANSACTIONS,
});
