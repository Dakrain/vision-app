import { useDispatch } from 'react-redux';
import {
  showLoading as showLoadingAction,
  hideLoading as hideLoadingAction,
} from '@/shared/store/loading/slice';

const useLoading = () => {
  const dispatch = useDispatch();

  const withLoading = async <T>(promise: Promise<T>): Promise<T> => {
    try {
      dispatch(showLoadingAction());
      return await promise;
    } finally {
      dispatch(hideLoadingAction());
    }
  };

  const dispatchWithLoading = (action: any) => {
    dispatch(showLoadingAction());
    return dispatch(action).finally(() => dispatch(hideLoadingAction()));
  };

  const showLoading = () => {
    dispatch(showLoadingAction());
  };

  const hideLoading = () => {
    dispatch(hideLoadingAction());
  };

  return { withLoading, dispatchWithLoading, showLoading, hideLoading };
};

export default useLoading;
