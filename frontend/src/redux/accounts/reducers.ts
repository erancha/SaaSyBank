import { AccountsState, IAccount } from '../store/types';
import {
  SET_ACCOUNTS,
  ISetAccountsAction,
  SET_CURRENT_ACCOUNT,
  ISetCurrentAccountAction,
  TOGGLE_NEW_ACCOUNT_FORM,
  IToggleNewAccountFormAction,
  ADD_ACCOUNT,
  IAddAccountAction,
  SET_ACCOUNT_VIEWED,
  ISetAccountViewedAction,
  UPLOAD_CREATED_RECORD,
  IUploadCreatedRecordAction,
  SET_ACCOUNT_STATE,
  ISetAccountStateAction,
  UPLOAD_ACCOUNT_STATE,
  IUploadAccountStateAction,
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
  | IUploadCreatedRecordAction
  | ISetAccountStateAction
  | IUploadAccountStateAction
  | ISetCurrentAccountAction;

const initialState: AccountsState = {
  showNewAccountForm: false,
  accounts: [],
  currentAccountId: null,
  newRecordToUpload: null,
  stateToUpload: null,
  // accountIdToDelete: null,
  newAccountForm: {
    id: '',
    balance: 0,
    errors: {},
  },
};

export const accountsReducers = (state: AccountsState = initialState, action: HandledActions): AccountsState => {
  switch (action.type) {
    // Set accounts data.
    case SET_ACCOUNTS:
      const firstEnabledAccount = action.payload.length > 0 ? action.payload.find((acc) => !acc.is_disabled) : null;
      return {
        ...state,
        accounts: [...action.payload],
        currentAccountId: firstEnabledAccount ? firstEnabledAccount.account_id : null,
      };

    case SET_CURRENT_ACCOUNT:
      return {
        ...state,
        currentAccountId: action.payload,
      };

    // Add an account.
    case ADD_ACCOUNT: {
      return {
        ...state,
        accounts: [...state.accounts, action.payload],
      };
    }

    // Mark an account as viewed.
    case SET_ACCOUNT_VIEWED:
      return {
        ...state,
        accounts: state.accounts.map((account) => (account.account_id === action.payload ? { ...account, viewed: true } : account)),
      };

    // Upload a new record to the backend and optionally forward to other connected user(s).
    case UPLOAD_CREATED_RECORD:
      return {
        ...state,
        newRecordToUpload: action.payload,
      };

    // Update an account's properties
    case SET_ACCOUNT_STATE: {
      return {
        ...state,
        accounts: state.accounts.map((account) =>
          account.account_id === action.payload.account_id
            ? action.payload.is_deleted // TODO: Isolate deletion to another action.
              ? undefined // Filter out deleted accounts
              : { ...account, ...action.payload }
            : account
        ).filter((account): account is IAccount => account !== undefined),
      };
    }

    // Upload an account state to the backend and optionally forward to other connected user(s).
    case UPLOAD_ACCOUNT_STATE:
      return {
        ...state,
        stateToUpload: action.payload,
      };

    // New account form management:
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
        newAccountForm: initialState.newAccountForm,
      };

    default:
      return state;
  }
};
