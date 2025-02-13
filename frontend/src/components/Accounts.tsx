import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { AppState, IAccount } from '../redux/store/types';
import { IAccountUpdates } from '../redux/accounts/types';
import {
  prepareCreateAccountCommandAction,
  setCurrentAccountAction,
  setAccountViewedAction,
  setAccountStateAction,
  prepareUpdateAccountCommandAction,
  prepareDeleteAccountCommandAction,
  deleteAccountAction,
  toggleNewAccountFormAction,
  updateNewAccountFieldAction,
  setNewAccountErrorsAction,
  resetNewAccountFormAction,
} from '../redux/accounts/actions';
import { prepareReadTransactionsCommandAction } from '../redux/transactions/actions';
import { Save, Trash2, CircleX } from 'lucide-react';
import { filterAndSortAccounts } from '../utils/utils';
import Transactions from './Transactions';

class Accounts extends React.Component<AccountsProps> {
  // Refs for form elements
  private newAccountInputRef = React.createRef<HTMLInputElement>();

  // Initialize focus and visibility change listeners
  componentDidMount() {
    // Scroll to the top (this is a workaround, to clear side affects from Transactions - TODO: Handle in Transactions)
    window.scrollTo(0, 0);

    setTimeout(() => this.newAccountInputRef.current?.focus(), 1000);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  // Handle change from hidden to visible:
  handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') setTimeout(() => this.newAccountInputRef.current?.focus(), 1000);
  };

  // Filter and sort accounts based on current criteria
  getFilteredAccounts = (): IAccount[] => {
    const { accounts } = this.props;
    return this.props.isAdmin ? accounts : filterAndSortAccounts(accounts, this.props.userId);
  };

