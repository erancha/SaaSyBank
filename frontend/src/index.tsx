import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from 'react-oidc-context';
import appConfigData from './appConfig.json';

const cognitoAuthConfig = {
  authority: `https://cognito-idp.${appConfigData.COGNITO.region}.amazonaws.com/${appConfigData.COGNITO.userPoolId}`,
  client_id: appConfigData.COGNITO.userPoolWebClientId,
  redirect_uri: appConfigData.COGNITO.redirectSignIn,
  response_type: 'code',
  scope: 'email openid phone profile',
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>{' '}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
