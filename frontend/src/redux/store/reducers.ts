import { combineReducers } from 'redux';
import { mnuReducers } from '../mnu/reducers';
import { authReducers } from '../auth/reducers';
import { websocketsReducers } from '../websockets/reducers';
import { accountsReducers } from '../accounts/reducers';
import { transactionsReducers } from '../transactions/reducers';

const rootReducer = combineReducers({
  mnu: mnuReducers,
  auth: authReducers,
  websockets: websocketsReducers,
  accounts: accountsReducers,
  transactions: transactionsReducers,
});

export default rootReducer;
