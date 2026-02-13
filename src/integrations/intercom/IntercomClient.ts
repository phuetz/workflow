/** Intercom Client */
import type { IntercomCredentials, IntercomResponse, IntercomContact } from './intercom.types';
export function createIntercomClient(c: IntercomCredentials) { return new IntercomClient(c); }
export class IntercomClient {
  private url = 'https://api.intercom.io';
  constructor(private c: IntercomCredentials) {}
  private async api<T>(e: string, m: string = 'GET', b?: any): Promise<IntercomResponse<T>> {
    try {
      const r = await fetch(`${this.url}${e}`, { method: m, headers: { 'Authorization': `Bearer ${this.c.accessToken}`, 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
      if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
      return { ok: true, data: await r.json() };
    } catch (e) { return { ok: false, error: String(e) }; }
  }
  async createContact(c: IntercomContact): Promise<IntercomResponse<IntercomContact>> { return this.api('/contacts', 'POST', c); }
  async updateContact(id: string, u: Partial<IntercomContact>): Promise<IntercomResponse<IntercomContact>> { return this.api(`/contacts/${id}`, 'PUT', u); }
}
