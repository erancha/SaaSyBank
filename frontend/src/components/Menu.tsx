import React from 'react';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { AppState } from '../redux/store/types';
// import { ANALYTICS_REPORT } from '../redux/store/constants';
import { toggleMenuAction, setAnchorElAction, setAnalyticsTypeAction } from '../redux/mnu/actions';
import { loginWithGoogleAction, checkAuthStatusAction, logoutUserAction } from '../redux/auth/actions';
import { Button, Menu as MuiMenu, MenuItem, Typography, ListItemIcon } from '@mui/material';
import { UserCircle, LogIn, ChartNoAxesCombined } from 'lucide-react';
import { AuthContextProps, useAuth } from 'react-oidc-context';

// Wraps the connected menu component with auth context
const MenuWrapper = (props: MenuProps) => {
  const auth = useAuth();
  return <ConnectedMenu {...props} auth={auth} />;
};

class ConnectedMenu extends React.Component<MenuProps & { auth: AuthContextProps }> {
  private buttonRef = React.createRef<HTMLButtonElement>();

  // Updates auth status check when authentication state changes
  componentDidUpdate(prevProps: MenuProps) {
    const { isAuthenticated, checkAuthStatusAction, auth } = this.props;

    if (prevProps.isAuthenticated !== isAuthenticated) checkAuthStatusAction(auth);
  }

  // Handles main menu button click event
  handleMenuTriggerClick = (event: React.MouseEvent<HTMLElement>) => {
    const { menuOpen, toggleMenuAction, setAnchorElAction } = this.props;
    toggleMenuAction(!menuOpen);
    setAnchorElAction(event.currentTarget);
  };

  // Closes all menus and resets anchor elements
  handleMenuClose = () => {
    const { toggleMenuAction, setAnchorElAction } = this.props;
    toggleMenuAction(false);
    setAnchorElAction(null);
  };

  // Opens categories submenu and hides my bets
  handleOpenCategories = (event: React.MouseEvent<HTMLElement>) => {
    const { setAnalyticsTypeAction } = this.props;
    setAnalyticsTypeAction(null);
  };

  // Renders the complete menu UI with all submenus and authentication options
  render() {
    const { auth, menuOpen, anchorEl, loginWithGoogleAction, logoutUserAction, isAuthenticated, isAdmin } = this.props;

    return (
      <div className='menu-trigger'>
        <Button
          ref={this.buttonRef}
          aria-controls={menuOpen ? 'menu' : undefined}
          aria-haspopup='true'
          aria-expanded={menuOpen ? 'true' : undefined}
          onClick={this.handleMenuTriggerClick}>
          <div className='icon' title={isAuthenticated ? auth.user?.profile.name : ''}>
            <div className='icon-line'></div>
            <div className='icon-line'></div>
            <div className='icon-line'></div>
          </div>
        </Button>
        <MuiMenu anchorEl={anchorEl ? anchorEl : this.buttonRef.current} open={menuOpen} onClose={this.handleMenuClose}>
          <div className='menu-content-inner'>
            {isAuthenticated && (
              <>
                <Typography variant='subtitle2' className='user-details'>
                  {auth.user?.profile.name} : {auth.user?.profile.email}
                </Typography>

                <hr />
                {isAdmin && (
                  <MenuItem
                    onClick={() => {
                      // setAnalyticsTypeAction(analyticsType ? null : ANALYTICS_REPORT);
                      this.handleMenuClose();
                    }}>
                    <ListItemIcon>
                      <ChartNoAxesCombined />
                    </ListItemIcon>
                    Accounts Analytics
                  </MenuItem>
                )}
              </>
            )}
            <div>
              {isAuthenticated ? (
                <MenuItem
                  onClick={() => {
                    logoutUserAction(auth);
                    this.handleMenuClose();
                  }}>
                  <ListItemIcon>
                    <UserCircle />
                  </ListItemIcon>
                  Sign Out
                </MenuItem>
              ) : (
                <>
                  <MenuItem
                    onClick={() => {
                      loginWithGoogleAction(auth);
                      this.handleMenuClose();
                    }}>
                    <ListItemIcon>
                      <UserCircle />
                      <LogIn />
                    </ListItemIcon>
                    Sign In with Google
                  </MenuItem>
                </>
              )}
            </div>
          </div>
        </MuiMenu>
      </div>
    );
  }
}

interface MenuProps {
  showOverview: boolean;
  menuOpen: boolean;
  toggleMenuAction: typeof toggleMenuAction;
  analyticsType: string | null;
  setAnalyticsTypeAction: typeof setAnalyticsTypeAction;
  isAuthenticated: boolean;
  isAdmin: boolean | null;
  anchorEl: HTMLElement | null;
  setAnchorElAction: typeof setAnchorElAction;
  loginWithGoogleAction: typeof loginWithGoogleAction;
  checkAuthStatusAction: typeof checkAuthStatusAction;
  logoutUserAction: typeof logoutUserAction;
}

// Maps required state from Redux store to component props
const mapStateToProps = (state: AppState) => ({
  showOverview: state.mnu.showOverview,
  menuOpen: state.mnu.menuOpen,
  anchorEl: state.mnu.anchorEl,
  isAuthenticated: state.auth.isAuthenticated,
  isAdmin: state.auth.isAdmin,
  analyticsType: state.mnu.analyticsType,
});

// Map Redux actions to component props
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      toggleMenuAction,
      setAnchorElAction,
      loginWithGoogleAction,
      checkAuthStatusAction,
      logoutUserAction,
      setAnalyticsTypeAction,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(MenuWrapper);
