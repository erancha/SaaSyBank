import { IAccount, IAccountState, IUploadPayload } from '../store/types';

// Set accounts data.
export const SET_ACCOUNTS = 'SET_ACCOUNTS';
export interface ISetAccountsAction {
  type: typeof SET_ACCOUNTS;
  payload: IAccount[];
}
export const setAccountsAction = (accounts: IAccount[]): ISetAccountsAction => ({
  type: SET_ACCOUNTS,
  payload: accounts,
});

// Set current account
export const SET_CURRENT_ACCOUNT = 'SET_CURRENT_ACCOUNT';
export interface ISetCurrentAccountAction {
  type: typeof SET_CURRENT_ACCOUNT;
  payload: string;
}
export const setCurrentAccountAction = (accountId: string): ISetCurrentAccountAction => ({
  type: SET_CURRENT_ACCOUNT,
  payload: accountId,
});

// Add an account.
export const ADD_ACCOUNT = 'ADD_ACCOUNT';
export interface IAddAccountAction {
  type: typeof ADD_ACCOUNT;
  payload: IAccount;
}
export const addAccountAction = (account: IAccount): IAddAccountAction => ({
  type: ADD_ACCOUNT,
  payload: account,
});

// Update an account's properties
export const SET_ACCOUNT_STATE = 'SET_ACCOUNT_STATE';
export interface ISetAccountStateAction {
  type: typeof SET_ACCOUNT_STATE;
  payload: Partial<IAccount> & { account_id: string, is_deleted?: boolean }; // TODO: Decouple deletion to another action.
}
export const setAccountStateAction = (update: Partial<IAccount> & { account_id: string, is_deleted?: boolean }): ISetAccountStateAction => ({
  type: SET_ACCOUNT_STATE,
  payload: update,
});

// Upload an account state to the backend and optionally forward to other connected user(s).
export const UPLOAD_ACCOUNT_STATE = 'UPLOAD_ACCOUNT_STATE';
export interface IUploadAccountStateAction {
  type: typeof UPLOAD_ACCOUNT_STATE;
  payload: IAccountState;
}
export const uploadAccountStateAction = (status: IAccountState): IUploadAccountStateAction => ({
  type: UPLOAD_ACCOUNT_STATE,
  payload: status,
});

// Open or close the new account form
export const SHOW_NEW_ACCOUNT_FORM = 'SHOW_NEW_ACCOUNT_FORM';
export interface IShowNewAccountFormAction {
  type: typeof SHOW_NEW_ACCOUNT_FORM;
  payload: boolean;
}
export const showNewAccountFormAction = (show: boolean): IShowNewAccountFormAction => ({
  type: SHOW_NEW_ACCOUNT_FORM,
  payload: show,
});

// New account form management:
export const UPDATE_NEW_ACCOUNT_FIELD = 'UPDATE_NEW_ACCOUNT_FIELD';
export interface IUpdateNewAccountFieldAction {
  type: typeof UPDATE_NEW_ACCOUNT_FIELD;
  payload: { field: string; value: string | number };
}
export const updateNewAccountFieldAction = (field: string, value: string | number): IUpdateNewAccountFieldAction => ({
  type: UPDATE_NEW_ACCOUNT_FIELD,
  payload: { field, value },
});

export const SET_NEW_ACCOUNT_ERRORS = 'SET_NEW_ACCOUNT_ERRORS';
export interface ISetNewAccountErrorsAction {
  type: typeof SET_NEW_ACCOUNT_ERRORS;
  payload: Record<string, string>;
}
export const setNewAccountErrorsAction = (errors: Record<string, string>): ISetNewAccountErrorsAction => ({
  type: SET_NEW_ACCOUNT_ERRORS,
  payload: errors,
});

export const RESET_NEW_ACCOUNT_FORM = 'RESET_NEW_ACCOUNT_FORM';
export interface IResetNewAccountFormAction {
  type: typeof RESET_NEW_ACCOUNT_FORM;
}
export const resetNewAccountFormAction = (): IResetNewAccountFormAction => ({
  type: RESET_NEW_ACCOUNT_FORM,
});

export const SET_ACCOUNT_VIEWED = 'SET_ACCOUNT_VIEWED';
export interface ISetAccountViewedAction {
  type: typeof SET_ACCOUNT_VIEWED;
  payload: string; // account id
}
export const setAccountViewedAction = (accountId: string): ISetAccountViewedAction => ({
  type: SET_ACCOUNT_VIEWED,
  payload: accountId,
});

export const UPLOAD_CREATED_RECORD = 'UPLOAD_CREATED_RECORD';
export interface IUploadCreatedRecordAction {
  type: typeof UPLOAD_CREATED_RECORD;
  payload: IUploadPayload;
}
export const uploadCreatedRecordAction = (payload: IUploadPayload): IUploadCreatedRecordAction => ({
  type: UPLOAD_CREATED_RECORD,
  payload,
});

export const TOGGLE_NEW_ACCOUNT_FORM = 'TOGGLE_NEW_ACCOUNT_FORM';
export interface IToggleNewAccountFormAction {
  type: typeof TOGGLE_NEW_ACCOUNT_FORM;
  payload: boolean;
}
export const toggleNewAccountFormAction = (show: boolean): IToggleNewAccountFormAction => ({
  type: TOGGLE_NEW_ACCOUNT_FORM,
  payload: show,
});
