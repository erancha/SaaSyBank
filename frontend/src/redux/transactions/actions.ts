import { ITransaction, IAccountState, IBroadcastPayload } from '../store/types';

// Set accounts data.
export const SET_TRANSACTIONS = 'SET_TRANSACTIONS';
export interface ISetTransactionsAction {
  type: typeof SET_TRANSACTIONS;
  payload: ITransaction[];
}
export const setTransactionsAction = (transactions: ITransaction[]): ISetTransactionsAction => ({
  type: SET_TRANSACTIONS,
  payload: transactions,
});
