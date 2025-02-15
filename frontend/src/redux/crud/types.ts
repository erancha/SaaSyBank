// Generic CRUD command types
export type CommandType = 'accounts' | 'transactions' | 'analytics';

// Base command interface
export interface IBaseCommand<T = any, P = any> {
  type: T;
  params: P;
}

// Generic CRUD commands
export interface ICreateCommand<P = any> extends IBaseCommand<CommandType, P> {}
export interface IReadCommand<P = any> extends IBaseCommand<CommandType, P> {}
export interface IUpdateCommand<P = any> extends IBaseCommand<CommandType, P> {}
export interface IDeleteCommand<P = any> extends IBaseCommand<CommandType, P> {}

// Generic action types
export const PREPARE_CREATE_COMMAND = 'PREPARE_CREATE_COMMAND';
export const PREPARE_READ_COMMAND = 'PREPARE_READ_COMMAND';
export const PREPARE_UPDATE_COMMAND = 'PREPARE_UPDATE_COMMAND';
export const PREPARE_DELETE_COMMAND = 'PREPARE_DELETE_COMMAND';

// Generic action interfaces
export interface IPrepareCreateCommandAction<P = any> {
  type: typeof PREPARE_CREATE_COMMAND;
  payload: ICreateCommand<P>;
}

export interface IPrepareReadCommandAction<P = any> {
  type: typeof PREPARE_READ_COMMAND;
  payload: IReadCommand<P>;
}

export interface IPrepareUpdateCommandAction<P = any> {
  type: typeof PREPARE_UPDATE_COMMAND;
  payload: IUpdateCommand<P>;
}

export interface IPrepareDeleteCommandAction<P = any> {
  type: typeof PREPARE_DELETE_COMMAND;
  payload: IDeleteCommand<P>;
}

export type CrudActionTypes<P = any> =
  | IPrepareCreateCommandAction<P>
  | IPrepareReadCommandAction<P>
  | IPrepareUpdateCommandAction<P>
  | IPrepareDeleteCommandAction<P>;

// Generic state interface
export interface CrudState<P = any> {
  createCommand: ICreateCommand<P> | null;
  readCommand: IReadCommand<P> | null;
  updateCommand: IUpdateCommand<P> | null;
  deleteCommand: IDeleteCommand<P> | null;
}
