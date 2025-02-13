import { IAccount } from '../store/types';
import { prepareCreateCommandAction, prepareReadCommandAction, prepareUpdateCommandAction, prepareDeleteCommandAction } from '../crud/actions';
import { CommandType } from '../crud/types';
import {
  ADD_ACCOUNT,
  SET_ACCOUNTS,
  SET_CURRENT_ACCOUNT,
  SET_ACCOUNT_VIEWED,
  SET_ACCOUNT_STATE,
  DELETE_ACCOUNT,
  TOGGLE_NEW_ACCOUNT_FORM,
  UPDATE_NEW_ACCOUNT_FIELD,
  SET_NEW_ACCOUNT_ERRORS,
  RESET_NEW_ACCOUNT_FORM,
  ICreateAccountParams,
  IAddAccountAction,
  ISetAccountsAction,
  ISetCurrentAccountAction,
  ISetAccountViewedAction,
  ISetAccountStateAction,
  IDeleteAccountAction,
  IToggleNewAccountFormAction,
  IUpdateNewAccountFieldAction,
  ISetNewAccountErrorsAction,
  IResetNewAccountFormAction,
} from './types';

// Account-specific action creators
export const prepareCreateAccountCommandAction = (accountId: string, initialBalance: number) =>
  prepareCreateCommandAction({
    type: 'account' as CommandType,
    params: { account_id: accountId, balance: initialBalance } as ICreateAccountParams,
  });

export const addAccountAction = (account: IAccount): IAddAccountAction => ({
  type: ADD_ACCOUNT,
  payload: account,
});

export const prepareReadAccountsCommandAction = () =>
  prepareReadCommandAction({
    type: 'account' as CommandType,
    params: {},
  });

export const setAccountsAction = (accounts: IAccount[]): ISetAccountsAction => ({
  type: SET_ACCOUNTS,
  payload: accounts,
});

export const setCurrentAccountAction = (accountId: string): ISetCurrentAccountAction => ({
  type: SET_CURRENT_ACCOUNT,
  payload: accountId,
});

export const setAccountViewedAction = (accountId: string): ISetAccountViewedAction => ({
  type: SET_ACCOUNT_VIEWED,
  payload: accountId,
});

export const prepareUpdateAccountCommandAction = (accountId: string, updates: Partial<IAccount>) =>
  prepareUpdateCommandAction({
    type: 'account' as CommandType,
    params: {
      account_id: accountId,
      ...updates,
    },
  });

export const setAccountStateAction = (update: Partial<IAccount> & { account_id: string }): ISetAccountStateAction => ({
  type: SET_ACCOUNT_STATE,
  payload: update,
});

export const prepareDeleteAccountCommandAction = (accountId: string) =>
  prepareDeleteCommandAction({
    type: 'account' as CommandType,
    params: { account_id: accountId },
  });

export const deleteAccountAction = (accountId: string): IDeleteAccountAction => ({
  type: DELETE_ACCOUNT,
  payload: accountId,
});

// Form management action creators
export const toggleNewAccountFormAction = (show: boolean): IToggleNewAccountFormAction => ({
  type: TOGGLE_NEW_ACCOUNT_FORM,
  payload: show,
});

export const updateNewAccountFieldAction = (field: string, value: string | number): IUpdateNewAccountFieldAction => ({
  type: UPDATE_NEW_ACCOUNT_FIELD,
  payload: { field, value },
});

export const setNewAccountErrorsAction = (errors: Record<string, string>): ISetNewAccountErrorsAction => ({
  type: SET_NEW_ACCOUNT_ERRORS,
  payload: errors,
});

export const resetNewAccountFormAction = (): IResetNewAccountFormAction => ({
  type: RESET_NEW_ACCOUNT_FORM,
});
