import { EventEmitter } from 'events';
// import * as fs from 'fs/promises';
// import * as path from 'path';
import axios, { AxiosInstance } from 'axios';
import { GraphQLClient } from 'graphql-request';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as WebSocket from 'ws';
import * as mqtt from 'mqtt';

export interface APIClientConfig {
  type: 'rest' | 'graphql' | 'grpc' | 'websocket' | 'mqtt';
  name: string;
  baseUrl: string;
  authentication?: {
    type: 'apiKey' | 'oauth2' | 'jwt' | 'basic' | 'certificate';
    credentials?: unknown;
  };
  options?: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
    rateLimit?: {
      requests: number;
      duration: number;
    };
    interceptors?: {
      request?: (config: unknown) => unknown;
      response?: (response: unknown) => unknown;
      error?: (error: unknown) => unknown;
    };
  };
}

export interface APIMethod {
  name: string;
  path?: string;
  method?: string;
  query?: string;
  service?: string;
  parameters?: unknown[];
  returns?: unknown;
  description?: string;
}

export interface ClientLibrary {
  language: string;
  version: string;
  dependencies: Record<string, string>;
  files: Map<string, string>;
}

export class APIClientGenerator extends EventEmitter {
  private clients: Map<string, unknown> = new Map();
  private libraries: Map<string, ClientLibrary> = new Map();

  constructor() {
    super();
  }

  // REST API Client
  public createRESTClient(config: APIClientConfig): AxiosInstance {
    const client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.options?.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Setup authentication
    this.setupAuthentication(client, config.authentication);

    // Setup interceptors
    if (config.options?.interceptors) {
      if (config.options.interceptors.request) {
        client.interceptors.request.use(config.options.interceptors.request);
      }
      if (config.options.interceptors.response) {
        client.interceptors.response.use(config.options.interceptors.response);
      }
      if (config.options.interceptors.error) {
        client.interceptors.response.use(undefined, config.options.interceptors.error);
      }
    }

    // Add retry logic
    if (config.options?.retries) {
      this.addRetryInterceptor(client, config.options.retries, config.options.retryDelay);
    }

    // Add rate limiting
    if (config.options?.rateLimit) {
      this.addRateLimitInterceptor(client, config.options.rateLimit);
    }

    this.clients.set(config.name, client);
    this.emit('client:created', { type: 'rest', name: config.name });
    
    return client;
  }

  // GraphQL Client
  public createGraphQLClient(config: APIClientConfig): GraphQLClient {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Setup authentication headers
    if (config.authentication) {
      switch (config.authentication.type) {
        case 'apiKey':
          headers['X-API-Key'] = config.authentication.credentials.apiKey;
          break;
        case 'jwt':
          headers['Authorization'] = `Bearer ${config.authentication.credentials.token}`;
          break;
        case 'basic': {
          const auth = Buffer.from(
            `${config.authentication.credentials.username}:${config.authentication.credentials.password}`
          ).toString('base64');
          headers['Authorization'] = `Basic ${auth}`;
          break;
        }
      }
    }

    const client = new GraphQLClient(config.baseUrl, {
      headers,
      timeout: config.options?.timeout || 30000
    });

    this.clients.set(config.name, client);
    this.emit('client:created', { type: 'graphql', name: config.name });
    
    return client;
  }

  // gRPC Client
  public async createGRPCClient(config: APIClientConfig & { protoPath: string }): Promise<unknown> {
    const packageDefinition = await protoLoader.load(config.protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    });

    const proto = grpc.loadPackageDefinition(packageDefinition);
    
    let credentials = grpc.credentials.createInsecure();
    
    // Setup authentication
    if (config.authentication?.type === 'certificate') {
      const { rootCert, clientKey, clientCert } = config.authentication.credentials;
      credentials = grpc.credentials.createSsl(
        Buffer.from(rootCert),
        Buffer.from(clientKey),
        Buffer.from(clientCert)
      );
    }

    // Create client for each service in the proto
    const clients: Record<string, unknown> = {};
    
