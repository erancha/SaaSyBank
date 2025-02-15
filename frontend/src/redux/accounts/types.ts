import { IAccount } from '../store/types';

// Account CRUD params
export interface ICreateAccountParams {
  account_id: string;
  balance: number;
}

export interface IAccountUpdates {
  is_disabled?: boolean;
}

export interface IUpdateAccountParams extends IAccountUpdates {
  account_id: string;
}

export interface IReadAccountParams {
  account_id?: string;
}

// Account-specific action types
export const ADD_ACCOUNT = 'ADD_ACCOUNT';
export const SET_ACCOUNTS = 'SET_ACCOUNTS';
export const SET_CURRENT_ACCOUNT = 'SET_CURRENT_ACCOUNT';
export const SET_ACCOUNT_CONFIRMED_BY_BACKEND = 'SET_ACCOUNT_CONFIRMED_BY_BACKEND';
export const SET_ACCOUNT_STATE = 'SET_ACCOUNT_STATE';
export const DELETE_ACCOUNT = 'DELETE_ACCOUNT';

// Form-specific action types
export const TOGGLE_NEW_ACCOUNT_FORM = 'TOGGLE_NEW_ACCOUNT_FORM';
export const UPDATE_NEW_ACCOUNT_FIELD = 'UPDATE_NEW_ACCOUNT_FIELD';
export const SET_NEW_ACCOUNT_ERRORS = 'SET_NEW_ACCOUNT_ERRORS';
export const RESET_NEW_ACCOUNT_FORM = 'RESET_NEW_ACCOUNT_FORM';

// Account-specific action interfaces
export interface IAddAccountAction {
  type: typeof ADD_ACCOUNT;
  payload: IAccount;
}

export interface ISetAccountsAction {
  type: typeof SET_ACCOUNTS;
  payload: IAccount[];
}

export interface ISetCurrentAccountAction {
  type: typeof SET_CURRENT_ACCOUNT;
  payload: string;
}

export interface ISetAccountConfirmedByBackendAction {
  type: typeof SET_ACCOUNT_CONFIRMED_BY_BACKEND;
  payload: string;
}

export interface ISetAccountStateAction {
  type: typeof SET_ACCOUNT_STATE;
  payload: Partial<IAccount> & { account_id: string };
}

export interface IDeleteAccountAction {
  type: typeof DELETE_ACCOUNT;
  payload: string;
}

// Form-specific action interfaces
export interface IToggleNewAccountFormAction {
  type: typeof TOGGLE_NEW_ACCOUNT_FORM;
  payload: boolean;
}

export interface IUpdateNewAccountFieldAction {
  type: typeof UPDATE_NEW_ACCOUNT_FIELD;
  payload: { field: string; value: string | number };
}

export interface ISetNewAccountErrorsAction {
  type: typeof SET_NEW_ACCOUNT_ERRORS;
  payload: Record<string, string>;
}

export interface IResetNewAccountFormAction {
  type: typeof RESET_NEW_ACCOUNT_FORM;
}

export type AccountActionTypes =
  | IAddAccountAction
  | ISetAccountsAction
  | ISetCurrentAccountAction
  | ISetAccountConfirmedByBackendAction
  | ISetAccountStateAction
  | IDeleteAccountAction
  | IToggleNewAccountFormAction
  | IUpdateNewAccountFieldAction
  | ISetNewAccountErrorsAction
  | IResetNewAccountFormAction;
