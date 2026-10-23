import UserService, {
  type StoragePackage,
} from '@/shared/services/User/UserService';
import { Spin } from 'antd';
import { useEffect, useState } from 'react';
import { formatGb } from './Storage';

interface Props {
  currentPackageId?: number;
  onBack: () => void;
}

/** "Nâng cấp tài khoản…" plan list (Figma 10946:59965). */
export function Packages({ currentPackageId, onBack }: Props) {
  const [packages, setPackages] = useState<StoragePackage[]>();
  const [current, setCurrent] = useState(currentPackageId);

  useEffect(() => {
    UserService.fetchStoragePackages()
      .then(setPackages)
      .catch(() => setPackages([]));
    if (current === undefined) {
      UserService.fetchDriveStatistics()
        .then((s) => setCurrent(s.storage.packageId))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="settings-packages">
      <button type="button" className="settings-back" onClick={onBack}>
        ← Trở lại
      </button>
      <h2>Nâng cấp tài khoản để có thêm dung lượng lưu trữ</h2>
      <p className="settings-muted">
        Bạn sẽ nhận thêm dung lượng bộ nhớ và nhiều lợi ích bổ sung
      </p>
      {!packages ? (
        <div className="settings-empty">
          <Spin />
        </div>
      ) : (
        <div className="settings-packages-grid">
          {packages.map((p) => {
            const isCurrent = p.id === current;
            return (
              <div key={p.id} className="settings-package">
                <b>{formatGb(p.storage)}</b>
                <span>
                  {p.price > 0 ? `${p.currency}${p.price}` : 'Miễn phí'}
                </span>
                {isCurrent ? (
                  <button type="button" className="settings-btn" disabled>
                    Gói hiện tại
                  </button>
                ) : (
                  <button
                    type="button"
                    className="settings-btn green"
                    disabled
                    title="Thanh toán nâng cấp dung lượng sẽ có ở bản cập nhật sau"
                  >
                    Sắp có
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="settings-muted small">
        Bằng cách chọn gói dung lượng, bạn đồng ý với Điều khoản dịch vụ và
        Chính sách quyền riêng tư của Vision 20.
      </p>
    </div>
  );
}