    // This is a simplified example - in practice, you'd parse the proto to find services
    // For now, we'll assume a service name is provided
    const ServiceConstructor = (proto as unknown)[config.name];
    if (ServiceConstructor) {
      clients[config.name] = new ServiceConstructor(
        config.baseUrl,
        credentials
      );
    }

    this.clients.set(config.name, clients);
    this.emit('client:created', { type: 'grpc', name: config.name });
    
    return clients;
  }

  // WebSocket Client
  public createWebSocketClient(config: APIClientConfig): WebSocket {
    const wsUrl = config.baseUrl.replace(/^http/, 'ws');
    
    const options: WebSocket.ClientOptions = {
      handshakeTimeout: config.options?.timeout || 30000
    };

    // Setup authentication headers
    if (config.authentication) {
      options.headers = {};
      switch (config.authentication.type) {
        case 'apiKey':
          options.headers['X-API-Key'] = config.authentication.credentials.apiKey;
          break;
        case 'jwt':
          options.headers['Authorization'] = `Bearer ${config.authentication.credentials.token}`;
          break;
      }
    }

    const client = new WebSocket(wsUrl, options);
    
    // Setup event handlers
    client.on('open', () => {
      this.emit('websocket:connected', { name: config.name });
    });

    client.on('close', () => {
      this.emit('websocket:disconnected', { name: config.name });
    });

    client.on('error', (error) => {
      this.emit('websocket:error', { name: config.name, error });
    });

    // Add reconnection logic
    if (config.options?.retries) {
      this.setupWebSocketReconnection(client, config);
    }

    this.clients.set(config.name, client);
    this.emit('client:created', { type: 'websocket', name: config.name });
    
    return client;
  }

  // MQTT Client
  public createMQTTClient(config: APIClientConfig): mqtt.MqttClient {
    const options: mqtt.IClientOptions = {
      connectTimeout: config.options?.timeout || 30000,
      keepalive: 60,
      clean: true,
      reconnectPeriod: config.options?.retryDelay || 1000
    };

    // Setup authentication
    if (config.authentication) {
      switch (config.authentication.type) {
        case 'basic':
          options.username = config.authentication.credentials.username;
          options.password = config.authentication.credentials.password;
          break;
        case 'certificate':
          options.cert = config.authentication.credentials.clientCert;
          options.key = config.authentication.credentials.clientKey;
          options.ca = config.authentication.credentials.rootCert;
          break;
      }
    }

    const client = mqtt.connect(config.baseUrl, options);
    
    // Setup event handlers
    client.on('connect', () => {
      this.emit('mqtt:connected', { name: config.name });
    });

    client.on('close', () => {
      this.emit('mqtt:disconnected', { name: config.name });
    });

    client.on('error', (error) => {
      this.emit('mqtt:error', { name: config.name, error });
    });

    this.clients.set(config.name, client);
    this.emit('client:created', { type: 'mqtt', name: config.name });
    
    return client;
  }

  // Generate client library code
  public async generateClientLibrary(
    clientName: string,
    language: 'typescript' | 'python' | 'go' | 'java' | 'csharp',
    methods: APIMethod[]
  ): Promise<ClientLibrary> {
    const library: ClientLibrary = {
      language,
      version: '1.0.0',
      dependencies: {},
      files: new Map()
    };

    switch (language) {
      case 'typescript':
        library.dependencies = {
          'axios': '^1.6.0',
          'graphql-request': '^6.1.0',
          '@grpc/grpc-js': '^1.9.0',
          'ws': '^8.14.0',
          'mqtt': '^5.0.0'
        };
        library.files.set('index.ts', this.generateTypeScriptClient(clientName, methods));
        library.files.set('types.ts', this.generateTypeScriptTypes(methods));
        library.files.set('package.json', this.generatePackageJSON(clientName, library.dependencies));
        break;

      case 'python':
        library.dependencies = {
          'requests': '>=2.31.0',
          'gql': '>=3.4.0',
          'grpcio': '>=1.59.0',
          'websocket-client': '>=1.6.0',
          'paho-mqtt': '>=1.6.0'
        };
        library.files.set('__init__.py', this.generatePythonClient(clientName, methods));
        library.files.set('types.py', this.generatePythonTypes(methods));
        library.files.set('setup.py', this.generateSetupPy(clientName, library.dependencies));
        break;

      case 'go':
        library.dependencies = {
          'github.com/go-resty/resty/v2': 'v2.10.0',
          'github.com/hasura/go-graphql-client': 'v0.10.0',
          'google.golang.org/grpc': 'v1.59.0',
          'github.com/gorilla/websocket': 'v1.5.0',
          'github.com/eclipse/paho.mqtt.golang': 'v1.4.0'
        };
        library.files.set('client.go', this.generateGoClient(clientName, methods));
        library.files.set('types.go', this.generateGoTypes(methods));
        library.files.set('go.mod', this.generateGoMod(clientName, library.dependencies));
        break;

      case 'java':
        library.dependencies = {
          'com.squareup.okhttp3:okhttp': '4.12.0',
          'com.apollographql.apollo3:apollo-runtime': '3.8.0',
          'io.grpc:grpc-netty-shaded': '1.59.0',
          'org.java-websocket:Java-WebSocket': '1.5.4',
          'org.eclipse.paho:org.eclipse.paho.client.mqttv3': '1.2.5'
        };
        library.files.set('Client.java', this.generateJavaClient(clientName, methods));
        library.files.set('Types.java', this.generateJavaTypes(methods));
        library.files.set('pom.xml', this.generatePomXml(clientName, library.dependencies));
        break;

      case 'csharp':
        library.dependencies = {
          'RestSharp': '110.2.0',
          'GraphQL.Client': '6.0.0',
          'Grpc.Net.Client': '2.59.0',
          'WebSocketSharp': '1.0.3',
          'MQTTnet': '4.3.0'
        };
        library.files.set('Client.cs', this.generateCSharpClient(clientName, methods));
        library.files.set('Types.cs', this.generateCSharpTypes(methods));
        library.files.set(`${clientName}.csproj`, this.generateCsproj(clientName, library.dependencies));
        break;
    }

    this.libraries.set(`${clientName}-${language}`, library);
    this.emit('library:generated', { clientName, language, files: library.files.size });
    
    return library;
  }

  // Helper methods
  private setupAuthentication(client: AxiosInstance, auth?: unknown): void {
    if (!auth) return;

    switch (auth.type) {
      case 'apiKey':
        if (auth.credentials.location === 'header') {
          client.defaults.headers.common[auth.credentials.name] = auth.credentials.value;
        } else if (auth.credentials.location === 'query') {
          client.defaults.params = client.defaults.params || {};
          client.defaults.params[auth.credentials.name] = auth.credentials.value;
        }
        break;

      case 'jwt':
        client.defaults.headers.common['Authorization'] = `Bearer ${auth.credentials.token}`;
        break;

      case 'basic': {
        const basicAuth = Buffer.from(
          `${auth.credentials.username}:${auth.credentials.password}`
        ).toString('base64');
        client.defaults.headers.common['Authorization'] = `Basic ${basicAuth}`;
        break;
      }

      case 'oauth2':
        // OAuth2 flow would be more complex, this is simplified
        client.defaults.headers.common['Authorization'] = `Bearer ${auth.credentials.accessToken}`;
        break;
    }
  }

  private addRetryInterceptor(client: AxiosInstance, retries: number, delay: number = 1000): void {
    client.interceptors.response.use(undefined, async (error) => {
      const config = error.config;
      
      if (!config || !config.retryCount) {
        config.retryCount = 0;
      }

      if (config.retryCount >= retries) {
        return Promise.reject(error);
      }

      config.retryCount++;
      
      // Exponential backoff
      const backoffDelay = delay * Math.pow(2, config.retryCount - 1);
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      return client(config);
    });
  }

  private addRateLimitInterceptor(client: AxiosInstance, rateLimit: unknown): void {
    const _queue: Array<() => void> = []; // eslint-disable-line @typescript-eslint/no-unused-vars
    let requestCount = 0;
    let resetTime = Date.now() + rateLimit.duration;

    client.interceptors.request.use(async (config) => {
      const now = Date.now();
      
      if (now >= resetTime) {
        requestCount = 0;
        resetTime = now + rateLimit.duration;
      }

      if (requestCount >= rateLimit.requests) {
        const waitTime = resetTime - now;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        requestCount = 0;
        resetTime = Date.now() + rateLimit.duration;
      }

      requestCount++;
      return config;
    });
  }

  private setupWebSocketReconnection(client: WebSocket, config: APIClientConfig): void {
    let reconnectAttempts = 0;
    const maxAttempts = config.options?.retries || 5;
    const delay = config.options?.retryDelay || 1000;

    client.on('close', () => {
      if (reconnectAttempts < maxAttempts) {
        reconnectAttempts++;
        setTimeout(() => {
          this.createWebSocketClient(config);
        }, delay * Math.pow(2, reconnectAttempts - 1));
      }
    });

    client.on('open', () => {
      reconnectAttempts = 0;
    });
  }

  // Code generation methods
  private generateTypeScriptClient(clientName: string, methods: APIMethod[]): string {
    return `
import axios, { AxiosInstance } from 'axios';
import { GraphQLClient } from 'graphql-request';
import * as grpc from '@grpc/grpc-js';
import * as WebSocket from 'ws';
import * as mqtt from 'mqtt';
import * as types from './types';

export class ${clientName}Client {
  private restClient: AxiosInstance;
  private graphqlClient: GraphQLClient;
  private wsClient: WebSocket;
  private mqttClient: mqtt.MqttClient;

  constructor(config: types.ClientConfig) {
    // Initialize clients based on config
    this.restClient = axios.create({
      baseURL: config.baseUrl,
      headers: config.headers,
      timeout: config.timeout
    });

    this.graphqlClient = new GraphQLClient(config.graphqlUrl || config.baseUrl + '/graphql', {
      headers: config.headers
    });

    this.wsClient = new WebSocket(config.wsUrl || config.baseUrl.replace(/^http/, 'ws'));
    this.mqttClient = mqtt.connect(config.mqttUrl || 'mqtt://localhost:1883');
  }

${methods.map(method => `
  async ${method.name}(${method.parameters?.map(p => `${p.name}: ${p.type}`).join(', ') || ''}): Promise<${method.returns || 'any'}> {
    ${method.method === 'GET' || method.method === 'POST' || method.method === 'PUT' || method.method === 'DELETE' ? `
    const response = await this.restClient.${method.method.toLowerCase()}('${method.path}', ${method.method === 'GET' ? 'null, { params }' : 'data'});
    return response.data;
    ` : ''}
    ${method.query ? `
    const data = await this.graphqlClient.request(${method.name}Query, variables);
    return data.${method.name};
    ` : ''}
    // Implementation based on method type
  }
`).join('')}
}

export default ${clientName}Client;
`;
  }

  private generateTypeScriptTypes(methods: APIMethod[]): string {
    return `
export interface ClientConfig {
  baseUrl: string;
  graphqlUrl?: string;
  wsUrl?: string;
  mqttUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
  auth?: {
    type: 'apiKey' | 'jwt' | 'basic' | 'oauth2';
    credentials: unknown;
  };
}

${methods.map(method => `
export interface ${method.name}Params {
  ${method.parameters?.map(p => `${p.name}${p.required ? '' : '?'}: ${p.type};`).join('\n  ')}
}

export interface ${method.name}Response {
  ${method.returns ? `data: ${method.returns};` : 'data: unknown;'}
  success: boolean;
  error?: string;
}
`).join('\n')}
`;
  }

  private generatePythonClient(clientName: string, methods: APIMethod[]): string {
    return `
import requests
from gql import gql, Client
from gql.transport.requests import RequestsHTTPTransport
import grpc
import websocket
import paho.mqtt.client as mqtt
from typing import Dict, Any, Optional
from .types import *

class ${clientName}Client:
    def __init__(self, config: ClientConfig):
        self.base_url = config.base_url
        self.headers = config.headers or {}
        self.timeout = config.timeout or 30
        
        # Initialize REST client session
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
        # Initialize GraphQL client
        transport = RequestsHTTPTransport(
            url=config.graphql_url or f"{self.base_url}/graphql",
            headers=self.headers
        )
        self.graphql_client = Client(transport=transport, fetch_schema_from_transport=True)
        
        # Initialize WebSocket client
        self.ws_client = None
        if config.ws_url:
            self.ws_client = websocket.WebSocketApp(config.ws_url)
        
        # Initialize MQTT client
        self.mqtt_client = mqtt.Client()
        if config.mqtt_url:
            self.mqtt_client.connect(config.mqtt_url)

${methods.map(method => `
    def ${method.name}(self${method.parameters?.map(p => `, ${p.name}: ${this.getPythonType(p.type)}`).join('') || ''}) -> ${this.getPythonType(method.returns || 'Any')}:
        """${method.description || 'No description available'}"""
        ${method.method ? `
        response = self.session.${method.method.toLowerCase()}(
            f"{self.base_url}${method.path}",
            ${method.method === 'GET' ? 'params=params' : 'json=data'},
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()
        ` : ''}
        ${method.query ? `
        query = gql("""${method.query}""")
        result = self.graphql_client.execute(query, variable_values=variables)
        return result["${method.name}"]
        ` : ''}
`).join('\n')}
`;
  }

  private generatePythonTypes(methods: APIMethod[]): string {
    return `
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

@dataclass
class ClientConfig:
    base_url: str
    graphql_url: Optional[str] = None
    ws_url: Optional[str] = None
    mqtt_url: Optional[str] = None
    headers: Optional[Dict[str, str]] = None
    timeout: Optional[int] = 30
    auth: Optional[Dict[str, Any]] = None

${methods.map(method => `
@dataclass
class ${method.name}Params:
    ${method.parameters?.map(p => `${p.name}: ${this.getPythonType(p.type)}${p.required ? '' : ' = None'}`).join('\n    ')}

@dataclass
class ${method.name}Response:
    data: ${this.getPythonType(method.returns || 'Any')}
    success: bool
    error: Optional[str] = None
`).join('\n')}
`;
  }

  private getPythonType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'str',
      'number': 'float',
      'integer': 'int',
      'boolean': 'bool',
      'array': 'List',
      'object': 'Dict[str, Any]',
      'any': 'Any'
    };
    return typeMap[type] || 'Any';
  }

  private generateGoClient(clientName: string, methods: APIMethod[]): string {
    return `
package ${clientName.toLowerCase()}

import (
    "context"
    "time"
    
    "github.com/go-resty/resty/v2"
    "github.com/hasura/go-graphql-client"
    "google.golang.org/grpc"
    "github.com/gorilla/websocket"
    mqtt "github.com/eclipse/paho.mqtt.golang"
)

type Client struct {
    restClient    *resty.Client
    graphqlClient *graphql.Client
    wsClient      *websocket.Conn
    mqttClient    mqtt.Client
    config        *Config
}

func NewClient(config *Config) *Client {
    restClient := resty.New().
        SetBaseURL(config.BaseURL).
        SetTimeout(time.Duration(config.Timeout) * time.Second)
    
    graphqlClient := graphql.NewClient(config.GraphQLURL, nil)
    
    return &Client{
        restClient:    restClient,
        graphqlClient: graphqlClient,
        config:        config,
    }
}

${methods.map(method => `
func (c *Client) ${method.name}(ctx context.Context${method.parameters?.map(p => `, ${p.name} ${this.getGoType(p.type)}`).join('') || ''}) (${this.getGoType(method.returns || 'interface{}')}, error) {
    ${method.method ? `
    resp, err := c.restClient.R().
        SetContext(ctx).
        ${method.method === 'POST' || method.method === 'PUT' ? 'SetBody(body).' : ''}
        ${method.method}("${method.path}")
    
    if err != nil {
        return nil, err
    }
    
    var result ${this.getGoType(method.returns || 'interface{}')}
    err = resp.UnmarshalJson(&result)
    return result, err
    ` : ''}
    ${method.query ? `
    var query struct {
        ${method.name} ${this.getGoType(method.returns || 'interface{}')} \`graphql:"${method.name}"\`
    }
    
    err := c.graphqlClient.Query(ctx, &query, variables)
    return query.${method.name}, err
    ` : ''}
}
`).join('\n')}
`;
  }

  private generateGoTypes(methods: APIMethod[]): string {
    return `
package ${methods[0]?.name.toLowerCase() || 'client'}

import "time"

type Config struct {
    BaseURL     string
    GraphQLURL  string
    WebSocketURL string
    MQTTURL     string
    Headers     map[string]string
    Timeout     int
    Auth        *AuthConfig
}

type AuthConfig struct {
    Type        string
    Credentials map[string]interface{}
}

${methods.map(method => `
type ${method.name}Params struct {
    ${method.parameters?.map(p => `${this.capitalize(p.name)} ${this.getGoType(p.type)} \`json:"${p.name}"\``).join('\n    ')}
}

type ${method.name}Response struct {
    Data    ${this.getGoType(method.returns || 'interface{}')} \`json:"data"\`
    Success bool                                              \`json:"success"\`
    Error   string                                            \`json:"error,omitempty"\`
}
`).join('\n')}
`;
  }

  private getGoType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'float64',
      'integer': 'int64',
      'boolean': 'bool',
      'array': '[]interface{}',
      'object': 'map[string]interface{}',
      'any': 'interface{}'
    };
    return typeMap[type] || 'interface{}';
  }

  private generateJavaClient(clientName: string, methods: APIMethod[]): string {
    return `
