import React from 'react';
import { bindActionCreators, Dispatch } from 'redux';
import { Provider, connect } from 'react-redux';
import store from './redux/store/store';
import { AppState, IAccount } from './redux/store/types';
import { loginWithGoogleAction, checkAuthStatusAction } from './redux/auth/actions';
import { AuthContextProps, useAuth } from 'react-oidc-context';
import { toggleOverviewAction, showAccountTransactionsAction, setAnalyticsTypeAction } from './redux/mnu/actions';
import { toggleNewAccountFormAction } from './redux/accounts/actions';
import Spinner from './components/Spinner';
import Accounts from './components/Accounts';
import AccountTransactions from './components/AccountTransactions';
// import AccountsAnalytics from './components/AccountsAnalytics';
import WebSocketService from './components/WebSocketService';
import Menu from './components/Menu';
import appConfigData from './appConfig.json';
import { ToastContainer } from 'react-toastify';
import { Plus, Undo2 } from 'lucide-react';
import './App.css';

// Create the base component
class AppComponent extends React.Component<AppProps & { auth: AuthContextProps }> {
  async componentDidMount() {
    const { auth, checkAuthStatusAction } = this.props;
    checkAuthStatusAction(auth);

    setTimeout(() => {
      const { auth, toggleOverviewAction } = this.props;
      if (!auth.isAuthenticated) toggleOverviewAction(true);
    }, 12000);
  }

  render() {
    const {
      menuOpen,
      showOverview,
      toggleOverviewAction,
      showNewAccountForm,
      toggleNewAccountFormAction,
      myBetsOpen,
      showAccountTransactionsAction,
      analyticsType,
      setAnalyticsTypeAction,
      auth,
      isAdmin,
      showConnections,
      accounts,
      loginWithGoogleAction,
    } = this.props;

    return (
      <div className='main-container'>
        <ToastContainer limit={3} pauseOnFocusLoss={false} />

        <div className='header-sticky-container'>
          <div className='header-container'>
            <div className='header-title-container'>
              <div className='header-title' title='AWS/React/WebSockets-based betting application.'>
                SasSyBank
              </div>
              <img src='/favicon.ico' alt='Logo' width='32' height='32' />
              <span className='build'>{appConfigData.BUILD}</span>
              {auth.isAuthenticated && (
                <span
                  className={`active-page-name${isAdmin ? ' admin' : ''}`}
                  onClick={!isAdmin ? () => showAccountTransactionsAction(!myBetsOpen) : undefined}>
                  {myBetsOpen ? 'Account Transactions' : 'Accounts'}
                </span>
              )}
              {auth.isAuthenticated && !showConnections && <WebSocketService />}
            </div>
            {auth.isAuthenticated && showConnections && <WebSocketService />}
            <div className={`menu-container${auth.isAuthenticated ? ' authenticated' : ''}`}>
              {auth.isAuthenticated &&
                (!isAdmin ? (
                  <>
                    <button onClick={() => toggleNewAccountFormAction(!showNewAccountForm)} className='menu-container-item action-button'>
                      <Plus />
                    </button>
                  </>
                ) : (
                  accounts.length === 0 && <Spinner title='Loading accounts...' />
                ))}
              <div className='menu-container-item'>
                <Menu />
              </div>
            </div>
          </div>
        </div>

        {auth.isAuthenticated ? (
          myBetsOpen ? (
            <AccountTransactions />
          ) : analyticsType ? (
            <div className='chart-container'>
              <button onClick={() => setAnalyticsTypeAction(null)} className='action-button'>
                <Undo2 />
              </button>
              {/* <AccountsAnalytics /> */}
            </div>
          ) : (
            <Accounts />
          )
        ) : (
          <div className={`app-overview-container${menuOpen ? ' menu-is-opened' : ''}`}>
            <hr />
            <div className='header2'>
              <p>SaaSyBank is a banking app that allows users to create accounts and perform balance inquiries, deposits, withdrawals, and money transfers.</p>
              <p>
                The app provides <span className='secure-authentication'>secure authentication</span> through Google:{' '}
                <span className='text-link sign-in-from-overview' onClick={() => loginWithGoogleAction(auth)}>
                  Sign In
                </span>
              </p>
            </div>

            <div className={`header2 more ${showOverview ? 'visible' : 'hidden'}`}>
              {!showOverview && (
                <span>
                  <span className='text-link toggle-overview' onClick={() => toggleOverviewAction(!showOverview)}>
                    {`Show ${showOverview ? 'less' : 'more'}`}
                  </span>
                  ...
                </span>
              )}
              <ul>
                <li>The app features two user roles: Bankers who can enable or disable accounts, and Users who can deposit, withdraw, and transfer money.</li>
                <li>The app is designed for scalability, utilizing serverless computing and storage, with global content delivery through CloudFront.</li>
                <li>
                  It offers an intuitive, mobile-first UI/UX, and robust monitoring via AWS CloudWatch, built with AWS services, React, and WebSockets for
                  real-time updates.
                </li>
              </ul>

              <div className='link-container'>
                <a href='http://www.linkedin.com/in/eran-hachmon' target='_blank' rel='noopener noreferrer'>
                  LinkedIn
                </a>
                <a href='https://github.com/erancha' target='_blank' rel='noopener noreferrer'>
                  GitHub
                </a>
              </div>

              <a href='https://lucid.app/publicSegments/view/69c70e24-cb99-4f28-8cf9-59329f1bc55b/image.jpeg' target='_blank' rel='noopener noreferrer'>
                <img src='https://lucid.app/publicSegments/view/69c70e24-cb99-4f28-8cf9-59329f1bc55b/image.jpeg' alt='No User Authenticated' />
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }
}

// Props for the base component
interface AppProps {
  menuOpen: boolean;
  showOverview: boolean;
  toggleOverviewAction: typeof toggleOverviewAction;
  showNewAccountForm: boolean;
  toggleNewAccountFormAction: typeof toggleNewAccountFormAction;
  myBetsOpen: boolean;
  showAccountTransactionsAction: typeof showAccountTransactionsAction;
  checkAuthStatusAction: typeof checkAuthStatusAction;
  loginWithGoogleAction: typeof loginWithGoogleAction;
  showConnections: boolean;
  accounts: IAccount[];
  isAdmin: boolean | null;
  analyticsType: string | null;
  setAnalyticsTypeAction: typeof setAnalyticsTypeAction;
}

// Maps required state from Redux store to component props
const mapStateToProps = (state: AppState) => ({
  menuOpen: state.mnu.menuOpen,
  showOverview: state.mnu.showOverview,
  showNewAccountForm: state.accounts.showNewAccountForm,
  isAdmin: state.auth.isAdmin,
  showConnections: state.websockets.showConnections,
  myBetsOpen: state.mnu.myBetsOpen,
  accounts: state.accounts.accounts,
  analyticsType: state.mnu.analyticsType,
});

// Map Redux actions to component props
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      toggleOverviewAction,
      checkAuthStatusAction,
      toggleNewAccountFormAction,
      showAccountTransactionsAction,
      setAnalyticsTypeAction,
      loginWithGoogleAction,
    },
    dispatch
  );

const ConnectedApp = connect(mapStateToProps, mapDispatchToProps)(AppComponent);

// Create the root component that provides the store
export const App = () => {
  const auth = useAuth();

  // render
  return auth.isLoading ? (
    <Spinner />
  ) : (
    <Provider store={store}>
      <ConnectedApp auth={auth} />
    </Provider>
  );
};

export default App;