  // Render
  render() {
    const { isAdmin, showNewAccountForm, isWsConnected, currentAccountId } = this.props;
    const filteredAccounts = this.getFilteredAccounts();

    return (
      <div className='body-container'>
        <div className={`accounts-container${!isWsConnected ? ' disconnected' : ''}`}>
          {showNewAccountForm && this.renderNewAccountForm()}

          <div className={`accounts-list-header${isAdmin ? ' admin' : ''}`}>
            <div className='id'>Id</div>
            {isAdmin && <div className='userId'>User Id</div>}
            <div className='balance'>Balance</div>
            <div className='actions' />
          </div>

          <div className='accounts-list'>
            {filteredAccounts.length > 0 &&
              filteredAccounts.map((account) => (
                <div
                  key={account.account_id}
                  className={`account-row-container${account.viewed ? ' viewed' : ' unviewed'}${!account.is_disabled ? ' open' : ' closed'}${
                    isAdmin ? ' admin' : ''
                  }${account.account_id === currentAccountId ? ' current' : ''}`}
                  onClick={() => this.handleAccountClick(account.account_id)}
                >
                  <div className='id'>{account.account_id}</div>
                  {isAdmin && <div className='userId'>{account.user_id}</div>}
                  <div className='balance'>{account.balance}</div>
                  <div className='actions'>
                    {isAdmin ? (
                      <>
                        <button
                          onClick={() => this.handleAccountState(account.account_id, !account.is_disabled)}
                          className='action-button'
                          title={account.is_disabled ? 'Enable' : 'Disable'}
                        >
                          <CircleX />
                        </button>
                        <button onClick={() => this.handleDeleteAccount(account)} className='action-button' title='Delete'>
                          <Trash2 />
                        </button>
                      </>
                    ) : (
                      <></>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
        {filteredAccounts.length > 0 && <Transactions />}
      </div>
    );
  }

  renderNewAccountForm = () => {
    const { newAccountForm, updateNewAccountFieldAction } = this.props;
    const { errors } = newAccountForm;

    return (
      <div className='account-row-container input admin'>
        <div className='input-and-error-container'>
          <input
            type='text'
            title='Id...'
            value={newAccountForm.id}
            onChange={(e) => updateNewAccountFieldAction('id', e.target.value)}
            placeholder='Id...'
            className={`id ${errors.id ? 'error' : ''}`}
            disabled
          />
          {errors.id && <span className='error-message'>{errors.id}</span>}
        </div>

        <div className='input-and-error-container'>
          <input
            type='number'
            title='Balance...'
            value={newAccountForm.balance === 0 ? '' : newAccountForm.balance}
            onChange={(e) => updateNewAccountFieldAction('balance', Number(e.target.value))}
            className={`balance ${errors.balance ? 'error' : ''}`}
            ref={this.newAccountInputRef}
          />
          {errors.balance && <span className='error-message'>{errors.balance}</span>}
        </div>

        <button onClick={this.handleCreateAccount} className='action-button'>
          <Save />
        </button>
      </div>
    );
  };

  // Process new account form submission and upload if valid
  handleCreateAccount = () => {
    const errors = this.validateForm();

    if (Object.keys(errors).length === 0) {
      this.props.prepareCreateAccountCommandAction(this.props.newAccountForm.id, this.props.newAccountForm.balance);
      this.props.resetNewAccountFormAction();
      this.props.toggleNewAccountFormAction(false);
      this.props.setCurrentAccountAction(this.props.newAccountForm.id);
    } else {
      this.props.setNewAccountErrorsAction(errors);
    }
  };

  // Validate all form fields for new account
  validateForm = () => {
    const { newAccountForm } = this.props;
    const errors: Record<string, string> = {};

    if (!newAccountForm.id) errors.id = 'Id is required.';

    return errors;
  };

  // Handle account click
  handleAccountClick = (accountId: string) => {
    this.props.setAccountViewedAction(accountId);
    this.props.setCurrentAccountAction(accountId);
    this.props.prepareReadTransactionsCommandAction(accountId);
  };

  // Handle account update: backend + connected clients, and locally.
  handleAccountState = (accountId: string, is_disabled: boolean) => {
    if (!accountId) console.error(`Invalid account id: ${accountId}`);
    else {
      const updates: IAccountUpdates = { is_disabled };
      this.props.prepareUpdateAccountCommandAction(accountId, updates);
      this.props.setAccountStateAction({ account_id: accountId, ...updates });
    }
  };

  // Handle account deletion with confirmation: backend + connected clients, and locally.
  handleDeleteAccount = (account: IAccount) => {
    if (window.confirm(`Are you sure you want to delete this ${!account.is_disabled ? 'open ' : ''}account?`)) {
      this.props.prepareDeleteAccountCommandAction(account.account_id);
      this.props.deleteAccountAction(account.account_id);
    }
  };
}

interface AccountsProps {
  isWsConnected: boolean;
  isAdmin: boolean | null;
  userId: string | null;
  accounts: IAccount[];
  currentAccountId: string | null;
  prepareCreateAccountCommandAction: typeof prepareCreateAccountCommandAction;
  prepareReadTransactionsCommandAction: typeof prepareReadTransactionsCommandAction;
  setCurrentAccountAction: typeof setCurrentAccountAction;
  setAccountViewedAction: typeof setAccountViewedAction;
  setAccountStateAction: typeof setAccountStateAction;
  prepareUpdateAccountCommandAction: typeof prepareUpdateAccountCommandAction;
  prepareDeleteAccountCommandAction: typeof prepareDeleteAccountCommandAction;
  deleteAccountAction: typeof deleteAccountAction;
  showNewAccountForm: boolean;
  newAccountForm: {
    id: string;
    balance: number;
    errors: Record<string, string>;
  };
  toggleNewAccountFormAction: typeof toggleNewAccountFormAction;
  updateNewAccountFieldAction: typeof updateNewAccountFieldAction;
  setNewAccountErrorsAction: typeof setNewAccountErrorsAction;
  resetNewAccountFormAction: typeof resetNewAccountFormAction;
}

// Maps required state from Redux store to component props
const mapStateToProps = (state: AppState) => ({
  isAdmin: state.auth.isAdmin,
  userId: state.auth.userId,
  isWsConnected: state.websockets.isConnected,
  accounts: state.accounts.accounts,
  currentAccountId: state.accounts.currentAccountId,
  showNewAccountForm: state.accounts.showNewAccountForm,
  newAccountForm: state.accounts.newAccountForm,
});

// Map Redux actions to component props
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      prepareCreateAccountCommandAction,
      prepareReadTransactionsCommandAction,
      setCurrentAccountAction,
      setAccountViewedAction,
      setAccountStateAction,
      prepareUpdateAccountCommandAction,
      prepareDeleteAccountCommandAction,
      deleteAccountAction,
      toggleNewAccountFormAction,
      updateNewAccountFieldAction,
      setNewAccountErrorsAction,
      resetNewAccountFormAction,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(Accounts);