package com.workflow.${clientName.toLowerCase()};

import okhttp3.*;
import com.apollographql.apollo3.*;
import io.grpc.*;
import org.java_websocket.client.WebSocketClient;
import org.eclipse.paho.client.mqttv3.*;
import java.util.*;
import java.util.concurrent.*;

public class ${clientName}Client {
    private final OkHttpClient httpClient;
    private final ApolloClient apolloClient;
    private WebSocketClient wsClient;
    private MqttClient mqttClient;
    private final ClientConfig config;
    
    public ${clientName}Client(ClientConfig config) {
        this.config = config;
        
        this.httpClient = new OkHttpClient.Builder()
            .connectTimeout(config.getTimeout(), TimeUnit.SECONDS)
            .readTimeout(config.getTimeout(), TimeUnit.SECONDS)
            .build();
            
        this.apolloClient = new ApolloClient.Builder()
            .serverUrl(config.getGraphQLUrl())
            .httpClient(httpClient)
            .build();
    }

${methods.map(method => `
    public CompletableFuture<${this.getJavaType(method.returns || 'Object')}> ${method.name}(${method.parameters?.map(p => `${this.getJavaType(p.type)} ${p.name}`).join(', ') || ''}) {
        ${method.method ? `
        Request request = new Request.Builder()
            .url(config.getBaseUrl() + "${method.path}")
            ${method.method === 'POST' || method.method === 'PUT' ? `.${method.method.toLowerCase()}(RequestBody.create(MediaType.parse("application/json"), jsonBody))` : `.${method.method.toLowerCase()}()`}
            .build();
            
        return CompletableFuture.supplyAsync(() -> {
            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) throw new IOException("Unexpected code " + response);
                return parseResponse(response.body().string(), ${this.getJavaType(method.returns || 'Object')}.class);
            } catch (Exception e) {
                throw new CompletionException(e);
            }
        });
        ` : ''}
        ${method.query ? `
        return apolloClient.query(new ${method.name}Query(variables))
            .toCompletableFuture()
            .thenApply(response -> response.data.${method.name});
        ` : ''}
    }
`).join('\n')}
}
`;
  }

  private generateJavaTypes(methods: APIMethod[]): string {
    return `
