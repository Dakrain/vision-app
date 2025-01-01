import BaseService from '@/shared/network/base.service';
import { User } from '@/renderer/shared/types';
import { LoginRequest } from './request';

class AuthService extends BaseService {
  async login(request: LoginRequest): Promise<User> {
    return this.post('/user/login', request);
  }

  async fetchUser(userId: string): Promise<User> {
    return this.get(`/user/${userId}`);
  }
}

const authService = new AuthService({
  baseURL: 'https://api.vision20.us/v1',
});

export default authService;
