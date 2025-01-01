import { AppError } from '@/shared/network/response';
import { User } from '@/renderer/shared/types';

export type StateType = {
  isOffline: boolean;
  user?: User;
  error?: AppError;
};
