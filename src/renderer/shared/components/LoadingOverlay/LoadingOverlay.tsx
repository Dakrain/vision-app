import { useSelector } from 'react-redux';
import { RootState } from '@/renderer/store/configureStore';
import './LoadingOverlay.scss';

export function LoadingOverlay() {
  const isLoading = useSelector((state: RootState) => state.loading.isLoading);

  if (!isLoading) return null;
  return (
    <div className="loading-overlay">
      <div className="loading-spinner">
        <div className="bounce1" />
        <div className="bounce2" />
        <div className="bounce3" />
      </div>
    </div>
  );
}
