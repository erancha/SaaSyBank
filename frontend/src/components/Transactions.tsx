import React from 'react';
import { connect } from 'react-redux';
import { AppState, ITransaction, IAccount, BankingFunctionType } from '../redux/store/types';
import { timeShortDisplay, getAccount } from '../utils/utils';
import { setWSConnectedAction } from 'redux/websockets/actions';
import { uploadCreatedRecordAction } from '../redux/accounts/actions';
import { addTransactionAction } from '../redux/transactions/actions';
import { CheckCircle, XCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Type-safe field names for ITransaction
type TransactionField = keyof Pick<ITransaction, 'bankingFunction' | 'amount' | 'toAccountId'>;

class Transactions extends React.Component<AccountTransactionsProps, { emptyTransaction: ITransaction }> {
  private transactionsRefs: React.RefObject<HTMLDivElement>[];

  private createInitialTransaction = (): ITransaction => ({
    id: uuidv4(),
    amount: 0,
    bankingFunction: BankingFunctionType.Deposit,
    accountId: this.props.currentAccount?.account_id || '',
    toAccountId: '',
    executed_at: '',
  });

  constructor(props: AccountTransactionsProps) {
    super(props);
    this.state = { emptyTransaction: this.createInitialTransaction() };
    this.transactionsRefs = props.transactions.map(() => React.createRef<HTMLDivElement>());
  }

  componentDidUpdate(prevProps: AccountTransactionsProps) {
    // Update emptyTransaction's accountId when currentAccount changes
    if (this.props.currentAccount && prevProps.currentAccount?.account_id !== this.props.currentAccount.account_id && !this.props.currentAccount.is_disabled) {
      this.setState((prevState) => ({
        emptyTransaction: {
          ...prevState.emptyTransaction,
          accountId: this.props.currentAccount?.account_id || '',
        },
      }));
    }
  }

  isTransactionValid = (transaction: ITransaction) => {
    if (transaction.amount <= 0) return false;
    if (transaction.bankingFunction === BankingFunctionType.Withdraw && transaction.amount > (this.props.currentAccount?.balance || 0)) return false;
    if (transaction.bankingFunction === BankingFunctionType.Transfer && !transaction.toAccountId) return false;
    return true;
  };

  // Updates a specific field in the empty transaction state when the user modifies its value
  handleEmptyTransactionChange = (field: TransactionField, value: string | number) => {
    this.setState((prevState) => ({
      emptyTransaction: {
        ...prevState.emptyTransaction,
        [field]: value,
      },
    }));
  };

  // Handler for executing a transaction
  handleExecuteTransaction = (transaction: ITransaction) => {
    if (transaction.bankingFunction === BankingFunctionType.Transfer) this.props.addTransactionAction(transaction); // Add the transaction to the source account, locally - the target account will receive a notification from the backend.
    // TODO: Refer to the comment '// TODO: notify this.props.userId as well' in WebSocketService.tsx - when the backend will notify the source account after the transaction is confirmed, the current addition will become unnecessary.
    this.props.uploadCreatedRecordAction({ type: 'transaction', data: { ...transaction, bankingFunction: transaction.bankingFunction.toLowerCase() } });
  };

  // Handler for cancelling the changes made to a transaction
  handleCancelTransaction = () => {
    this.setState({ emptyTransaction: this.createInitialTransaction() });
  };

  // Render
  render() {
    const { transactions } = this.props;

    return (
      <div className='body-container'>
        <div className='transactions-container'>
          <div className='transactions-list-header'>
            <div className='executedAt'>Executed At</div>
            <div className='amount'>Amount</div>
            <div className='function'>Function</div>
            <div className='targetAccount'>Target Account</div>
            <div className='actions' />
          </div>

          <div className='transactions-list'>
            {this.props.currentAccount && !this.props.currentAccount.is_disabled && (
              <div key={0} className='transaction-row-container input'>
                {this.renderTransaction(this.state.emptyTransaction)}
              </div>
            )}
            {transactions.length > 0 ? (
              transactions.map((transaction, index) => (
                <div key={transaction.id} ref={this.transactionsRefs[index]} tabIndex={index} className='transaction-row-container'>
                  {this.renderTransaction(transaction)}
                </div>
              ))
            ) : (
              <span className='no-transactions'>..</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  renderTransaction = (transaction: ITransaction) => {
    const isExecuted = !!transaction.executed_at;
    const functionOptions = Object.values(BankingFunctionType);
    const isValid = !isExecuted ? this.isTransactionValid(transaction) : true;

    return (
      <>
        <div className='executedAt'>{isExecuted ? timeShortDisplay(new Date(transaction.executed_at)) : ''}</div>
        <div className='amount'>
          {isExecuted ? (
            `${(transaction.amount ?? 0).toLocaleString()}$`
          ) : (
            <input
              type='number'
              // Display empty string instead of 0 to allow deleting initial value
              value={transaction.amount === 0 ? '' : transaction.amount}
              onChange={(e) => {
                if (!isExecuted) {
                  // Handle empty input as 0, otherwise parse the number
                  const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  // Set max amount based on transaction type - limit withdrawals/transfers to account balance
                  const maxAmount = transaction.bankingFunction === BankingFunctionType.Withdraw ||
                    transaction.bankingFunction === BankingFunctionType.Transfer
                    ? this.props.currentAccount?.balance || 0
                    : Number.MAX_SAFE_INTEGER;

                  // Ignore invalid numbers, negative values, and amounts exceeding balance
                  if (isNaN(newValue) || newValue < 0 || newValue > maxAmount) {
                    return;
                  }
                  this.handleEmptyTransactionChange('amount' as TransactionField, newValue);
                }
              }}
              // Browser-level validation for min/max amount
              min="0"
              max={transaction.bankingFunction === BankingFunctionType.Withdraw ||
                transaction.bankingFunction === BankingFunctionType.Transfer
                ? this.props.currentAccount?.balance
                : undefined}
              readOnly={isExecuted}
            />
          )}
        </div>
        <div className='bankingFunction'>
          {isExecuted ? (
            transaction.bankingFunction
          ) : (
            <select
              value={transaction.bankingFunction}
              onChange={(e) => (!isExecuted ? this.handleEmptyTransactionChange('bankingFunction' as TransactionField, e.target.value) : undefined)}
              disabled={isExecuted}>
              {functionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className='targetAccount'>
          {isExecuted
            ? transaction.toAccountId
            : transaction.bankingFunction === BankingFunctionType.Transfer && (
              <input
                type='text'
                value={transaction.toAccountId}
                onChange={(e) => (!isExecuted ? this.handleEmptyTransactionChange('toAccountId' as TransactionField, e.target.value) : undefined)}
                readOnly={isExecuted}
                placeholder={'Enter target account'}
              />
            )}
        </div>
        <div className='actions'>
          {!isExecuted && (
            <>
              <button onClick={() => this.handleExecuteTransaction(transaction)} className='action-button' title='Execute' disabled={!isValid}>
                <CheckCircle />
              </button>
              <button onClick={() => this.handleCancelTransaction()} className='action-button' title='Cancel'>
                <XCircle />
              </button>
            </>
          )}
        </div>
      </>
    );
  };

  // Retrieves account details from either transactions accounts or all accounts using account ID
  getAccountDetails = (accountId: string) => {
    const { accounts } = this.props;
    return getAccount(accounts, accountId);
  };
}

interface AccountTransactionsProps {
  transactions: ITransaction[];
  accounts: IAccount[];
  currentAccount: IAccount | undefined;
  setWSConnectedAction: typeof setWSConnectedAction;
  uploadCreatedRecordAction: typeof uploadCreatedRecordAction;
  addTransactionAction: typeof addTransactionAction;
}

// Maps required state from Redux store to component props
const mapStateToProps = (state: AppState) => ({
  transactions: state.transactions.transactions,
  accounts: state.accounts.accounts,
  currentAccount: state.accounts.currentAccountId ? state.accounts.accounts.find((acc) => acc.account_id === state.accounts.currentAccountId) : undefined,
});

// Map Redux actions to component props
const mapDispatchToProps = {
  setWSConnectedAction,
  uploadCreatedRecordAction,
  addTransactionAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(Transactions);
