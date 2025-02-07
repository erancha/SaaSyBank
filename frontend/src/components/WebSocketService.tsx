import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import {
  AppState,
  IConnectionAndUsername,
  IAccount,
  IBroadcastPayload,
  isNewAccount,
  isNewTransaction,
  INewTransaction,
  ITransaction,
  IAccountState,
} from 'redux/store/types';
import { setAnalyticsTypeAction, showAccountTransactionsAction } from '../redux/mnu/actions';
import { setIsAdminAction } from '../redux/auth/actions';
import { setWSConnectedAction, setAppVisibleAction, setConnectionsAndUsernamesAction, toggleConnectionsAction } from '../redux/websockets/actions';
import { setAccountsAction, addAccountAction, setAccountStateAction } from '../redux/accounts/actions';
import appConfigData from '../appConfig.json';
import { Network } from 'lucide-react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getAccount } from '../utils/utils';

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

    this.compareAndSendToBackend(prevProps);
  }

  // compares the current props with the previous props, and send to the backend via the websocket when applicable.
  private compareAndSendToBackend(prevProps: WebSocketProps) {
    const { recordToBroadcast, accountStateToBroadcast, analyticsType, addAccountAction } = this.props;

    const sendToBackend = (data: any) => {
      try {
        this.webSocket?.send(JSON.stringify(data)); // JSON.stringify({ action: 'WebsocketGenericReceiver', data })
      } catch (error) {
        toast.error(`Failed to send a message to the websocket server: ${error}`);
      }
    };

    // CRUD: Commands to Create data:
    //-----------------------------------------

    // If this is a new account, send it on the websocket connection:
    if (recordToBroadcast && recordToBroadcast !== prevProps.recordToBroadcast) {
      let record: IBroadcastPayload = recordToBroadcast;
      if (isNewAccount(record)) {
        addAccountAction({ ...record, is_disabled: true, viewed: false, user_id: '' });
        sendToBackend({ command: { type: 'create', params: { account: record } } });
      }
    }

    // CRUD: Commands to Read data:
    //-----------------------------------------

    // read data for a report:
    if (analyticsType && analyticsType !== prevProps.analyticsType) {
      sendToBackend({ command: { type: 'read', params: { analyticsType }, to: 'self' } });
    }

    // CRUD: Commands to Update or Delete data:
    //-----------------------------------------

    // Send account id to be closed, reopened or deleted on the WebSocket connection:
    if (accountStateToBroadcast && accountStateToBroadcast !== prevProps.accountStateToBroadcast) {
      const to = getAccount(this.props.accounts, accountStateToBroadcast.account_id)?.user_id;
      if (!accountStateToBroadcast.is_deleted) {
        // CRUD: Command to Update data:
        sendToBackend({ command: { type: 'update', params: { account: accountStateToBroadcast }, to } });
      } else {
        // CRUD: Command to Delete data:
        sendToBackend({ command: { type: 'delete', params: { account: { account_id: accountStateToBroadcast.account_id } }, to } });
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
        onClick={() => toggleConnectionsAction(!showConnections)}>
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
      const { setIsAdminAction, toggleConnectionsAction } = this.props;
      setIsAdminAction();
      toggleConnectionsAction(true);
    }

    // CRUD: event containing Created data
    if (parsedEventData.dataCreated) {
      this.handleDataCreated(parsedEventData.dataCreated);
    }
    // CRUD: event containing Read data
    else if (parsedEventData.dataRead) {
      if (parsedEventData.dataRead.accounts) {
        this.handleDataRead(parsedEventData.dataRead);
        this.handleIncomingConnectionsAndUsernames(parsedEventData.connectionsAndUsernames);
      } else if (parsedEventData.dataRead.accountsAnalytics) {
        // this.props.setAccountsAnalyticsDataAction(parsedEventData.dataRead.accountsAnalytics);
      }
    }
    // CRUD: event containing Updated data
    else if (parsedEventData.dataUpdated) {
      this.handleDataUpdated(parsedEventData.dataUpdated);
    }
    // CRUD: event containing Deleted data
    else if (parsedEventData.dataDeleted) {
      this.handleDataDeleted(parsedEventData.dataDeleted);
    } else if (parsedEventData.connectionsAndUsernames) {
      this.handleIncomingConnectionsAndUsernames(parsedEventData.connectionsAndUsernames);
    } else if (parsedEventData.pong) {
      this.handleIncomingConnectionsAndUsernames(null); // only updates lastConnectionsTimestamp*
    } else {
      console.warn(eventData.substring(0, 500));
    }
  }

  // CRUD: event containing Created data
  private handleDataCreated(dataCreated: any) {
    const { addAccountAction } = this.props;

    if (dataCreated.account) {
      const newReceivedAccount: IAccount = { ...dataCreated.account };
      addAccountAction({ ...newReceivedAccount, viewed: true });
    }
  }

  // CRUD: event containing Read data
  private handleDataRead(dataRead: any) {
    const { setAccountsAction } = this.props;
    if (dataRead.accounts) setAccountsAction(dataRead.accounts.map((account: IAccount) => ({ ...account, viewed: true })));
  }

  // CRUD: event containing Updated data
  private handleDataUpdated(dataUpdated: any) {
    if (dataUpdated.account) {
      const { setAccountStateAction } = this.props;
      setAccountStateAction(dataUpdated.account);
      toast(`Account ${dataUpdated.account.account_id} is now ${dataUpdated.account.is_disabled ? 'disabled' : 'enabled'}`);
    }
  }

  // CRUD: event containing Deleted data
  private handleDataDeleted(dataDeleted: any) {
    if (dataDeleted.account) {
      const { setAccountStateAction } = this.props;
      setAccountStateAction({
        account_id: dataDeleted.account.account_id,
        is_deleted: true,
        is_disabled: true,
      });
      toast(`Account ${dataDeleted.account.account_id} was deleted.`);
    }
  }

  // Sets the connections and usernames in the state
  private handleIncomingConnectionsAndUsernames(connections: IConnectionAndUsername[] | null) {
    const { setConnectionsAndUsernamesAction, isAdmin, toggleConnectionsAction } = this.props;
    setConnectionsAndUsernamesAction(connections);
    // Show the current connections whenever the backend informs this frontend about a change in the connected users:
    if (connections && isAdmin) toggleConnectionsAction(true);
  }
}

interface WebSocketProps {
  JWT: string | null;
  isAdmin: boolean | null;
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
  accountStateToBroadcast: IAccountState | null;
  recordToBroadcast: IBroadcastPayload | null;
  accounts: IAccount[];
  setAccountsAction: typeof setAccountsAction;
  analyticsType: string | null;
  showAccountTransactionsAction: typeof showAccountTransactionsAction;
  setAccountStateAction: typeof setAccountStateAction;
  addAccountAction: typeof addAccountAction;
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
  isWsConnected: state.websockets.isConnected,
  isAppVisible: state.websockets.isAppVisible,
  connectionsAndUsernames: state.websockets.connectionsAndUsernames,
  showConnections: state.websockets.showConnections,
  lastConnectionsTimestamp: state.websockets.lastConnectionsTimestamp,
  lastConnectionsTimestampISO: state.websockets.lastConnectionsTimestampISO,
  analyticsType: state.mnu.analyticsType,
  recordToBroadcast: state.accounts.recordToBroadcast,
  accountStateToBroadcast: state.accounts.stateToBroadcast,
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
      addAccountAction,
      showAccountTransactionsAction,
      setAccountStateAction,
      setIsAdminAction,
      setAnalyticsTypeAction,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(WebSocketService);
