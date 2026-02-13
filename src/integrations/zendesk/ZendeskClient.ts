/** Zendesk Client */
import type { ZendeskCredentials, ZendeskResponse, ZendeskTicket } from './zendesk.types';
export function createZendeskClient(c: ZendeskCredentials) { return new ZendeskClient(c); }
export class ZendeskClient {
  private url: string;
  constructor(private c: ZendeskCredentials) { this.url = `https://${c.subdomain}.zendesk.com/api/v2`; }
  private async api<T>(e: string, m: string = 'GET', b?: any): Promise<ZendeskResponse<T>> {
    try {
      const r = await fetch(`${this.url}${e}`, { method: m, headers: { 'Authorization': 'Basic ' + btoa(`${this.c.email}/token:${this.c.apiToken}`), 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
      if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
      return { ok: true, data: await r.json() };
    } catch (e) { return { ok: false, error: String(e) }; }
  }
  async createTicket(t: Partial<ZendeskTicket>): Promise<ZendeskResponse<{ ticket: ZendeskTicket }>> { return this.api('/tickets', 'POST', { ticket: t }); }
  async updateTicket(id: number, u: Partial<ZendeskTicket>): Promise<ZendeskResponse<{ ticket: ZendeskTicket }>> { return this.api(`/tickets/${id}`, 'PUT', { ticket: u }); }
  async getTicket(id: number): Promise<ZendeskResponse<{ ticket: ZendeskTicket }>> { return this.api(`/tickets/${id}`); }
}
