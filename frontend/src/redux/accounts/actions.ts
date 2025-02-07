import { IAccount, IAccountState, IBroadcastPayload } from '../store/types';

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

// Open or close the new account form
export const TOGGLE_NEW_ACCOUNT_FORM = 'TOGGLE_NEW_ACCOUNT_FORM';
export interface IToggleNewAccountFormAction {
  type: typeof TOGGLE_NEW_ACCOUNT_FORM;
  payload: boolean;
}
export const toggleNewAccountFormAction = (show: boolean): IToggleNewAccountFormAction => ({
  type: TOGGLE_NEW_ACCOUNT_FORM,
  payload: show,
});

// Add a account.
export const ADD_ACCOUNT = 'ADD_ACCOUNT';
export interface IAddAccountAction {
  type: typeof ADD_ACCOUNT;
  payload: IAccount;
}
export const addAccountAction = (account: IAccount): IAddAccountAction => ({
  type: ADD_ACCOUNT,
  payload: account,
});

// Mark a account as viewed.
export const SET_ACCOUNT_VIEWED = 'SET_ACCOUNT_VIEWED';
export interface ISetAccountViewedAction {
  type: typeof SET_ACCOUNT_VIEWED;
  payload: string; // account id
}
export const setAccountViewedAction = (accountId: string): ISetAccountViewedAction => ({
  type: SET_ACCOUNT_VIEWED,
  payload: accountId,
});

// Broadcast a new record to other connected user(s).
export const BROADCAST_CREATED_RECORD = 'BROADCAST_CREATED_RECORD';
export interface IBroadcastCreatedRecordAction {
  type: typeof BROADCAST_CREATED_RECORD;
  payload: IBroadcastPayload;
}
export const broadcastCreatedRecordAction = (payload: IBroadcastPayload): IBroadcastCreatedRecordAction => ({
  type: BROADCAST_CREATED_RECORD,
  payload,
});

// Enable, disable or delete a account.
export const SET_ACCOUNT_STATE = 'SET_ACCOUNT_STATE';
export interface ISetAccountStateAction {
  type: typeof SET_ACCOUNT_STATE;
  payload: IAccountState;
}
export const setAccountStateAction = (status: IAccountState): ISetAccountStateAction => ({
  type: SET_ACCOUNT_STATE,
  payload: status,
});

// Broadcast a account state to other connected user(s).
export const BROADCAST_ACCOUNT_STATE = 'BROADCAST_ACCOUNT_STATE';
export interface IBroadcastAccountStateAction {
  type: typeof BROADCAST_ACCOUNT_STATE;
  payload: IAccountState;
}
export const broadcastAccountStateAction = (status: IAccountState): IBroadcastAccountStateAction => ({
  type: BROADCAST_ACCOUNT_STATE,
  payload: status,
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
