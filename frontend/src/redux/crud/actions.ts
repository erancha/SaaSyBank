import {
  PREPARE_CREATE_COMMAND,
  PREPARE_READ_COMMAND,
  PREPARE_UPDATE_COMMAND,
  PREPARE_DELETE_COMMAND,
  ICreateCommand,
  IReadCommand,
  IUpdateCommand,
  IDeleteCommand,
  IPrepareCreateCommandAction,
  IPrepareReadCommandAction,
  IPrepareUpdateCommandAction,
  IPrepareDeleteCommandAction,
} from './types';

// Generic CRUD action creators
export const prepareCreateCommandAction = (payload: ICreateCommand): IPrepareCreateCommandAction => ({
  type: PREPARE_CREATE_COMMAND,
  payload,
});

export const prepareReadCommandAction = (payload: IReadCommand): IPrepareReadCommandAction => ({
  type: PREPARE_READ_COMMAND,
  payload,
});

export const prepareUpdateCommandAction = (payload: IUpdateCommand): IPrepareUpdateCommandAction => ({
  type: PREPARE_UPDATE_COMMAND,
  payload,
});

export const prepareDeleteCommandAction = (payload: IDeleteCommand): IPrepareDeleteCommandAction => ({
  type: PREPARE_DELETE_COMMAND,
  payload,
});
