import React from 'react';
import { getAllAccountsByUserId } from '../services/rest';

interface Account {
  account_id: string;
}

interface User {
  user_id: string;
  user_name: string;
  accounts: Account[];
}

interface AccountSelectorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  excludeAccountId?: string;
}

interface AccountSelectorState {
  users: User[];
  searchText: string;
  showDropdown: boolean;
}

export class AccountSelector extends React.Component<AccountSelectorProps, AccountSelectorState> {
  constructor(props: AccountSelectorProps) {
    super(props);
    this.state = {
      users: [],
      searchText: '',
      showDropdown: false,
    };
  }

  handleInputClick = async () => {
    if (!this.props.readOnly) {
      // Only fetch accounts if we haven't already
      if (this.state.users.length === 0) {
        await this.fetchAccounts();
      }
      this.setState({ showDropdown: true });
    }
  };

  fetchAccounts = async () => {
    try {
      const usersAccounts = await getAllAccountsByUserId();
      this.setState({ users: usersAccounts });

      // Only auto-select if there's no value already set
      if (usersAccounts.length === 1 && !this.props.value) {
        const firstValidAccount = usersAccounts[0].accounts[0];
        if (firstValidAccount) {
          this.props.onChange(firstValidAccount.account_id);
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  handleAccountSelect = (accountId: string) => {
    this.props.onChange(accountId);
    this.setState({
      showDropdown: false,
      searchText: '',
    });
  };

  handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      searchText: e.target.value,
      showDropdown: true,
    });
  };

  handleClickOutside = (e: MouseEvent) => {
    if (this.state.showDropdown && !(e.target as HTMLElement).closest('.account-selector')) {
      this.setState({ showDropdown: false });
    }
  };

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  render() {
    const { value, readOnly, placeholder, excludeAccountId } = this.props;
    const { users, searchText, showDropdown } = this.state;

    const filteredUsers = users.filter((user) => {
      const hasMatchingAccounts = user.accounts.some(
        (account) =>
          account.account_id !== excludeAccountId &&
          (account.account_id.toLowerCase().includes(searchText.toLowerCase()) || user.user_name.toLowerCase().includes(searchText.toLowerCase()))
      );
      return hasMatchingAccounts;
    });

    return (
      <div className='account-selector'>
        <input
          type='text'
          value={showDropdown ? searchText : value || ''}
          onClick={this.handleInputClick}
          onChange={this.handleSearchChange}
          readOnly={readOnly}
          placeholder={placeholder}
        />
        {showDropdown && !readOnly && (
          <div className='dropdown'>
            {filteredUsers.map((user) => (
              <div key={user.user_id} className='user-item'>
                <div className='user-name'>{user.user_name}</div>
                {user.accounts
                  .filter(
                    (account) =>
                      account.account_id !== excludeAccountId &&
                      (account.account_id.toLowerCase().includes(searchText.toLowerCase()) || user.user_name.toLowerCase().includes(searchText.toLowerCase()))
                  )
                  .map((account) => (
                    <div
                      key={account.account_id}
                      onClick={() => this.handleAccountSelect(account.account_id)}
                      className={`account-item ${value === account.account_id ? 'selected' : ''}`}
                    >
                      Account ID: {account.account_id}
                    </div>
                  ))}
              </div>
            ))}
            {filteredUsers.length === 0 && <div className='user-item'>No matching accounts found</div>}
          </div>
        )}
      </div>
    );
  }
}
