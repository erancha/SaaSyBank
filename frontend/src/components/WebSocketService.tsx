import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { AppState, IAccount, IConnectionAndUsername } from '../redux/store/types';
import { ICreateCommand, IReadCommand, IUpdateCommand, IDeleteCommand, CommandType } from '../redux/crud/types';
import { IUpdateAccountParams } from '../redux/accounts/types';
import { IReadTransactionParams } from '../redux/transactions/types';
import { IReadAnalyticsParams } from '../redux/analytics/types';
import { setAnalyticsTypeAction } from '../redux/mnu/actions';
import { setIsAdminAction } from '../redux/auth/actions';
import { setWSConnectedAction, setAppVisibleAction, setConnectionsAndUsernamesAction, toggleConnectionsAction } from '../redux/websockets/actions';
import {
  addAccountAction,
  setAccountsAction,
  setCurrentAccountAction,
  setAccountStateAction,
  deleteAccountAction,
  setAccountConfirmedByBackendAction,
} from '../redux/accounts/actions';
import {
  setTransactionsAction,
  addTransactionAction,
  setTransactionConfirmedByBackendAction,
  prepareReadTransactionsCommandAction,
} from '../redux/transactions/actions';
import appConfigData from '../appConfig.json';
import { Network } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

class WebSocketService extends React.Component<WebSocketProps, WebSocketState> {
  private webSocket: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private reconnectAttempts = 0;
  private reconnectDelay = 1000;

  constructor(props: WebSocketProps) {
    super(props);
    this.state = {
      previousAnalyticsType: null,
    };
  }

  async componentDidMount() {
    try {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    } catch (err) {
      console.error('Error initializing WebSocket service:', err);
      this.props.setWSConnectedAction(false);
    }
  }

  // Handle change from hidden to visible:
  handleVisibilityChange = () => {
    const { setAppVisibleAction } = this.props;

    setAppVisibleAction(document.visibilityState === 'visible');
  };

  componentDidUpdate(prevProps: WebSocketProps) {
    const { isWsConnected, JWT, isAppVisible, analyticsType } = this.props;
    const { previousAnalyticsType } = this.state;

    // console.log(
    //   `isWsConnected: ${isWsConnected} (prev: ${prevProps.isWsConnected}), jwt: ${JWT?.substring(0, 10)}... (prev: ${prevProps.JWT?.substring(
    //     0,
    //     10
    //   )}...), isAppVisible: ${isAppVisible} (prev: ${prevProps.isAppVisible}), analyticsType: ${analyticsType} (prev: ${prevProps.analyticsType})`
    // );

    if (!isWsConnected && JWT && isAppVisible) {
      // console.log('--> this.connect()');
      this.connect();

      // When reconnecting, set the analytics type to the previous one if it exists
      if (previousAnalyticsType) setTimeout(() => this.props.setAnalyticsTypeAction(previousAnalyticsType), 5000); //TODO: Look into this again - without setTimeout the client opens several connections !
    } else if (!isAppVisible && prevProps.isAppVisible) {
      this.setState({ previousAnalyticsType: analyticsType });
      // Store the current analytics type before disconnecting
      if (analyticsType) this.props.setAnalyticsTypeAction(null); // to trigger a refresh on reconnection.

      // console.log('--> this.disconnect()');
      this.disconnect();
    }

    this.compareAndUpload(prevProps);
  }

