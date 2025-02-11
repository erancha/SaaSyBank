import { ITransaction } from '../store/types';

// Set transactions data.
export const SET_TRANSACTIONS = 'SET_TRANSACTIONS';
export interface ISetTransactionsAction {
  type: typeof SET_TRANSACTIONS;
  payload: ITransaction[];
}
export const setTransactionsAction = (transactions: ITransaction[]): ISetTransactionsAction => ({
  type: SET_TRANSACTIONS,
  payload: transactions,
});

// Add a transaction
export const ADD_TRANSACTION = 'ADD_TRANSACTION';
export interface IAddTransactionAction {
  type: typeof ADD_TRANSACTION;
  payload: ITransaction;
}
export const addTransactionAction = (transaction: ITransaction): IAddTransactionAction => ({
  type: ADD_TRANSACTION,
  payload: transaction,
});
