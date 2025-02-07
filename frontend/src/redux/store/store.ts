import { configureStore } from '@reduxjs/toolkit';
import { Reducer } from 'redux';
import rootReducer from './reducers';
import initialState from './initialState';

const store = configureStore({
  reducer: rootReducer as Reducer, // as any, temporarily use any to bypass type checking
  preloadedState: initialState as any,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
    }),
});

export type AppDispatch = typeof store.dispatch;

export default store;
