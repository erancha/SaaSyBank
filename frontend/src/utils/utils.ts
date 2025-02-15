import { IAccount } from '../redux/store/types';

export const filterAndSortAccounts = (accounts: IAccount[]) => {
  return accounts;
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

export const getAccount = (accounts: IAccount[], account_id: string) => accounts.find((account) => account.account_id === account_id);
