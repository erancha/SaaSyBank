// Reducers
import { TransactionsState } from '../store/types';
import initialState from '../store/initialState';
import { SET_TRANSACTIONS, ISetTransactionsAction, ADD_TRANSACTION, IAddTransactionAction } from './actions';

type HandledActions = ISetTransactionsAction | IAddTransactionAction;

export const transactionsReducers = (state: TransactionsState = initialState.transactions, action: HandledActions): TransactionsState => {
  switch (action.type) {
    // Set transactions data.
    case SET_TRANSACTIONS:
      return {
        ...state,
        transactions: action.payload,
      };

    // Add a transaction.
    case ADD_TRANSACTION: {
      return {
        ...state,
        transactions: [action.payload, ...state.transactions],
      };
    }

    default:
      return state;
  }
};
