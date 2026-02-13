/** Confluence Types - REST API v2 (Cloud) */

export interface ConfluenceCredentials {
  domain: string; // e.g., "yourcompany.atlassian.net"
  email: string;
  apiToken: string;
}

export type ConfluenceOperation =
  | 'createPage'
  | 'updatePage'
  | 'getPage'
  | 'deletePage'
  | 'searchContent'
  | 'createBlogPost'
  | 'addComment'
  | 'getComments'
  | 'addAttachment'
  | 'getSpaces'
  | 'createSpace';

export interface ConfluenceResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface ConfluencePage {
  id: string;
  type: 'page' | 'blogpost' | 'comment' | 'attachment';
  status: 'current' | 'trashed' | 'deleted' | 'historical' | 'draft';
  title: string;
  spaceId?: string;
  parentId?: string;
  authorId?: string;
  createdAt?: string;
  version?: ConfluenceVersion;
  body?: {
    storage?: { value: string; representation: 'storage' };
    atlas_doc_format?: { value: string; representation: 'atlas_doc_format' };
    view?: { value: string; representation: 'view' };
  };
  _links?: {
    webui?: string;
    editui?: string;
    tinyui?: string;
  };
}

export interface ConfluenceVersion {
  number: number;
  message?: string;
  minorEdit?: boolean;
  authorId?: string;
  createdAt?: string;
}

export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  type: 'global' | 'personal';
  status: 'current' | 'archived';
  description?: {
    plain?: { value: string; representation: 'plain' };
  };
  homepageId?: string;
  icon?: {
    path: string;
    width: number;
    height: number;
    isDefault: boolean;
  };
  authorId?: string;
  createdAt?: string;
  _links?: {
    webui?: string;
  };
}

export interface ConfluenceComment {
  id: string;
  type: 'comment';
  status: string;
  title: string;
  body?: {
    storage?: { value: string; representation: 'storage' };
    view?: { value: string; representation: 'view' };
  };
  version?: ConfluenceVersion;
  authorId?: string;
  createdAt?: string;
}

export interface ConfluenceAttachment {
  id: string;
  type: 'attachment';
  status: string;
  title: string;
  mediaType?: string;
  mediaTypeDescription?: string;
  fileSize?: number;
  webuiLink?: string;
  downloadLink?: string;
  version?: ConfluenceVersion;
  authorId?: string;
  createdAt?: string;
}

export interface ConfluenceSearchResponse {
  results: ConfluencePage[];
  _links?: {
    next?: string;
    base?: string;
  };
}

export interface ConfluenceCreatePageInput {
  spaceId: string;
  status: 'current' | 'draft';
  title: string;
  parentId?: string;
  body: {
    representation: 'storage' | 'atlas_doc_format';
    value: string;
  };
}

export interface ConfluenceUpdatePageInput {
  id: string;
  status: 'current' | 'draft';
  title: string;
  body?: {
    representation: 'storage' | 'atlas_doc_format';
    value: string;
  };
  version: {
    number: number;
    message?: string;
  };
}

export interface ConfluenceCreateSpaceInput {
  key: string;
  name: string;
  description?: {
    plain: {
      value: string;
      representation: 'plain';
    };
  };
}
