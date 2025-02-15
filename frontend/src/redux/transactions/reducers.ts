// Reducers
import { TransactionsState } from '../store/types';
import initialState from '../store/initialState';
import {
  SET_TRANSACTIONS,
  ISetTransactionsAction,
  ADD_TRANSACTION,
  IAddTransactionAction,
  SET_TRANSACTION_CONFIRMED_BY_BACKEND,
  ISetTransactionConfirmedByBackendAction,
} from './actions';

type HandledActions = ISetTransactionsAction | IAddTransactionAction | ISetTransactionConfirmedByBackendAction;

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

    // Set transaction as onroute
    case SET_TRANSACTION_CONFIRMED_BY_BACKEND: {
      return {
        ...state,
        transactions: state.transactions.map((transaction) => (transaction.id === action.payload ? { ...transaction, onroute: false } : transaction)),
      };
    }

    default:
      return state;
  }
};