package com.workflow.types;

import java.util.*;

public class ClientConfig {
    private String baseUrl;
    private String graphQLUrl;
    private String webSocketUrl;
    private String mqttUrl;
    private Map<String, String> headers;
    private int timeout = 30;
    private AuthConfig auth;
    
    // Getters and setters
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    
    public String getGraphQLUrl() { return graphQLUrl != null ? graphQLUrl : baseUrl + "/graphql"; }
    public void setGraphQLUrl(String graphQLUrl) { this.graphQLUrl = graphQLUrl; }
    
    public int getTimeout() { return timeout; }
    public void setTimeout(int timeout) { this.timeout = timeout; }
}

${methods.map(method => `
public class ${method.name}Params {
    ${method.parameters?.map(p => `private ${this.getJavaType(p.type)} ${p.name};`).join('\n    ')}
    
    ${method.parameters?.map(p => `
    public ${this.getJavaType(p.type)} get${this.capitalize(p.name)}() { return ${p.name}; }
    public void set${this.capitalize(p.name)}(${this.getJavaType(p.type)} ${p.name}) { this.${p.name} = ${p.name}; }
    `).join('\n    ')}
}

public class ${method.name}Response {
    private ${this.getJavaType(method.returns || 'Object')} data;
    private boolean success;
    private String error;
    
    public ${this.getJavaType(method.returns || 'Object')} getData() { return data; }
    public void setData(${this.getJavaType(method.returns || 'Object')} data) { this.data = data; }
    
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
}
`).join('\n')}
`;
  }

  private getJavaType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'String',
      'number': 'Double',
      'integer': 'Integer',
      'boolean': 'Boolean',
      'array': 'List<Object>',
      'object': 'Map<String, Object>',
      'any': 'Object'
    };
    return typeMap[type] || 'Object';
  }

  private generateCSharpClient(clientName: string, methods: APIMethod[]): string {
    return `
