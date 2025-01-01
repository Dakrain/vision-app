import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export function useAuth() {
  const { user, error } = useSelector((state: RootState) => state.auth);
  return { user, error };
}
