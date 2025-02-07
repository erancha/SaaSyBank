import { TransactionsState } from '../store/types';
import initialState from '../store/initialState';
import { SET_TRANSACTIONS, ISetTransactionsAction } from './actions';

type HandledActions = ISetTransactionsAction;

export const transactionsReducers = (state: TransactionsState = initialState.transactions, action: HandledActions): TransactionsState => {
  switch (action.type) {
    // Set transactions data.
    case SET_TRANSACTIONS:
      return {
        ...state,
        transactions: [...action.payload],
      };

    default:
      return state;
  }
};
