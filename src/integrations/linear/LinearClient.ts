/** Linear API Client - GraphQL */
import type { LinearCredentials, LinearResponse, LinearIssue } from './linear.types';

export function createLinearClient(creds: LinearCredentials) { return new LinearClient(creds); }

export class LinearClient {
  private url = 'https://api.linear.app/graphql';
  constructor(private creds: LinearCredentials) {}

  private async graphql<T>(query: string, variables?: any): Promise<LinearResponse<T>> {
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Authorization': this.creds.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const data = await res.json();
      if (data.errors) return { ok: false, error: data.errors[0].message };
      return { ok: true, data: data.data };
    } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Error' }; }
  }

  async createIssue(input: { title: string; description?: string; teamId?: string; assigneeId?: string; priority?: number }): Promise<LinearResponse<{ issueCreate: { success: boolean; issue: LinearIssue } }>> {
    return this.graphql(`mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier title description priority state { name color } } } }`, { input: { ...input, teamId: input.teamId || this.creds.teamId } });
  }

  async updateIssue(id: string, input: Partial<LinearIssue>): Promise<LinearResponse<any>> {
    return this.graphql(`mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }`, { id, input });
  }

  async getIssue(id: string): Promise<LinearResponse<{ issue: LinearIssue }>> {
    return this.graphql(`query($id: String!) { issue(id: $id) { id identifier title description priority state { name } assignee { name email } url } }`, { id });
  }

  async searchIssues(filter: any): Promise<LinearResponse<{ issues: { nodes: LinearIssue[] } }>> {
    return this.graphql(`query($filter: IssueFilter) { issues(filter: $filter) { nodes { id identifier title state { name } assignee { name } } } }`, { filter });
  }
}