using System;
using System.Net.Http;
using System.Threading.Tasks;
using RestSharp;
using GraphQL.Client.Http;
using Grpc.Net.Client;
using WebSocketSharp;
using MQTTnet;
using MQTTnet.Client;

namespace Workflow.${clientName}
{
    public class ${clientName}Client
    {
        private readonly RestClient restClient;
        private readonly GraphQLHttpClient graphQLClient;
        private WebSocket wsClient;
        private IMqttClient mqttClient;
        private readonly ClientConfig config;
        
        public ${clientName}Client(ClientConfig config)
        {
            this.config = config;
            
            restClient = new RestClient(config.BaseUrl);
            graphQLClient = new GraphQLHttpClient(config.GraphQLUrl ?? config.BaseUrl + "/graphql", new HttpClient());
            
            if (!string.IsNullOrEmpty(config.WebSocketUrl))
            {
                wsClient = new WebSocket(config.WebSocketUrl);
            }
            
            if (!string.IsNullOrEmpty(config.MqttUrl))
            {
                var factory = new MqttFactory();
                mqttClient = factory.CreateMqttClient();
            }
        }

${methods.map(method => `
        public async Task<${this.getCSharpType(method.returns || 'object')}> ${method.name}Async(${method.parameters?.map(p => `${this.getCSharpType(p.type)} ${p.name}`).join(', ') || ''})
        {
            ${method.method ? `
            var request = new RestRequest("${method.path}", Method.${method.method});
            ${method.method === 'POST' || method.method === 'PUT' ? 'request.AddJsonBody(body);' : ''}
            
            var response = await restClient.ExecuteAsync<${this.getCSharpType(method.returns || 'object')}>(request);
            
            if (!response.IsSuccessful)
            {
                throw new Exception($"Request failed: {response.ErrorMessage}");
            }
            
            return response.Data;
            ` : ''}
            ${method.query ? `
            var request = new GraphQLRequest
            {
                Query = @"${method.query}",
                Variables = variables
            };
            
            var response = await graphQLClient.SendQueryAsync<${method.name}Response>(request);
            
            if (response.Errors != null && response.Errors.Length > 0)
            {
                throw new Exception($"GraphQL error: {string.Join(", ", response.Errors.Select(e => e.Message))}");
            }
            
            return response.Data.${method.name};
            ` : ''}
        }
`).join('\n')}
    }
}
`;
  }

  private generateCSharpTypes(methods: APIMethod[]): string {
    return `
