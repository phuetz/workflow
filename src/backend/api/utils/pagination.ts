import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  links: {
    self: string;
    first: string;
    last: string;
    next: string | null;
    prev: string | null;
  };
}

export function parsePaginationParams(req: Request, defaults = { page: 1, limit: 20 }): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || defaults.page);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || defaults.limit));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
  basePath: string
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);
  const hasNext = params.page < totalPages;
  const hasPrev = params.page > 1;

  const buildUrl = (page: number) => `${basePath}?page=${page}&limit=${params.limit}`;

  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext,
      hasPrev
    },
    links: {
      self: buildUrl(params.page),
      first: buildUrl(1),
      last: buildUrl(totalPages),
      next: hasNext ? buildUrl(params.page + 1) : null,
      prev: hasPrev ? buildUrl(params.page - 1) : null
    }
  };
}

// Prisma-compatible pagination
export function toPrismaArgs(params: PaginationParams) {
  return {
    skip: params.offset,
    take: params.limit
  };
}