  // Compare the current props with the previous props, and upload to the backend via the websocket when applicable.
  private compareAndUpload(prevProps: WebSocketProps) {
    const { createCommand, readCommand, updateCommand, deleteCommand } = this.props;

    const upload = (data: any) => {
      try {
        this.webSocket?.send(JSON.stringify(data)); // JSON.stringify({ action: 'WebsocketGenericReceiver', data })
      } catch (error) {
        toast.error(`Failed to send a message to the websocket server: ${error}`);
      }
    };

    // CRUD: Commands to Create data:
    //-----------------------------------------
    if (createCommand && createCommand !== prevProps.createCommand) {
      switch (createCommand.type) {
        case 'accounts' as CommandType:
          upload({ command: { type: 'create', params: { accounts: createCommand.params } } });
          break;
        case 'transactions' as CommandType:
          upload({ command: { type: 'create', params: { transactions: createCommand.params } } });
          break;
      }
    }

    // CRUD: Commands to Read data:
    //-----------------------------------------
    if (readCommand && readCommand !== prevProps.readCommand) {
      switch (readCommand.type) {
        case 'transactions' as CommandType:
          const transactionParams = readCommand.params as IReadTransactionParams;
          upload({ command: { type: 'read', params: { transactions: { account_id: transactionParams.account_id } } } });
          break;
        case 'analytics':
          const analyticsParams = readCommand.params as IReadAnalyticsParams;
          upload({ command: { type: 'read', params: { analyticsType: analyticsParams.analyticsType } } });
          break;
      }
    }

    // CRUD: Commands to Update data:
    //-----------------------------------------
    if (updateCommand && updateCommand !== prevProps.updateCommand) {
      switch (updateCommand.type) {
        case 'accounts' as CommandType: {
          const updateAccountParams = updateCommand.params as IUpdateAccountParams;
          upload({
            command: {
              type: 'update',
              params: { accounts: updateAccountParams },
            },
          });
          break;
        }
        default: {
          console.warn(`Unknown update command type: ${updateCommand.type}`);
          break;
        }
      }
    }

    // CRUD: Commands to Delete data:
    //-----------------------------------------
    if (deleteCommand && deleteCommand !== prevProps.deleteCommand) {
      switch (deleteCommand.type) {
        case 'accounts' as CommandType: {
          upload({
            command: {
              type: 'delete',
              params: { accounts: { account_id: deleteCommand.params.account_id } },
            },
          });
          break;
        }
        default: {
          console.warn(`Unknown delete command type: ${deleteCommand.type}`);
          break;
        }
      }
    }
  }

  componentWillUnmount() {
    this.disconnect();
  }

  // Component's rendering function:
  render() {
    const { isWsConnected, showConnections, connectionsAndUsernames, lastConnectionsTimestamp } = this.props;

    return (
      <div
        className='network-container'
        title={isWsConnected ? `Connected, last connections update on ${lastConnectionsTimestamp}` : 'Disconnected'}
        onClick={() => this.props.toggleConnectionsAction(!showConnections)}
      >
        <div className='left-column'>
          <Network size={20} className={`network-icon ${isWsConnected ? 'connected' : 'disconnected'}`} />
          <span className='last-connections-timestamp'>{lastConnectionsTimestamp}</span>
        </div>
        <ul className='right-column'>
          {showConnections &&
            connectionsAndUsernames &&
            connectionsAndUsernames.map((item: IConnectionAndUsername) => (
              <li key={item.connectionId} className='username'>
                {item.username}
              </li>
            ))}
        </ul>
      </div>
    );
  }

