import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { AppState, IAccount } from '../redux/store/types';
import {
  broadcastCreatedRecordAction,
  setAccountViewedAction,
  setAccountStateAction,
  broadcastAccountStateAction,
  toggleNewAccountFormAction,
  updateNewAccountFieldAction,
  resetNewAccountFormAction,
  setNewAccountErrorsAction,
} from '../redux/accounts/actions';
import { toggleMenuAction, showAccountTransactionsAction } from '../redux/mnu/actions';
import { Save, Trash2, CircleX } from 'lucide-react';
import { filterAndSortAccounts } from '../utils/utils';

class Accounts extends React.Component<AccountsProps> {
  // Refs for form elements
  private newAccountInputRef = React.createRef<HTMLInputElement>();

  // Initialize focus and visibility change listeners
  componentDidMount() {
    // Scroll to the top (this is a workaround, to clear side affects from AccountTransactions - TODO: Handle in AccountTransactions)
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

    return filterAndSortAccounts(accounts);
  };

  // Render the complete account interface with form controls and list
  render() {
    const { isAdmin, showNewAccountForm, isWsConnected } = this.props;

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
                  }`}
                  onClick={() => this.handleAccountClick(account.account_id)}>
                  <div className='id'>{account.account_id}</div>
                  {isAdmin && <div className='userId'>{account.user_id}</div>}
                  <div className='balance'>{account.balance}</div>
                  <div className='actions'>
                    {isAdmin ? (
                      <>
                        <button
                          onClick={() => this.handleAccountStatus(account.account_id, !account.is_disabled)}
                          className='action-button'
                          title={account.is_disabled ? 'Enable' : 'Disable'}>
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
            value={newAccountForm.balance}
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

  // Process new account form submission and broadcast if valid
  handleCreateAccount = () => {
    const { newAccountForm, toggleNewAccountFormAction, setNewAccountErrorsAction, resetNewAccountFormAction, broadcastCreatedRecordAction } = this.props;
    const errors = this.validateForm();

    if (Object.keys(errors).length === 0) {
      broadcastCreatedRecordAction({
        account_id: newAccountForm.id,
        balance: newAccountForm.balance,
      });
      resetNewAccountFormAction();
      toggleNewAccountFormAction(false);
    } else {
      setNewAccountErrorsAction(errors);
    }
  };

  // Validate all form fields for new account
  validateForm = () => {
    const { newAccountForm } = this.props;
    const errors: Record<string, string> = {};

    if (!newAccountForm.id) errors.id = 'Id is required.';

    return errors;
  };

  // Set a account in the redux store as viewed when clicked
  handleAccountClick = (accountId: string) => {
    const { setAccountViewedAction } = this.props;

    if (accountId) setAccountViewedAction(accountId);
  };

  // Set a account status in the redux store and broadcast the change
  handleAccountStatus = (accountId: string, is_disabled: boolean) => {
    const { setAccountStateAction, broadcastAccountStateAction } = this.props;

    if (!accountId) console.error(`Invalid account id: ${accountId}`);
    else {
      const accountState = { account_id: accountId, is_disabled, is_deleted: false };
      setAccountStateAction(accountState);
      broadcastAccountStateAction(accountState);
    }
  };

  // Handle account deletion with confirmation and broadcast deletions
  handleDeleteAccount = (account: IAccount) => {
    const { setAccountStateAction, broadcastAccountStateAction } = this.props;

    if (window.confirm(`Are you sure you want to delete this ${!account.is_disabled ? 'open ' : ''}account?`)) {
      const accountState = { account_id: account.account_id, is_disabled: true, is_deleted: true };
      broadcastAccountStateAction(accountState);
      setAccountStateAction(accountState);
    }
  };
}

interface AccountsProps {
  menuOpen: boolean;
  toggleMenuAction: typeof toggleMenuAction;
  isWsConnected: boolean;
  isAdmin: boolean | null;
  showNewAccountForm: boolean;
  newAccountForm: {
    id: string;
    balance: number;
    errors: Record<string, string>;
  };
  toggleNewAccountFormAction: typeof toggleNewAccountFormAction;
  updateNewAccountFieldAction: typeof updateNewAccountFieldAction;
  resetNewAccountFormAction: typeof resetNewAccountFormAction;
  setNewAccountErrorsAction: typeof setNewAccountErrorsAction;
  accounts: IAccount[];
  broadcastCreatedRecordAction: typeof broadcastCreatedRecordAction;
  setAccountViewedAction: typeof setAccountViewedAction;
  setAccountStateAction: typeof setAccountStateAction;
  broadcastAccountStateAction: typeof broadcastAccountStateAction;
  showAccountTransactionsAction: typeof showAccountTransactionsAction;
}

// Maps required state from Redux store to component props
const mapStateToProps = (state: AppState) => ({
  isAdmin: state.auth.isAdmin,
  isWsConnected: state.websockets.isConnected,
  showNewAccountForm: state.accounts.showNewAccountForm,
  accounts: state.accounts.accounts,
  newAccountForm: state.accounts.newAccountForm,
  menuOpen: state.mnu.menuOpen,
});

// Map Redux actions to component props
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      toggleMenuAction,
      toggleNewAccountFormAction,
      updateNewAccountFieldAction,
      resetNewAccountFormAction,
      setNewAccountErrorsAction,
      broadcastCreatedRecordAction,
      setAccountViewedAction,
      setAccountStateAction,
      broadcastAccountStateAction,
      showAccountTransactionsAction,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(Accounts);
