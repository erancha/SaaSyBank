import { ITransaction } from '../store/types';
import { prepareCreateCommandAction, prepareReadCommandAction, prepareUpdateCommandAction } from '../crud/actions';
import { CommandType } from '../crud/types';
import { ICreateTransactionParams } from './types';

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

// CRUD operations
export const prepareCreateTransactionCommandAction = (transaction: Omit<ITransaction, "id">) =>
  prepareCreateCommandAction({
    type: 'transaction' as CommandType,
    params: {
      amount: transaction.amount,
      bankingFunction: transaction.bankingFunction,
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId,
    } as ICreateTransactionParams,
  });

export const prepareReadTransactionsCommandAction = (accountId: string) =>
  prepareReadCommandAction({
    type: 'transaction' as CommandType,
    params: { accountId },
  });

export const prepareUpdateTransactionCommandAction = (transactionId: string, updates: Partial<ITransaction>) =>
  prepareUpdateCommandAction({
    type: 'transaction' as CommandType,
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