using System;
using System.Collections.Generic;

namespace Workflow.Types
{
    public class ClientConfig
    {
        public string BaseUrl { get; set; }
        public string GraphQLUrl { get; set; }
        public string WebSocketUrl { get; set; }
        public string MqttUrl { get; set; }
        public Dictionary<string, string> Headers { get; set; }
        public int Timeout { get; set; } = 30;
        public AuthConfig Auth { get; set; }
    }
    
    public class AuthConfig
    {
        public string Type { get; set; }
        public Dictionary<string, object> Credentials { get; set; }
    }

${methods.map(method => `
    public class ${method.name}Params
    {
        ${method.parameters?.map(p => `public ${this.getCSharpType(p.type)} ${this.capitalize(p.name)} { get; set; }`).join('\n        ')}
    }
    
    public class ${method.name}Response
    {
        public ${this.getCSharpType(method.returns || 'object')} Data { get; set; }
        public bool Success { get; set; }
        public string Error { get; set; }
    }
`).join('\n')}
}
`;
  }

  private getCSharpType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'double',
      'integer': 'int',
      'boolean': 'bool',
      'array': 'List<object>',
      'object': 'Dictionary<string, object>',
      'any': 'object'
    };
    return typeMap[type] || 'object';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private generatePackageJSON(name: string, dependencies: Record<string, string>): string {
    return JSON.stringify({
      name: name.toLowerCase(),
      version: '1.0.0',
      description: `${name} API Client`,
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsc',
        test: 'jest',
        lint: 'eslint src/**/*.ts'
      },
      dependencies,
      devDependencies: {
        '@types/node': '^20.0.0',
        'typescript': '^5.0.0',
        'jest': '^29.0.0',
        '@types/jest': '^29.0.0',
        'eslint': '^8.0.0'
      }
    }, null, 2);
  }

  private generateSetupPy(name: string, dependencies: Record<string, string>): string {
    return `
