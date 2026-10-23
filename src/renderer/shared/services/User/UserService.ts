import BaseService from '@/shared/network/base.service';
import type { User } from '@/shared/types/user';
import { API_BASE_URL } from '../../config';

export interface ProfileUpdate {
  firstName: string;
  lastName: string;
  email: string;
  /** Unix seconds. */
  birthday: number;
  gender?: number;
  phone?: string;
  phoneCode?: string;
  countryId?: number;
  prefectureId?: number;
  religion?: string;
  position?: string;
  forte?: string;
  /** Media id from the media server (new avatar). */
  avatar?: number;
}

export interface Country {
  id: number;
  countryCode: string;
  countryName: string;
  phoneCode: number;
  flag?: string;
}

export interface Prefecture {
  id: number;
  name: string;
  level: number;
  countryId: number;
}

export interface DriveStatistics {
  storage: {
    packageId: number;
    packageName: string;
    storageLimit: number;
    storageUsed: number;
    storageRemain: number;
  };
  folders: { id: string; name: string; storageUsed: number }[];
}

export interface StoragePackage {
  id: number;
  name: string;
  /** Bytes. */
  storage: number;
  price: number;
  isDefault: number;
  currency: string;
}

/** My account: profile, password and storage (Settings screen). */
class UserService extends BaseService {
  updateProfile(userId: number, body: ProfileUpdate): Promise<User> {
    return this.put(`/user/${userId}`, body);
  }

  /** Fields only PATCH takes: job ("Nghề nghiệp") and hobby ("Sở thích"). */
  patchProfile(
    userId: number,
    body: { job?: string; hobby?: string },
  ): Promise<User> {
    return this.patch(`/user/${userId}`, body);
  }

  changePassword(
    userId: number,
    body: {
      currentPassword: string;
      password: string;
      confirmPassword: string;
    },
  ): Promise<{ status: boolean }> {
    return this.put(`/user/${userId}/password`, body);
  }

  async fetchCountries(): Promise<Country[]> {
    const res: { rows?: Country[] } = await this.get('/country');
    return res.rows ?? [];
  }

  /** Cities / provinces (level 1) of a country. */
  async fetchCities(countryCode: string): Promise<Prefecture[]> {
    const res: { rows?: Prefecture[] } = await this.get('/prefecture', {
      params: { country_code: countryCode },
    });
    return (res.rows ?? []).filter((p) => p.level === 1);
  }

  fetchDriveStatistics(): Promise<DriveStatistics> {
    return this.get('/drive/statistics');
  }

  async fetchStoragePackages(): Promise<StoragePackage[]> {
    const res: { rows?: StoragePackage[] } = await this.get(
      '/drive/storage_packages',
    );
    return res.rows ?? [];
  }

  logout(): Promise<unknown> {
    return this.post('/user/logout', {});
  }
}

export default new UserService({ baseURL: API_BASE_URL });
