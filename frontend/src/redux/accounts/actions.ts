import { Dispatch } from 'redux';
import { IAccount } from '../store/types';
import { CommandType } from '../crud/types';
import { prepareCreateCommandAction, prepareReadCommandAction, prepareUpdateCommandAction, prepareDeleteCommandAction } from '../crud/actions';
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
  ICreateAccountParams,
  IAddAccountAction,
  ISetAccountsAction,
  ISetCurrentAccountAction,
  ISetAccountConfirmedByBackendAction,
  ISetAccountStateAction,
  IDeleteAccountAction,
  IToggleNewAccountFormAction,
  IUpdateNewAccountFieldAction,
  ISetNewAccountErrorsAction,
  IResetNewAccountFormAction,
} from './types';
import { clearTransactionsAction } from '../transactions/actions';

// Account-specific action creators
export const prepareCreateAccountCommandAction = (account_id: string, initialBalance: number) =>
  prepareCreateCommandAction({
    type: 'accounts' as CommandType,
    params: { account_id: account_id, balance: initialBalance } as ICreateAccountParams,
  });

export const addAccountAction = (account: IAccount): IAddAccountAction => ({
  type: ADD_ACCOUNT,
  payload: account,
});

export const prepareReadAccountsCommandAction = () =>
  prepareReadCommandAction({
    type: 'accounts' as CommandType,
    params: {},
  });

export const setAccountsAction = (accounts: IAccount[]): ISetAccountsAction => ({
  type: SET_ACCOUNTS,
  payload: accounts,
});

export const setCurrentAccountAction = (account_id: string) => (dispatch: Dispatch) => {
  dispatch(clearTransactionsAction());
  const action: ISetCurrentAccountAction = {
    type: SET_CURRENT_ACCOUNT,
    payload: account_id,
  };
  dispatch(action);
};

export const setAccountConfirmedByBackendAction = (account_id: string): ISetAccountConfirmedByBackendAction => ({
  type: SET_ACCOUNT_CONFIRMED_BY_BACKEND,
  payload: account_id,
});

export const prepareUpdateAccountCommandAction = (account_id: string, updates: Partial<IAccount>) =>
  prepareUpdateCommandAction({
    type: 'accounts' as CommandType,
    params: {
      account_id: account_id,
      ...updates,
    },
  });

export const setAccountStateAction = (update: Partial<IAccount> & { account_id: string }): ISetAccountStateAction => ({
  type: SET_ACCOUNT_STATE,
  payload: update,
});

export const prepareDeleteAccountCommandAction = (account_id: string) =>
  prepareDeleteCommandAction({
    type: 'accounts' as CommandType,
    params: { account_id: account_id },
  });

export const deleteAccountAction = (account_id: string): IDeleteAccountAction => ({
  type: DELETE_ACCOUNT,
  payload: account_id,
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
