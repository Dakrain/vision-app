import { ChatChannels } from './chat';
import { Drive } from './drive';

export type User = {
  id?: number;
  identifier?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  avatar?: number;
  gender?: number;
  birthday?: number;
  organization?: string;
  position?: string;
  avatarUrl?: string;
  phoneCode?: string;
  accessToken?: string;
  countryId?: number;
  prefectureId?: number;
  forte?: string;
  religion?: string;
  job?: string;
  chat?: ChatChannels;
  drive?: Drive;
  countryName?: string;
  prefectureName?: string;
};
