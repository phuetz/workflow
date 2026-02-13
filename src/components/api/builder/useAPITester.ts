import { useState, useCallback } from 'react';
import { APIEndpoint } from '../../../services/APIBuilderService';
import { apiBuilderService } from '../../../services/APIBuilderService';
import { logger } from '../../../services/SimpleLogger';
import { TestRequest, TestResponse } from './types';

const DANGEROUS_HEADERS = ['host', 'connection', 'content-length', 'transfer-encoding'];

export function useAPITester() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [testRequest, setTestRequest] = useState<TestRequest>({
    headers: '{}',
    query: '{}',
    body: '{}'
  });
  const [testResponse, setTestResponse] = useState<TestResponse | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);

  const validateHeaders = useCallback((headersStr: string): Record<string, string> => {
    if (!headersStr || !headersStr.trim() || headersStr.trim() === '{}') {
      return {};
    }

    if (headersStr.length > 5000) {
      throw new Error('Headers JSON too large (max 5KB)');
    }

    const headers = JSON.parse(headersStr);

    if (typeof headers !== 'object' || Array.isArray(headers)) {
      throw new Error('Headers must be a JSON object');
    }

    for (const header of Object.keys(headers)) {
      if (DANGEROUS_HEADERS.includes(header.toLowerCase())) {
        throw new Error(`Header '${header}' is not allowed for security reasons`);
      }
      if (typeof headers[header] !== 'string' || headers[header].length > 1000) {
        throw new Error(`Invalid header value for '${header}'`);
      }
      if (/[\r\n]/.test(headers[header])) {
        throw new Error(`Header '${header}' contains invalid characters`);
      }
    }

    return headers;
  }, []);

  const validateQuery = useCallback((queryStr: string): Record<string, unknown> => {
    if (!queryStr || !queryStr.trim() || queryStr.trim() === '{}') {
      return {};
    }

    if (queryStr.length > 2000) {
      throw new Error('Query JSON too large (max 2KB)');
    }

    const query = JSON.parse(queryStr);

    if (typeof query !== 'object' || Array.isArray(query)) {
      throw new Error('Query parameters must be a JSON object');
    }

    for (const [key, value] of Object.entries(query)) {
      if (key.length > 100) {
        throw new Error(`Query parameter name '${key}' is too long`);
      }
      if (typeof value === 'string' && value.length > 1000) {
        throw new Error(`Query parameter '${key}' value is too long`);
      }
      if (typeof value === 'string' && (/[<>"'&]/.test(value) || value.includes('..'))) {
        logger.warn(`Potentially dangerous characters in query parameter '${key}': ${value}`);
      }
    }

    return query;
  }, []);

  const validateBody = useCallback((bodyStr: string): unknown => {
    if (!bodyStr || !bodyStr.trim() || bodyStr.trim() === '{}') {
      return {};
    }

    if (bodyStr.length > 10000) {
      throw new Error('Request body too large (max 10KB)');
    }

    const body = JSON.parse(bodyStr);

    const validateObject = (obj: unknown, path = '', depth = 0): void => {
      if (depth > 10) {
        throw new Error(`Request body nested too deeply at '${path}'`);
      }

      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          if (obj.length > 1000) {
            throw new Error(`Array at '${path}' too large (max 1000 items)`);
          }
          obj.forEach((item, index) => validateObject(item, `${path}[${index}]`, depth + 1));
        } else {
          const keys = Object.keys(obj);
          if (keys.length > 100) {
            throw new Error(`Object at '${path}' has too many properties (max 100)`);
          }
          for (const key of keys) {
            if (key.length > 100) {
              throw new Error(`Property name '${key}' at '${path}' is too long`);
            }
            validateObject((obj as Record<string, unknown>)[key], path ? `${path}.${key}` : key, depth + 1);
          }
        }
      } else if (typeof obj === 'string') {
        if (obj.length > 10000) {
          throw new Error(`String value at '${path}' is too long (max 10KB)`);
        }
        if (/<script|javascript:|data:|vbscript:|on\w+=/i.test(obj)) {
          throw new Error(`Potentially dangerous content detected at '${path}'`);
        }
      }
    };

    validateObject(body);
    return body;
  }, []);

  const runTest = useCallback(async () => {
    if (!selectedEndpoint) return;

    setIsTestRunning(true);
    try {
      let headers: Record<string, string> = {};
      let query: Record<string, unknown> = {};
      let body: unknown = {};

      try {
        headers = validateHeaders(testRequest.headers);
      } catch (e: unknown) {
        throw new Error(`Invalid headers: ${(e as Error).message}`);
      }

      try {
        query = validateQuery(testRequest.query);
      } catch (e: unknown) {
        throw new Error(`Invalid query parameters: ${(e as Error).message}`);
      }

      try {
        body = validateBody(testRequest.body);
      } catch (e: unknown) {
        throw new Error(`Invalid request body: ${(e as Error).message}`);
      }

      if (!selectedEndpoint.enabled) {
        throw new Error('Cannot test disabled endpoint');
      }

      // Rate limiting for test requests
      const testKey = `api-test-last-${selectedEndpoint.id}`;
      const lastTest = localStorage.getItem(testKey);
      const now = Date.now();
      if (lastTest && now - parseInt(lastTest) < 1000) {
        throw new Error('Please wait before testing again (rate limited)');
      }
      localStorage.setItem(testKey, now.toString());

      const result: TestResponse = await Promise.race([
        apiBuilderService.executeEndpoint(selectedEndpoint.id, {
          method: selectedEndpoint.method,
          headers,
          query,
          body,
          ip: '127.0.0.1',
          userAgent: 'API Builder Test Client'
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout (30s)')), 30000)
        )
      ]);

      const sanitizedResult = {
        ...result,
        body: typeof result.body === 'string' && result.body.length > 50000
          ? result.body.substring(0, 50000) + '... (truncated)'
          : result.body
      };

      setTestResponse(sanitizedResult);
    } catch (error: unknown) {
      const err = error as Error;
      const errorMessage = err.message && err.message.length > 500
        ? err.message.substring(0, 500) + '...'
        : err.message;

      setTestResponse({
        error: errorMessage.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_REDACTED]'),
        status: 500,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsTestRunning(false);
    }
  }, [selectedEndpoint, testRequest, validateHeaders, validateQuery, validateBody]);

  const updateTestRequest = useCallback((field: keyof TestRequest, value: string) => {
    setTestRequest(prev => ({ ...prev, [field]: value }));
  }, []);

  return {
    selectedEndpoint,
    setSelectedEndpoint,
    testRequest,
    testResponse,
    isTestRunning,
    updateTestRequest,
    runTest
  };
}