from setuptools import setup, find_packages

setup(
    name="${name.toLowerCase()}",
    version="1.0.0",
    description="${name} API Client",
    packages=find_packages(),
    install_requires=[
        ${Object.entries(dependencies).map(([pkg, version]) => `"${pkg}${version}"`).join(',\n        ')}
    ],
    python_requires=">=3.7",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
`;
  }

  private generateGoMod(name: string, dependencies: Record<string, string>): string {
    return `module github.com/workflow/${name.toLowerCase()}

go 1.21

require (
${Object.entries(dependencies).map(([pkg, version]) => `    ${pkg} ${version}`).join('\n')}
)
`;
  }

  private generatePomXml(name: string, dependencies: Record<string, string>): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>com.workflow</groupId>
    <artifactId>${name.toLowerCase()}</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    
    <name>${name} API Client</name>
    
    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>
    
    <dependencies>
${Object.entries(dependencies).map(([pkg, version]) => {
  const [groupId, artifactId] = pkg.split(':');
  return `        <dependency>
            <groupId>${groupId}</groupId>
            <artifactId>${artifactId}</artifactId>
            <version>${version}</version>
        </dependency>`;
}).join('\n')}
    </dependencies>
</project>
`;
  }

  private generateCsproj(name: string, dependencies: Record<string, string>): string {
    return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <PackageId>${name}</PackageId>
    <Version>1.0.0</Version>
    <Authors>Workflow Team</Authors>
    <Description>${name} API Client</Description>
  </PropertyGroup>

  <ItemGroup>
${Object.entries(dependencies).map(([pkg, version]) => `    <PackageReference Include="${pkg}" Version="${version}" />`).join('\n')}
  </ItemGroup>
</Project>
`;
  }
}

export default APIClientGenerator;