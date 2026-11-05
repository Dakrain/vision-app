import { AppError } from '@/shared/network/response';
import { User } from '@/renderer/shared/types';

export type StateType = {
  isOffline: boolean;
  user?: User;
  /** Failed attempts to load the user since the last success. */
  userFailures: number;
  /** The API refused the saved token (401): back to login. */
  sessionExpired: boolean;
  error?: AppError;
};
