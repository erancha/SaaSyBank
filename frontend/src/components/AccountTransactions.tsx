import React from 'react';
import { connect } from 'react-redux';
import { AppState, ITransaction, IAccount } from '../redux/store/types';
import ReactMarkdown from 'react-markdown';
import { timeShortDisplay, getAccount } from '../utils/utils';
import { showAccountTransactionsAction } from 'redux/mnu/actions';
import { setWSConnectedAction } from 'redux/websockets/actions';

class AccountTransactions extends React.Component<AccountTransactionsProps> {
  private transactionsRefs: React.RefObject<HTMLDivElement>[];

  constructor(props: AccountTransactionsProps) {
    super(props);
    this.transactionsRefs = props.transactions.map(() => React.createRef<HTMLDivElement>());
  }

  componentDidMount() {
    this.focusFirstOpenAccount();
  }

  focusFirstOpenAccount = () => {
    const firstOpenAccountIndex = this.props.transactions.findIndex((account) => this.getAccountDetails(account.accountId)?.is_disabled);
    if (firstOpenAccountIndex !== -1) this.transactionsRefs[firstOpenAccountIndex]?.current?.focus();
  };

  // Render
  render() {
    const { transactions, showAccountTransactionsAction } = this.props;

    // <div key={`${account.id}_${account?.id}`}>
    //   {account.amount === 1400 && (
    //     <pre>
    //       {JSON.stringify(account, null, 2)}
    //       {JSON.stringify(account, null, 2)}
    //     </pre>
    //   )}
    // </div>

    return (
      <div className='body-container'>
        <div className='transactions-container'>
          <div className='transactions-list-header'>
            <div className='dueDate'>Due Date</div>
            <div className='created'>Created</div>
            <div className='category'>Category</div>
            <div className='title'>Title</div>
            <div className='description'>Description</div>
            <div className='bet'>Bet</div>
            <div className='amount'>Amount</div>
            <div className='odds'>Odds</div>
            <div className='status'>Status</div>
          </div>

          <div className='transactions-list'>
            {transactions.length > 0 ? (
              transactions.map((transaction, index) => {
                const account = this.getAccountDetails(transaction.accountId);
                // const bet = this.getBetDetails(transaction.accountId, transaction.betId);

                return (
                  <div
                    key={transaction.id}
                    ref={this.transactionsRefs[index]}
                    tabIndex={index} // Making it focusable
                    className={`transaction-row-container${account?.is_disabled ? ' closed' : ' open'}`}>
                    <div className='created'>{timeShortDisplay(new Date(transaction.createdAt))}</div>
                    <div className='category'>{account?.balance || 'N/A'}</div>
                    <div className='title'>
                      <ReactMarkdown>{account?.account_id || 'N/A'}</ReactMarkdown>
                    </div>
                    <div className='amount'>{transaction.amount.toLocaleString()}$</div>
                  </div>
                );
              })
            ) : (
              <span className='no-transactions'>
                Please make a bet on{' '}
                <span className='accounts' onClick={() => showAccountTransactionsAction(false)}>
                  Accounts
                </span>{' '}
                page ..
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Retrieves account details from either transactions accounts or all accounts using account ID
  getAccountDetails = (accountId: string) => {
    const { allAccounts } = this.props;

    return getAccount(allAccounts, accountId);
  };
}

interface AccountTransactionsProps {
  transactions: ITransaction[];
  allAccounts: IAccount[];
  showAccountTransactionsAction: typeof showAccountTransactionsAction;
  lastConnectionsTimestampISO: string;
  setWSConnectedAction: typeof setWSConnectedAction;
}

// Maps required state from Redux store to component props
const mapStateToProps = (state: AppState) => ({
  transactions: state.transactions.transactions,
  allAccounts: state.accounts.accounts,
  lastConnectionsTimestampISO: state.websockets.lastConnectionsTimestampISO,
});

// Map Redux actions to component props
const mapDispatchToProps = {
  showAccountTransactionsAction,
  setWSConnectedAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(AccountTransactions);
