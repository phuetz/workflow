/** Monday.com Client - GraphQL API v2023-10 */
import type {
  MondayCredentials,
  MondayResponse,
  MondayItem,
  MondayBoard,
  MondayUpdate,
  MondayCreateItemInput,
  MondayUpdateItemInput,
  MondayCreateBoardInput,
} from './monday.types';

export function createMondayClient(credentials: MondayCredentials): MondayClient {
  return new MondayClient(credentials);
}

export class MondayClient {
  private readonly baseUrl = 'https://api.monday.com/v2';
  private readonly apiVersion = '2023-10';

  constructor(private readonly credentials: MondayCredentials) {}

  private async graphql<T = any>(
    query: string,
    variables?: Record<string, any>
  ): Promise<MondayResponse<T>> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.credentials.apiToken,
          'API-Version': this.apiVersion,
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        return {
          ok: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        return {
          ok: false,
          error: result.errors[0].message,
          errors: result.errors,
        };
      }

      return {
        ok: true,
        data: result.data,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async createItem(input: MondayCreateItemInput): Promise<MondayResponse<{ create_item: MondayItem }>> {
    const query = `
      mutation ($boardId: ID!, $groupId: String, $itemName: String!, $columnValues: JSON) {
        create_item(
          board_id: $boardId
          group_id: $groupId
          item_name: $itemName
          column_values: $columnValues
        ) {
          id
          name
          state
          created_at
          updated_at
          column_values {
            id
            title
            type
            value
            text
          }
        }
      }
    `;

    const variables = {
      boardId: input.board_id,
      groupId: input.group_id,
      itemName: input.item_name,
      columnValues: input.column_values ? JSON.stringify(input.column_values) : undefined,
    };

    return this.graphql<{ create_item: MondayItem }>(query, variables);
  }

  async updateItem(input: MondayUpdateItemInput): Promise<MondayResponse<{ change_multiple_column_values: MondayItem }>> {
    const query = `
      mutation ($boardId: ID, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(
          board_id: $boardId
          item_id: $itemId
          column_values: $columnValues
        ) {
          id
          name
          column_values {
            id
            title
            type
            value
            text
          }
        }
      }
    `;

    const variables = {
      boardId: input.board_id,
      itemId: input.item_id,
      columnValues: JSON.stringify(input.column_values || {}),
    };

    return this.graphql<{ change_multiple_column_values: MondayItem }>(query, variables);
  }

  async getItem(itemId: string): Promise<MondayResponse<{ items: MondayItem[] }>> {
    const query = `
      query ($ids: [ID!]) {
        items(ids: $ids) {
          id
          name
          state
          created_at
          updated_at
          board {
            id
            name
          }
          group {
            id
            title
          }
          column_values {
            id
            title
            type
            value
            text
          }
        }
      }
    `;

    return this.graphql<{ items: MondayItem[] }>(query, { ids: [itemId] });
  }

  async deleteItem(itemId: string): Promise<MondayResponse<{ delete_item: { id: string } }>> {
    const query = `
      mutation ($itemId: ID!) {
        delete_item(item_id: $itemId) {
          id
        }
      }
    `;

    return this.graphql<{ delete_item: { id: string } }>(query, { itemId });
  }

  async createBoard(input: MondayCreateBoardInput): Promise<MondayResponse<{ create_board: MondayBoard }>> {
    const query = `
      mutation ($boardName: String!, $boardKind: BoardKind!, $workspaceId: ID, $description: String, $folderId: ID) {
        create_board(
          board_name: $boardName
          board_kind: $boardKind
          workspace_id: $workspaceId
          description: $description
          folder_id: $folderId
        ) {
          id
          name
          description
          board_kind
          state
        }
      }
    `;

    const variables = {
      boardName: input.board_name,
      boardKind: input.board_kind,
      workspaceId: input.workspace_id,
      description: input.description,
      folderId: input.folder_id,
    };

    return this.graphql<{ create_board: MondayBoard }>(query, variables);
  }

  async getBoard(boardId: string): Promise<MondayResponse<{ boards: MondayBoard[] }>> {
    const query = `
      query ($ids: [ID!]) {
        boards(ids: $ids) {
          id
          name
          description
          board_kind
          state
          columns {
            id
            title
            type
            settings_str
          }
          groups {
            id
            title
            color
          }
        }
      }
    `;

    return this.graphql<{ boards: MondayBoard[] }>(query, { ids: [boardId] });
  }

  async createUpdate(itemId: string, body: string): Promise<MondayResponse<{ create_update: MondayUpdate }>> {
    const query = `
      mutation ($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) {
          id
          body
          text_body
          created_at
          creator_id
        }
      }
    `;

    return this.graphql<{ create_update: MondayUpdate }>(query, { itemId, body });
  }

  async getUpdates(itemId: string, limit: number = 25): Promise<MondayResponse<{ items: Array<{ updates: MondayUpdate[] }> }>> {
    const query = `
      query ($ids: [ID!], $limit: Int) {
        items(ids: $ids) {
          updates(limit: $limit) {
            id
            body
            text_body
            created_at
            creator_id
            replies {
              id
              body
              text_body
              created_at
            }
          }
        }
      }
    `;

    return this.graphql<{ items: Array<{ updates: MondayUpdate[] }> }>(query, { ids: [itemId], limit });
  }
}
