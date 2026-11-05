import { StateType } from './state';

const INITIAL_STATE: StateType = {
  isOffline: false,
  user: undefined,
  userFailures: 0,
  sessionExpired: false,
  error: undefined,
};

export default INITIAL_STATE;
