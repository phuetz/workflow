/** Figma Client - REST API v1 */
import type {
  FigmaCredentials,
  FigmaResponse,
  FigmaFile,
  FigmaComment,
  FigmaUser,
  FigmaProject,
  FigmaProjectFile,
  FigmaVersion,
  FigmaImagesResponse,
  FigmaNode,
} from './figma.types';

export function createFigmaClient(credentials: FigmaCredentials): FigmaClient {
  return new FigmaClient(credentials);
}

export class FigmaClient {
  private readonly baseUrl = 'https://api.figma.com/v1';

  constructor(private readonly credentials: FigmaCredentials) {}

  private async apiCall<T = any>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<FigmaResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'X-Figma-Token': this.credentials.accessToken,
      };

      if (body) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          ok: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();
      return {
        ok: true,
        data,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getFile(
    fileKey: string,
    options?: {
      version?: string;
      ids?: string[];
      depth?: number;
      geometry?: 'paths';
      plugin_data?: string;
      branch_data?: boolean;
    }
  ): Promise<FigmaResponse<FigmaFile>> {
    const params = new URLSearchParams();
    if (options?.version) params.append('version', options.version);
    if (options?.ids && options.ids.length > 0) params.append('ids', options.ids.join(','));
    if (options?.depth) params.append('depth', String(options.depth));
    if (options?.geometry) params.append('geometry', options.geometry);
    if (options?.plugin_data) params.append('plugin_data', options.plugin_data);
    if (options?.branch_data) params.append('branch_data', 'true');

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.apiCall<FigmaFile>(`/files/${fileKey}${query}`);
  }

  async getFileNodes(
    fileKey: string,
    nodeIds: string[],
    options?: {
      version?: string;
      depth?: number;
      geometry?: 'paths';
      plugin_data?: string;
    }
  ): Promise<FigmaResponse<{ nodes: Record<string, { document: FigmaNode }> }>> {
    const params = new URLSearchParams();
    params.append('ids', nodeIds.join(','));
    if (options?.version) params.append('version', options.version);
    if (options?.depth) params.append('depth', String(options.depth));
    if (options?.geometry) params.append('geometry', options.geometry);
    if (options?.plugin_data) params.append('plugin_data', options.plugin_data);

    return this.apiCall<{ nodes: Record<string, { document: FigmaNode }> }>(
      `/files/${fileKey}/nodes?${params.toString()}`
    );
  }

  async getImages(
    fileKey: string,
    nodeIds: string[],
    options?: {
      scale?: number;
      format?: 'jpg' | 'png' | 'svg' | 'pdf';
      svg_include_id?: boolean;
      svg_simplify_stroke?: boolean;
      use_absolute_bounds?: boolean;
      version?: string;
    }
  ): Promise<FigmaResponse<FigmaImagesResponse>> {
    const params = new URLSearchParams();
    params.append('ids', nodeIds.join(','));
    if (options?.scale) params.append('scale', String(options.scale));
    if (options?.format) params.append('format', options.format);
    if (options?.svg_include_id) params.append('svg_include_id', 'true');
    if (options?.svg_simplify_stroke) params.append('svg_simplify_stroke', 'true');
    if (options?.use_absolute_bounds) params.append('use_absolute_bounds', 'true');
    if (options?.version) params.append('version', options.version);

    return this.apiCall<FigmaImagesResponse>(`/images/${fileKey}?${params.toString()}`);
  }

  async getComments(fileKey: string): Promise<FigmaResponse<{ comments: FigmaComment[] }>> {
    return this.apiCall<{ comments: FigmaComment[] }>(`/files/${fileKey}/comments`);
  }

  async postComment(
    fileKey: string,
    message: string,
    clientMeta?: {
      x?: number;
      y?: number;
      node_id?: string;
      node_offset?: { x: number; y: number };
    },
    commentId?: string
  ): Promise<FigmaResponse<FigmaComment>> {
    const body: any = { message };
    if (clientMeta) body.client_meta = clientMeta;
    if (commentId) body.comment_id = commentId;

    return this.apiCall<FigmaComment>(`/files/${fileKey}/comments`, 'POST', body);
  }

  async getUser(): Promise<FigmaResponse<FigmaUser>> {
    return this.apiCall<FigmaUser>('/me');
  }

  async getVersions(fileKey: string): Promise<FigmaResponse<{ versions: FigmaVersion[] }>> {
    return this.apiCall<{ versions: FigmaVersion[] }>(`/files/${fileKey}/versions`);
  }

  async getTeamProjects(teamId: string): Promise<FigmaResponse<{ projects: FigmaProject[] }>> {
    return this.apiCall<{ projects: FigmaProject[] }>(`/teams/${teamId}/projects`);
  }

  async getProjectFiles(projectId: string): Promise<FigmaResponse<{ files: FigmaProjectFile[] }>> {
    return this.apiCall<{ files: FigmaProjectFile[] }>(`/projects/${projectId}/files`);
  }

  async getTeamComponents(
    teamId: string,
    pageSize?: number,
    cursor?: string
  ): Promise<FigmaResponse<{ meta: any; components: any[] }>> {
    const params = new URLSearchParams();
    if (pageSize) params.append('page_size', String(pageSize));
    if (cursor) params.append('cursor', cursor);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.apiCall<{ meta: any; components: any[] }>(`/teams/${teamId}/components${query}`);
  }

  async getTeamStyles(
    teamId: string,
    pageSize?: number,
    cursor?: string
  ): Promise<FigmaResponse<{ meta: any; styles: any[] }>> {
    const params = new URLSearchParams();
    if (pageSize) params.append('page_size', String(pageSize));
    if (cursor) params.append('cursor', cursor);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.apiCall<{ meta: any; styles: any[] }>(`/teams/${teamId}/styles${query}`);
  }
}
