import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { AppState, IConnectionAndUsername, IAccount, IUploadPayload, IAccountState, INewTransaction, BankingFunctionType } from 'redux/store/types';
import { setAnalyticsTypeAction } from '../redux/mnu/actions';
import { setIsAdminAction } from '../redux/auth/actions';
import { setWSConnectedAction, setAppVisibleAction, setConnectionsAndUsernamesAction, toggleConnectionsAction } from '../redux/websockets/actions';
import { setAccountsAction, addAccountAction, setAccountStateAction, setCurrentAccountAction } from '../redux/accounts/actions';
import { setTransactionsAction } from '../redux/transactions/actions';
import appConfigData from '../appConfig.json';
import { Network } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getAccount } from 'utils/utils';

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
    const { isWsConnected, JWT, isAppVisible, analyticsType, setAnalyticsTypeAction } = this.props;
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
      if (previousAnalyticsType) setTimeout(() => setAnalyticsTypeAction(previousAnalyticsType), 5000); //TODO: Look into this again - without setTimeout the client opens several connections !
    } else if (!isAppVisible && prevProps.isAppVisible) {
      this.setState({ previousAnalyticsType: analyticsType });
      // Store the current analytics type before disconnecting
      if (analyticsType) setAnalyticsTypeAction(null); // to trigger a refresh on reconnection.

      // console.log('--> this.disconnect()');
      this.disconnect();
    }

    this.compareAndUpload(prevProps);
  }

  // Compare the current props with the previous props, and upload to the backend via the websocket when applicable.
  private compareAndUpload(prevProps: WebSocketProps) {
    const { newRecordToUpload, accountStateToUpload, analyticsType } = this.props;

    const upload = (data: any) => {
      try {
        this.webSocket?.send(JSON.stringify(data)); // JSON.stringify({ action: 'WebsocketGenericReceiver', data })
      } catch (error) {
        toast.error(`Failed to send a message to the websocket server: ${error}`);
      }
    };

    // CRUD: Commands to Create data:
    //-----------------------------------------

    // Handle new record uploads (accounts, transactions)
    if (newRecordToUpload && newRecordToUpload !== prevProps.newRecordToUpload) {
      switch (newRecordToUpload.type) {
        case 'account':
          upload({ command: { type: 'create', params: { account: newRecordToUpload.data } } });
          break;
        case 'transaction':
          const transaction = newRecordToUpload.data as INewTransaction;
          const toAccountId = transaction.bankingFunction === BankingFunctionType.Transfer ? transaction.toAccountId : transaction.accountId;
          const toUserId = getAccount(this.props.accounts, toAccountId)?.user_id;
          upload({ command: { type: 'create', params: { transaction: newRecordToUpload.data }, to: toUserId } }); // TODO: notify this.props.userId as well
          break;
      }
    }

    // CRUD: Commands to Read data:
    //-----------------------------------------

    // read data for a report:
    if (analyticsType && analyticsType !== prevProps.analyticsType) {
      upload({ command: { type: 'read', params: { analyticsType } } });
    }

    // CRUD: Commands to Update or Delete data:
    //-----------------------------------------

    // Handle account state uploads (enable/disable/delete)
    if (accountStateToUpload && accountStateToUpload !== prevProps.accountStateToUpload) {
      const account = this.props.accounts.find((acc) => acc.account_id === accountStateToUpload.account_id);
      if (!accountStateToUpload.is_deleted) {
        upload({
          command: {
            type: 'update',
            params: { account: accountStateToUpload },
            to: account?.user_id,
          },
        });
      } else {
        upload({
          command: {
            type: 'delete',
            params: { account: { account_id: accountStateToUpload.account_id } },
            to: account?.user_id,
          },
        });
      }
    }
  }

  componentWillUnmount() {
    this.disconnect();
  }

  // Component's rendering function:
  render() {
    const { isWsConnected, showConnections, lastConnectionsTimestamp, connectionsAndUsernames, toggleConnectionsAction } = this.props;

    return (
      <div
        className='network-container'
        title={isWsConnected ? `Connected, last connections update on ${lastConnectionsTimestamp}` : 'Disconnected'}
        onClick={() => toggleConnectionsAction(!showConnections)}
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
    const url = `${appConfigData.WEBSOCKET_API_URL}?token=${JWT}`;
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
    if (dataCreated.account) {
      const newReceivedAccount: IAccount = { ...dataCreated.account };
      this.props.addAccountAction({ ...newReceivedAccount, viewed: true });
    } else if (dataCreated.transaction) {
      // Balance updates
      if (dataCreated.transaction.account) {
        const account = dataCreated.transaction.account;

        // For a transfer that affects two accounts
        if (account.withdrawResult && account.depositResult) {
          const { withdrawResult, depositResult } = dataCreated.transaction.account;
          this.props.setAccountStateAction({
            account_id: withdrawResult.account_id,
            balance: withdrawResult.balance,
          });
          this.props.setAccountStateAction({
            account_id: depositResult.account_id,
            balance: depositResult.balance,
          });
        } else {
          this.props.setAccountStateAction({
            account_id: account.account_id,
            balance: account.balance,
          });
        }
      }
    }
  }

  // CRUD: event containing Read data
  private handleDataRead(dataRead: any) {
    if (dataRead.accounts) this.props.setAccountsAction(dataRead.accounts.map((account: IAccount) => ({ ...account, viewed: true })));
    if (dataRead.transactions) this.props.setTransactionsAction(dataRead.transactions);
  }

  // CRUD: event containing Updated data
  private handleDataUpdated(dataUpdated: any) {
    if (dataUpdated.account) {
      this.props.setAccountStateAction(dataUpdated.account);
      if (!dataUpdated.account.is_disabled) this.props.setCurrentAccountAction(dataUpdated.account.account_id);
      toast(`Account ${dataUpdated.account.account_id} is now ${dataUpdated.account.is_disabled ? 'disabled' : 'enabled'}`);
    }
  }

  // CRUD: event containing Deleted data
  private handleDataDeleted(dataDeleted: any) {
    if (dataDeleted.account) {
      this.props.setAccountStateAction({
        account_id: dataDeleted.account.account_id,
        is_deleted: true,
        is_disabled: true,
      });
      toast(`Account ${dataDeleted.account.account_id} was deleted.`);
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
  newRecordToUpload: IUploadPayload | null;
  accountStateToUpload: IAccountState | null;
  accounts: IAccount[];
  setAccountsAction: typeof setAccountsAction;
  setTransactionsAction: typeof setTransactionsAction;
  analyticsType: string | null;
  setAccountStateAction: typeof setAccountStateAction;
  addAccountAction: typeof addAccountAction;
  setCurrentAccountAction: typeof setCurrentAccountAction;
  setIsAdminAction: typeof setIsAdminAction;
  setAnalyticsTypeAction: typeof setAnalyticsTypeAction;
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
  analyticsType: state.mnu.analyticsType,
  newRecordToUpload: state.accounts.newRecordToUpload,
  accountStateToUpload: state.accounts.stateToUpload,
  accounts: state.accounts.accounts,
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
      setTransactionsAction,
      setIsAdminAction,
      setAnalyticsTypeAction,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(WebSocketService);
