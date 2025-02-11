import { IAccount } from '../redux/store/types';

export const filterAndSortAccounts = (accounts: IAccount[] , userId: string | null /*, searchTerm: string*/) => {
  return accounts.filter((account) => account.user_id === userId);
};

export const timeShortDisplay = (dateTime: Date) => {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    day: 'numeric',
    month: 'numeric',
    hour12: false,
  };

  return dateTime.toLocaleString('en-GB', options);
};

export const getAccount = (accounts: IAccount[], accountId: string) => accounts.find((account) => account.account_id === accountId);
