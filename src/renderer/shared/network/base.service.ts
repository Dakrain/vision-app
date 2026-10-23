import axios, {
  AxiosInstance,
  CreateAxiosDefaults,
  AxiosRequestConfig,
} from 'axios';
import axiosRetry from 'axios-retry';
import { camelizeKeys, decamelizeKeys } from 'humps';
import { appDeviceId } from '../utils/deviceId';

class BaseService {
  private instance: AxiosInstance;

  constructor(config?: CreateAxiosDefaults) {
    this.instance = axios.create({
      // Without a timeout a stalled connection hung the screen forever
      // (and axios-retry never got a chance to retry it).
      timeout: 20000,
      ...config,
      headers: {
        // The API accepts iOS | Android | Windows | MacOs.
        appplatform: navigator.userAgent.includes('Mac') ? 'MacOs' : 'Windows',
        appdeviceid: appDeviceId(),
      },
    });

    axiosRetry(this.instance, {
      retries: 3,
      retryDelay: (retryCount: number) => retryCount * 1000,
    });

    // eslint-disable-next-line @typescript-eslint/no-shadow
    this.instance.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Parse request payload to snake_case
      if (config.data) {
        config.data = decamelizeKeys(config.data);
      }
      return config;
    });

    this.instance.interceptors.response.use(
      (response) => {
        if (
          response.data &&
          response.headers['content-type'].includes('application/json')
        ) {
          response.data = camelizeKeys(response.data);
        }
        return response;
      },
      (error) => {
        // AxiosError.toJSON() drops the response body; keep it so callers
        // can read the API error code (e.g. `e_livestream_capacity_full`).
        return Promise.reject(
          JSON.stringify({
            ...(error?.toJSON?.() ?? {}),
            response: error?.response
              ? { status: error.response.status, data: error.response.data }
              : undefined,
          }),
        );
      },
    );
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  public async post<T>(
    url: string,
    data: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  public async put<T>(
    url: string,
    data: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  public async patch<T>(
    url: string,
    data: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }
}

export default BaseService;