  // Open a connection to the backend's websocket api:
  private async connect(): Promise<void> {
    const { JWT } = this.props;

    // Reset the previous connection (if open):
    this.disconnect();

    // Introduce a delay of 100 milliseconds before proceeding with the next line of code
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Open the new connection:
    const url = `${appConfigData.WEBSOCKET_API_URL}/ws?token=${JWT}`;
    // console.log(`Creating WebSocket connection with URL: ${url}`);
    this.webSocket = new WebSocket(url);

    this.webSocket.onopen = () => {
      console.log('** WebSocket connection opened **');
      this.props.setWSConnectedAction(true);
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
    };

    this.webSocket.onclose = (event) => {
      console.log(`** WebSocket connection closed **: ${JSON.stringify(event)}`);

      if (event.code === 1006 && this.props.isAppVisible && ++this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        console.log(`Attempting to reconnect in ${this.reconnectDelay / 1000} seconds...`);
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectDelay *= 2;
          this.props.setWSConnectedAction(false);
        }, this.reconnectDelay);
      } else {
        // console.warn('Maximum reconnection attempts reached or manual closure.');
      }
    };

    this.webSocket.onmessage = (event) => {
      this.handleWebsocketIncomingEvent(event.data);
    };

    this.webSocket.onerror = (error) => {
      console.error('** WebSocket error: **', error);
      this.props.setWSConnectedAction(false);
    };
  }

  // Close the connection to the backend's websocket api:
  private disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
      this.props.setWSConnectedAction(false);
    }
  }

  // Main handler for incoming WebSocket messages
  private handleWebsocketIncomingEvent(eventData: string) {
    // console.log(eventData);
    const parsedEventData = JSON.parse(eventData);
    if (parsedEventData.isAdmin) {
      this.props.setIsAdminAction();
      this.props.toggleConnectionsAction(true);
    }

    // CRUD: event containing Created data
    if (parsedEventData.dataCreated) {
      this.handleDataCreated(parsedEventData.dataCreated);
    }
    // CRUD: event containing Read data
    else if (parsedEventData.dataRead) {
      this.handleDataRead(parsedEventData.dataRead);
      // if (parsedEventData.dataRead.accounts) this.handleIncomingConnectionsAndUsernames(parsedEventData.connectionsAndUsernames);
    }
    // CRUD: event containing Updated data
    else if (parsedEventData.dataUpdated) {
      this.handleDataUpdated(parsedEventData.dataUpdated);
    }
    // CRUD: event containing Deleted data
    else if (parsedEventData.dataDeleted) {
      this.handleDataDeleted(parsedEventData.dataDeleted);
      // } else if (parsedEventData.connectionsAndUsernames) {
      //   this.handleIncomingConnectionsAndUsernames(parsedEventData.connectionsAndUsernames);
      // } else if (parsedEventData.pong) {
      //   this.handleIncomingConnectionsAndUsernames(null); // only updates lastConnectionsTimestamp*
    } else {
      console.warn(eventData.substring(0, 500));
    }
  }

  // CRUD: event containing Created data
  private handleDataCreated(dataCreated: any) {
    if (dataCreated.accounts) {
      const newReceivedAccount: IAccount = { ...dataCreated.accounts };
      const isNewAccount = !this.props.accounts.find((account) => account.account_id === newReceivedAccount.account_id);
      if (isNewAccount) this.props.addAccountAction({ ...newReceivedAccount });
      else this.props.setAccountConfirmedByBackendAction(newReceivedAccount.account_id);
      toast(`New account ${dataCreated.accounts.account_id} is pending confirmation`, { autoClose: this.props.isAdmin ? 10000 : 5000 });
    } else if (dataCreated.transactions) {
      const newReceivedTransaction = dataCreated.transactions;
      const isNewTransaction = !this.props.transactions.find((transaction) => transaction.id === newReceivedTransaction.id);
      if (isNewTransaction) this.props.addTransactionAction({ ...newReceivedTransaction });
      else this.props.setTransactionConfirmedByBackendAction(newReceivedTransaction.id);

      // Balance updates:
      const account = dataCreated.transactions.account;
      if (account) {
        // 'single-account' banking function (deposit, withdraw):
        this.props.setAccountStateAction({ ...account });
        this.props.setCurrentAccountAction(account.account_id);
        this.props.prepareReadTransactionsCommandAction(account.account_id);
      } else {
        // 'transfer' banking function, between two accounts:
        const { withdrawResult, depositResult } = dataCreated.transactions.accounts;
        this.props.setAccountStateAction({ ...withdrawResult });
        this.props.setAccountStateAction({ ...depositResult });

        const accountIdToFocus =
          this.props.accounts.find((account) => account.account_id === withdrawResult.account_id)?.account_id ?? depositResult.account_id;
        this.props.setCurrentAccountAction(accountIdToFocus);
        this.props.prepareReadTransactionsCommandAction(accountIdToFocus);
      }
    }
  }

  // CRUD: event containing Read data
  private handleDataRead(dataRead: any) {
    if (dataRead.accounts) this.props.setAccountsAction(dataRead.accounts);
    if (dataRead.transactions) this.props.setTransactionsAction(dataRead.transactions);
  }

  // CRUD: event containing Updated data
  private handleDataUpdated(dataUpdated: any) {
    if (dataUpdated.accounts) {
      this.props.setAccountStateAction(dataUpdated.accounts);
      if (!dataUpdated.accounts.is_disabled) this.props.setCurrentAccountAction(dataUpdated.accounts.account_id);
      toast(`Account ${dataUpdated.accounts.account_id} is now ${dataUpdated.accounts.is_disabled ? 'disabled' : 'enabled'}`, { autoClose: 3000 });
    }
  }

  // CRUD: event containing Deleted data
  private handleDataDeleted(dataDeleted: any) {
    if (dataDeleted.accounts) {
      this.props.deleteAccountAction(dataDeleted.accounts.account_id);
      toast(`Account ${dataDeleted.accounts.account_id} was deleted.`);
    }
  }

  // Sets the connections and usernames in the state
  // private handleIncomingConnectionsAndUsernames(connections: IConnectionAndUsername[] | null) {
  //   const { setConnectionsAndUsernamesAction, isAdmin, toggleConnectionsAction } = this.props;
  //   setConnectionsAndUsernamesAction(connections);
  //   // Show the current connections whenever the backend informs this frontend about a change in the connected users:
  //   if (connections && isAdmin) toggleConnectionsAction(true);
  // }
}

