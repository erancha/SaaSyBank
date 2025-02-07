import { AccountsState } from '../store/types';
import initialState from '../store/initialState';
import {
  SET_ACCOUNTS,
  ISetAccountsAction,
  TOGGLE_NEW_ACCOUNT_FORM,
  IToggleNewAccountFormAction,
  ADD_ACCOUNT,
  IAddAccountAction,
  SET_ACCOUNT_VIEWED,
  ISetAccountViewedAction,
  BROADCAST_CREATED_RECORD,
  IBroadcastCreatedRecordAction,
  SET_ACCOUNT_STATE,
  ISetAccountStateAction,
  BROADCAST_ACCOUNT_STATE,
  IBroadcastAccountStateAction,
  UPDATE_NEW_ACCOUNT_FIELD,
  IUpdateNewAccountFieldAction,
  SET_NEW_ACCOUNT_ERRORS,
  ISetNewAccountErrorsAction,
  RESET_NEW_ACCOUNT_FORM,
  IResetNewAccountFormAction,
} from './actions';
import { v4 as uuidv4 } from 'uuid';

type HandledActions =
  | ISetAccountsAction
  | IToggleNewAccountFormAction
  | IUpdateNewAccountFieldAction
  | IResetNewAccountFormAction
  | ISetNewAccountErrorsAction
  | IAddAccountAction
  | ISetAccountViewedAction
  | IBroadcastCreatedRecordAction
  | ISetAccountStateAction
  | IBroadcastAccountStateAction;

export const accountsReducers = (state: AccountsState = initialState.accounts, action: HandledActions): AccountsState => {
  switch (action.type) {
    // Set accounts data.
    case SET_ACCOUNTS:
      return {
        ...state,
        accounts: [...action.payload],
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

    // Add a account.
    case ADD_ACCOUNT: {
      return {
        ...state,
        accounts: [action.payload, ...state.accounts],
      };
    }

    // Mark a account as viewed.
    case SET_ACCOUNT_VIEWED:
      return {
        ...state,
        accounts: state.accounts.map((account) => (account.account_id === action.payload ? { ...account, viewed: true } : account)),
      };

    // Broadcast a new record to other connected user(s).
    case BROADCAST_CREATED_RECORD:
      return {
        ...state,
        recordToBroadcast: action.payload,
      };

    // Enable, disable or delete a account.
    case SET_ACCOUNT_STATE: {
      return {
        ...state,
        accounts: action.payload.is_deleted
          ? state.accounts.filter((account) => account.account_id !== action.payload.account_id)
          : state.accounts.map((account) =>
              account.account_id === action.payload.account_id ? { ...account, is_disabled: action.payload.is_disabled } : account
            ),
      };
    }

    // Broadcast a account state to other connected user(s).
    case BROADCAST_ACCOUNT_STATE:
      return {
        ...state,
        stateToBroadcast: action.payload,
      };

    // New account form management:
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
        newAccountForm: {
          id: '',
          balance: 0,
          errors: {},
        },
      };

    default:
      return state;
  }
};
