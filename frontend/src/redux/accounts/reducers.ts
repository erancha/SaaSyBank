import { v4 as uuidv4 } from 'uuid';
import {
  ADD_ACCOUNT,
  SET_ACCOUNTS,
  SET_CURRENT_ACCOUNT,
  SET_ACCOUNT_CONFIRMED_BY_BACKEND,
  SET_ACCOUNT_STATE,
  DELETE_ACCOUNT,
  TOGGLE_NEW_ACCOUNT_FORM,
  UPDATE_NEW_ACCOUNT_FIELD,
  SET_NEW_ACCOUNT_ERRORS,
  RESET_NEW_ACCOUNT_FORM,
  AccountActionTypes,
} from './types';
import initialState from '../store/initialState';
import { IAccount } from '../store/types';

interface AccountsState {
  accounts: IAccount[];
  currentAccountId: string | null;
  showNewAccountForm: boolean;
  newAccountForm: {
    id: string;
    balance: number;
    errors: Record<string, string>;
  };
}

export const accountsReducers = (state: AccountsState = initialState.accounts, action: AccountActionTypes): AccountsState => {
  switch (action.type) {
    case ADD_ACCOUNT:
      return {
        ...state,
        accounts: [action.payload, ...state.accounts],
      };

    case SET_ACCOUNTS:
      return {
        ...state,
        accounts: [...action.payload],
        currentAccountId: action.payload.length > 0 ? action.payload[0].account_id : null,
      };

    case SET_CURRENT_ACCOUNT:
      return {
        ...state,
        currentAccountId: action.payload,
      };

    case SET_ACCOUNT_CONFIRMED_BY_BACKEND:
      return {
        ...state,
        accounts: state.accounts.map((account) => (account.account_id === action.payload ? { ...account, onroute: false } : account)),
      };

    case SET_ACCOUNT_STATE:
      return {
        ...state,
        accounts: state.accounts.map((account) => (account.account_id === action.payload.account_id ? { ...account, ...action.payload } : account)),
      };

    case DELETE_ACCOUNT:
      return {
        ...state,
        accounts: state.accounts.filter((account) => account.account_id !== action.payload),
        currentAccountId: state.currentAccountId === action.payload ? null : state.currentAccountId,
      };

    case TOGGLE_NEW_ACCOUNT_FORM:
      return {
        ...state,
        showNewAccountForm: action.payload,
        ...(action.payload
          ? {
              newAccountForm: {
                id: uuidv4(),
                balance: 0,
                errors: {},
              },
            }
          : {}),
      };

    case UPDATE_NEW_ACCOUNT_FIELD:
      return {
        ...state,
        newAccountForm: {
          ...state.newAccountForm,
          [action.payload.field]: action.payload.value,
          errors: {},
        },
      };

    case SET_NEW_ACCOUNT_ERRORS:
      return {
        ...state,
        newAccountForm: {
          ...state.newAccountForm,
          errors: action.payload,
        },
      };

    case RESET_NEW_ACCOUNT_FORM:
      return {
        ...state,
        newAccountForm: initialState.accounts.newAccountForm,
      };

    default:
      return state;
  }
};