interface WebSocketProps {
  JWT: string | null;
  isAdmin: boolean | null;
  setIsAdminAction: typeof setIsAdminAction;
  userId: string | null;
  isWsConnected: boolean;
  setWSConnectedAction: typeof setWSConnectedAction;
  isAppVisible: boolean;
  setAppVisibleAction: typeof setAppVisibleAction;
  connectionsAndUsernames: IConnectionAndUsername[];
  setConnectionsAndUsernamesAction: typeof setConnectionsAndUsernamesAction;
  showConnections: boolean;
  toggleConnectionsAction: typeof toggleConnectionsAction;
  lastConnectionsTimestamp: string;
  lastConnectionsTimestampISO: string;
  addAccountAction: typeof addAccountAction;
  createCommand: ICreateCommand | null;
  readCommand: IReadCommand | null;
  updateCommand: IUpdateCommand | null;
  deleteCommand: IDeleteCommand | null;
  accounts: IAccount[];
  setAccountsAction: typeof setAccountsAction;
  setCurrentAccountAction: typeof setCurrentAccountAction;
  setAccountStateAction: typeof setAccountStateAction;
  deleteAccountAction: typeof deleteAccountAction;
  setAccountConfirmedByBackendAction: typeof setAccountConfirmedByBackendAction;
  addTransactionAction: typeof addTransactionAction;
  prepareReadTransactionsCommandAction: typeof prepareReadTransactionsCommandAction;
  setTransactionsAction: typeof setTransactionsAction;
  setTransactionConfirmedByBackendAction: typeof setTransactionConfirmedByBackendAction;
  transactions: any[];
  analyticsType: string | null;
  setAnalyticsTypeAction: typeof setAnalyticsTypeAction;
  currentAccountId: string | null;
}

interface WebSocketState {
  previousAnalyticsType: string | null;
}

// Maps required state from Redux store to component props
const mapStateToProps = (state: AppState) => ({
  JWT: state.auth.JWT,
  isAdmin: state.auth.isAdmin,
  userId: state.auth.userId,
  isWsConnected: state.websockets.isConnected,
  isAppVisible: state.websockets.isAppVisible,
  connectionsAndUsernames: state.websockets.connectionsAndUsernames,
  showConnections: state.websockets.showConnections,
  lastConnectionsTimestamp: state.websockets.lastConnectionsTimestamp,
  lastConnectionsTimestampISO: state.websockets.lastConnectionsTimestampISO,
  createCommand: state.crud.createCommand,
  readCommand: state.crud.readCommand,
  updateCommand: state.crud.updateCommand,
  deleteCommand: state.crud.deleteCommand,
  accounts: state.accounts.accounts,
  currentAccountId: state.accounts.currentAccountId,
  transactions: state.transactions.transactions,
  analyticsType: state.mnu.analyticsType, // TODO
});

// Map Redux actions to component props
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      setWSConnectedAction,
      setAppVisibleAction,
      setConnectionsAndUsernamesAction,
      toggleConnectionsAction,
      setAccountsAction,
      setCurrentAccountAction,
      addAccountAction,
      setAccountStateAction,
      deleteAccountAction,
      setAccountConfirmedByBackendAction,
      addTransactionAction,
      prepareReadTransactionsCommandAction,
      setTransactionsAction,
      setTransactionConfirmedByBackendAction,
      setIsAdminAction,
      setAnalyticsTypeAction,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(WebSocketService);
