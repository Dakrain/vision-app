import BaseService from '@/shared/network/base.service';
import { API_BASE_URL } from '../../config';

/** A person in my contacts ("Danh bạ" = accepted friends). */
export interface Contact {
  id: number;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
  /** The friendship row id (for answering / removing). */
  friendId?: number;
}

interface FriendRow {
  friend?: { id?: number; status?: number };
  user?: {
    id?: number;
    fullName?: string;
    email?: string;
    avatarUrl?: string;
  };
}

interface FriendPage {
  total: number;
  pageSize: number;
  pageNumber: number;
  rows: FriendRow[];
}

const toContact = (row: FriendRow): Contact | undefined =>
  row.user?.id
    ? {
        id: row.user.id,
        fullName: row.user.fullName,
        email: row.user.email,
        avatarUrl: row.user.avatarUrl,
        friendId: row.friend?.id,
      }
    : undefined;

class FriendService extends BaseService {
  /** All accepted friends (follows the pages). Same source as mobile. */
  async fetchContacts(): Promise<Contact[]> {
    const contacts: Contact[] = [];
    for (let page = 1; page <= 20; page += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res: FriendPage = await this.get('/friend', {
        params: { command: 'list', page_number: page },
      });
      (res.rows ?? []).forEach((row) => {
        const contact = toContact(row);
        if (contact) contacts.push(contact);
      });
      if (!res.rows?.length || page * (res.pageSize || 25) >= res.total) break;
    }
    return contacts;
  }
}

export default new FriendService({ baseURL: API_BASE_URL });
