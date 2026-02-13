import { EventEmitter } from 'events';
import * as crypto from 'crypto';
// import * as jwt from 'jsonwebtoken'; // Currently unused
import * as saml from 'samlify';
import * as oauth from 'simple-oauth2';
import * as openidClient from 'openid-client';
import * as ldap from 'ldapjs';
import * as kerberos from 'kerberos';

export interface SSOConfig {
  provider: 'saml' | 'oauth2' | 'oidc' | 'ldap' | 'kerberos' | 'custom';
  providerConfig: unknown;
  sessionConfig?: {
    maxAge?: number;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  };
  userMapping?: UserAttributeMapping;
  allowedDomains?: string[];
  autoProvision?: boolean;
  mfaRequired?: boolean;
}

export interface UserAttributeMapping {
  id?: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  groups?: string;
  roles?: string;
  department?: string;
  customAttributes?: Record<string, string>;
}

export interface SSOSession {
  id: string;
  userId: string;
  provider: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: Date;
  attributes: Record<string, unknown>;
  mfaVerified?: boolean;
}

export interface SSOUser {
  id: string;
  email: string;
  name: string;
  provider: string;
  externalId: string;
  attributes: Record<string, unknown>;
  groups: string[];
  roles: string[];
  lastLogin?: Date;
  isActive: boolean;
}

export interface SAMLConfig {
  entityId: string;
  callbackUrl: string;
  idpMetadata: string;
  privateKey: string;
  certificate: string;
  signatureAlgorithm?: string;
  digestAlgorithm?: string;
  wantAssertionsSigned?: boolean;
  wantResponseSigned?: boolean;
  allowUnencryptedAssertion?: boolean;
}

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scope: string[];
  state?: string;
  pkce?: boolean;
}

export interface OIDCConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  responseType?: string;
  responseMode?: string;
  prompt?: string;
  maxAge?: number;
  uiLocales?: string;
  idTokenHint?: string;
  loginHint?: string;
  acrValues?: string;
}

export interface LDAPConfig {
  url: string;
  bindDN: string;
  bindPassword: string;
  searchBase: string;
  searchFilter: string;
  searchAttributes?: string[];
  groupSearchBase?: string;
  groupSearchFilter?: string;
  tlsOptions?: unknown;
  timeout?: number;
  connectTimeout?: number;
}

export interface KerberosConfig {
  realm: string;
  kdc: string;
  principal: string;
  keytab?: string;
  cache?: string;
  forwardable?: boolean;
  renewable?: boolean;
  proxiable?: boolean;
}

export class SSOProvider extends EventEmitter {
  private config: SSOConfig;
  private sessions: Map<string, SSOSession> = new Map();
  private users: Map<string, SSOUser> = new Map();
  private samlProvider: unknown;
  private oauth2Client: unknown;
  private oidcClient: unknown;
  private ldapClient: unknown;
  private kerberosClient: unknown;

  constructor(config: SSOConfig) {
    super();
    this.config = config;
    this.initializeProvider();
  }

  private async initializeProvider(): Promise<void> {
    switch (this.config.provider) {
      case 'saml':
        await this.initializeSAML();
        break;
      case 'oauth2':
        await this.initializeOAuth2();
        break;
      case 'oidc':
        await this.initializeOIDC();
        break;
      case 'ldap':
        await this.initializeLDAP();
        break;
      case 'kerberos':
        await this.initializeKerberos();
        break;
      case 'custom':
        await this.initializeCustom();
        break;
    }

    this.emit('provider:initialized', { provider: this.config.provider });
  }

  // SAML Implementation
  private async initializeSAML(): Promise<void> {
    const samlConfig = this.config.providerConfig as SAMLConfig;

    // Create Service Provider
    this.samlProvider = saml.ServiceProvider({
      entityID: samlConfig.entityId,
      privateKey: samlConfig.privateKey,
      x509cert: samlConfig.certificate,
      assertionConsumerService: [{
        Binding: saml.Constants.namespace.binding.post,
        Location: samlConfig.callbackUrl
      }],
      signingCert: samlConfig.certificate,
      encryptCert: samlConfig.certificate
    });

    // Create Identity Provider from metadata
    const idp = saml.IdentityProvider({
      metadata: samlConfig.idpMetadata,
      wantAuthnRequestsSigned: true,
      wantAssertionsSigned: samlConfig.wantAssertionsSigned !== false,
      wantResponseSigned: samlConfig.wantResponseSigned !== false
    });

    this.samlProvider.idp = idp;
  }

  public async generateSAMLRequest(): Promise<{ url: string; id: string }> {
    if (this.config.provider !== 'saml') {
      throw new Error('SAML not configured');
    }

    const request = this.samlProvider.createLoginRequest(
      this.samlProvider.idp,
      'post'
    );

    const requestId = crypto.randomUUID();
    
    this.emit('saml:request:generated', { 
      id: requestId,
      url: request.context 
    });

    return {
      url: request.context,
      id: requestId
    };
  }

  public async processSAMLResponse(
    response: string,
    _requestId?: string // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<SSOSession> {
    if (this.config.provider !== 'saml') {
      throw new Error('SAML not configured');
    }

    try {
      const result = await this.samlProvider.parseLoginResponse(
        this.samlProvider.idp,
        'post',
        { body: { SAMLResponse: response } }
      );

      // Extract user attributes
      const attributes = this.extractSAMLAttributes(result.extract);
      
      // Map to user object
      const user = this.mapAttributesToUser(attributes, 'saml');
      
      // Create or update user
      const ssoUser = await this.createOrUpdateUser(user);
      
      // Create session
      const session = await this.createSession(ssoUser, {
        attributes: result.extract,
        rawAssertion: result.rawAssertion
      });

      this.emit('saml:login:success', { 
        user: ssoUser,
        sessionId: session.id 
      });

      return session;

    } catch (error) {
      this.emit('saml:login:error', error);
      throw error;
    }
  }

  private extractSAMLAttributes(assertion: unknown): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};

    // Extract standard SAML attributes
    if (assertion.attributes) {
      for (const [key, value] of Object.entries(assertion.attributes)) {
        attributes[key] = Array.isArray(value) ? value[0] : value;
      }
    }

    // Extract NameID
    if (assertion.nameID) {
      attributes.nameID = assertion.nameID;
    }

    // Extract SessionIndex
    if (assertion.sessionIndex) {
      attributes.sessionIndex = assertion.sessionIndex;
    }

    return attributes;
  }

  // OAuth2 Implementation
  private async initializeOAuth2(): Promise<void> {
    const oauth2Config = this.config.providerConfig as OAuth2Config;

    this.oauth2Client = new oauth.AuthorizationCode({
      client: {
        id: oauth2Config.clientId,
        secret: oauth2Config.clientSecret
      },
      auth: {
        tokenHost: oauth2Config.tokenUrl,
        tokenPath: oauth2Config.tokenUrl,
        authorizePath: oauth2Config.authorizationUrl
      }
    });
  }

  public async generateOAuth2AuthUrl(): Promise<string> {
    if (this.config.provider !== 'oauth2') {
      throw new Error('OAuth2 not configured');
    }

    const oauth2Config = this.config.providerConfig as OAuth2Config;
    const state = oauth2Config.state || crypto.randomUUID();

    const authorizationUri = this.oauth2Client.authorizeURL({
      redirect_uri: oauth2Config.redirectUri,
      scope: oauth2Config.scope.join(' '),
      state: state
    });

    // Add PKCE if enabled
    if (oauth2Config.pkce) {
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(codeVerifier);
      
      // Store code verifier for later use
      this.sessions.set(`pkce_${state}`, {
        id: state,
        userId: '',
        provider: 'oauth2',
        expiresAt: new Date(Date.now() + 600000), // 10 minutes
        attributes: { codeVerifier }
      });

      return `${authorizationUri}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    }

    return authorizationUri;
  }

  public async processOAuth2Callback(
    code: string,
    state?: string
  ): Promise<SSOSession> {
    if (this.config.provider !== 'oauth2') {
      throw new Error('OAuth2 not configured');
    }

    const oauth2Config = this.config.providerConfig as OAuth2Config;

    try {
      const tokenParams: unknown = {
        code,
        redirect_uri: oauth2Config.redirectUri
      };

      // Add PKCE verifier if used
      if (oauth2Config.pkce && state) {
        const pkceSession = this.sessions.get(`pkce_${state}`);
        if (pkceSession) {
          tokenParams.code_verifier = pkceSession.attributes.codeVerifier;
          this.sessions.delete(`pkce_${state}`);
        }
      }

      const accessToken = await this.oauth2Client.getToken(tokenParams);
      
      // Get user info
      const userInfo = await this.fetchOAuth2UserInfo(accessToken.token);
      
      // Map to user object
      const user = this.mapAttributesToUser(userInfo, 'oauth2');
      
      // Create or update user
      const ssoUser = await this.createOrUpdateUser(user);
      
      // Create session
      const session = await this.createSession(ssoUser, {
        accessToken: accessToken.token.access_token,
        refreshToken: accessToken.token.refresh_token,
        expiresIn: accessToken.token.expires_in
      });

      this.emit('oauth2:login:success', { 
        user: ssoUser,
        sessionId: session.id 
      });

      return session;

    } catch (error) {
      this.emit('oauth2:login:error', error);
      throw error;
    }
  }

  private async fetchOAuth2UserInfo(token: unknown): Promise<unknown> {
    // This would be provider-specific
    // Example for a generic OAuth2 provider
    const response = await fetch('https://api.provider.com/userinfo', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`
      }
    });

    return response.json();
  }

  // OIDC Implementation
  private async initializeOIDC(): Promise<void> {
    const oidcConfig = this.config.providerConfig as OIDCConfig;

    const issuer = await openidClient.Issuer.discover(oidcConfig.issuer);
    
    this.oidcClient = new issuer.Client({
      client_id: oidcConfig.clientId,
      client_secret: oidcConfig.clientSecret,
      redirect_uris: [oidcConfig.redirectUri],
      response_types: [oidcConfig.responseType || 'code']
    });
  }

  public async generateOIDCAuthUrl(): Promise<string> {
    if (this.config.provider !== 'oidc') {
      throw new Error('OIDC not configured');
    }

    const oidcConfig = this.config.providerConfig as OIDCConfig;
    
    const authUrl = this.oidcClient.authorizationUrl({
      scope: oidcConfig.scope.join(' '),
      response_mode: oidcConfig.responseMode,
      prompt: oidcConfig.prompt,
      max_age: oidcConfig.maxAge,
      ui_locales: oidcConfig.uiLocales,
      id_token_hint: oidcConfig.idTokenHint,
      login_hint: oidcConfig.loginHint,
      acr_values: oidcConfig.acrValues
    });

    return authUrl;
  }

  public async processOIDCCallback(params: unknown): Promise<SSOSession> {
    if (this.config.provider !== 'oidc') {
      throw new Error('OIDC not configured');
    }

    try {
      const tokenSet = await this.oidcClient.callback(
        this.config.providerConfig.redirectUri,
        params
      );

      // Validate ID token
      const claims = tokenSet.claims();
      
      // Get user info
      const userInfo = await this.oidcClient.userinfo(tokenSet);
      
      // Map to user object
      const user = this.mapAttributesToUser({ ...claims, ...userInfo }, 'oidc');
      
      // Create or update user
      const ssoUser = await this.createOrUpdateUser(user);
      
      // Create session
      const session = await this.createSession(ssoUser, {
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
        idToken: tokenSet.id_token,
        expiresIn: tokenSet.expires_in
      });

      this.emit('oidc:login:success', { 
        user: ssoUser,
        sessionId: session.id 
      });

      return session;

    } catch (error) {
      this.emit('oidc:login:error', error);
      throw error;
    }
  }

  // LDAP Implementation
  private async initializeLDAP(): Promise<void> {
    const ldapConfig = this.config.providerConfig as LDAPConfig;

    this.ldapClient = ldap.createClient({
      url: ldapConfig.url,
      tlsOptions: ldapConfig.tlsOptions,
      timeout: ldapConfig.timeout,
      connectTimeout: ldapConfig.connectTimeout
    });

    // Bind with service account
    await new Promise<void>((resolve, reject) => {
      this.ldapClient.bind(
        ldapConfig.bindDN,
        ldapConfig.bindPassword,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  public async authenticateLDAP(
    username: string,
    password: string
  ): Promise<SSOSession> {
    if (this.config.provider !== 'ldap') {
      throw new Error('LDAP not configured');
    }

    const ldapConfig = this.config.providerConfig as LDAPConfig;

    try {
      // Search for user
      const searchResult = await this.searchLDAPUser(username);
      
      if (searchResult.length === 0) {
        throw new Error('User not found');
      }

      const userEntry = searchResult[0];
      
      // Attempt to bind as the user
      await this.bindLDAPUser(userEntry.dn, password);
      
      // Get user groups if configured
      let groups: string[] = [];
      if (ldapConfig.groupSearchBase) {
        groups = await this.getLDAPUserGroups(userEntry.dn);
      }

      // Map LDAP attributes to user
      const attributes = this.extractLDAPAttributes(userEntry);
      attributes.groups = groups;
      
      const user = this.mapAttributesToUser(attributes, 'ldap');
      
      // Create or update user
      const ssoUser = await this.createOrUpdateUser(user);
      
      // Create session
      const session = await this.createSession(ssoUser, {
        attributes,
        dn: userEntry.dn
      });

      this.emit('ldap:login:success', { 
        user: ssoUser,
        sessionId: session.id 
      });

      return session;

    } catch (error) {
      this.emit('ldap:login:error', error);
      throw error;
    }
  }

  private async searchLDAPUser(username: string): Promise<unknown[]> {
    const ldapConfig = this.config.providerConfig as LDAPConfig;
    
    const searchOptions = {
      filter: ldapConfig.searchFilter.replace('{{username}}', username),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scope: 'sub' as any, // LDAP library requires this exact type
      attributes: ldapConfig.searchAttributes || []
    };

    return new Promise((resolve, reject) => {
      const results: unknown[] = [];
      
      this.ldapClient.search(
        ldapConfig.searchBase,
        searchOptions,
        (err, res) => {
          if (err) {
            reject(err);
            return;
          }

          res.on('searchEntry', (entry) => {
            results.push(entry.object);
          });

          res.on('error', (err) => {
            reject(err);
          });

          res.on('end', () => {
            resolve(results);
          });
        }
      );
    });
  }

  private async bindLDAPUser(dn: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tempClient = ldap.createClient({
        url: this.config.providerConfig.url,
        tlsOptions: this.config.providerConfig.tlsOptions
      });

      tempClient.bind(dn, password, (err) => {
        tempClient.unbind();
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async getLDAPUserGroups(userDn: string): Promise<string[]> {
    const ldapConfig = this.config.providerConfig as LDAPConfig;
    
    const searchOptions = {
      filter: ldapConfig.groupSearchFilter?.replace('{{userDn}}', userDn) || `(member=${userDn})`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scope: 'sub' as any, // LDAP library requires this exact type
      attributes: ['cn']
    };

    const results = await new Promise<unknown[]>((resolve, reject) => {
      const groups: unknown[] = [];
      
      this.ldapClient.search(
        ldapConfig.groupSearchBase!,
        searchOptions,
        (err, res) => {
          if (err) {
            reject(err);
            return;
          }

          res.on('searchEntry', (entry) => {
            groups.push(entry.object);
          });

          res.on('error', (err) => {
            reject(err);
          });

          res.on('end', () => {
            resolve(groups);
          });
        }
      );
    });

    return results.map(g => g.cn);
  }

  private extractLDAPAttributes(entry: unknown): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(entry)) {
      if (key !== 'controls') {
        attributes[key] = value;
      }
    }
    
    return attributes;
  }

  // Kerberos Implementation
  private async initializeKerberos(): Promise<void> {
    const kerberosConfig = this.config.providerConfig as KerberosConfig;
    
    // Initialize Kerberos client
    this.kerberosClient = await kerberos.initializeClient(
      `HTTP@${kerberosConfig.principal}`,
      {
        realm: kerberosConfig.realm,
        kdc: kerberosConfig.kdc,
        keytab: kerberosConfig.keytab,
        cache: kerberosConfig.cache
      }
    );
  }

  public async authenticateKerberos(ticket: string): Promise<SSOSession> {
    if (this.config.provider !== 'kerberos') {
      throw new Error('Kerberos not configured');
    }

    try {
      // Validate Kerberos ticket
      const principal = await this.kerberosClient.unwrap(ticket);
      
      // Extract user information from principal
      const [username, realm] = principal.split('@');
      
      const attributes = {
        principal,
        username,
        realm,
        authenticationType: 'kerberos'
      };
      
      const user = this.mapAttributesToUser(attributes, 'kerberos');
      
      // Create or update user
      const ssoUser = await this.createOrUpdateUser(user);
      
      // Create session
      const session = await this.createSession(ssoUser, {
        attributes,
        ticket
      });

      this.emit('kerberos:login:success', { 
        user: ssoUser,
        sessionId: session.id 
      });

      return session;

    } catch (error) {
      this.emit('kerberos:login:error', error);
      throw error;
    }
  }

  // Custom Provider Implementation
  private async initializeCustom(): Promise<void> {
    // Custom initialization logic
    this.emit('custom:initialized', this.config.providerConfig);
  }

  // Common Methods
  private mapAttributesToUser(
    attributes: Record<string, unknown>,
    provider: string
  ): Partial<SSOUser> {
    const mapping = this.config.userMapping || {};
    
    const user: Partial<SSOUser> = {
      provider,
      attributes: { ...attributes }
    };

    // Map standard attributes
    if (mapping.id) {
      user.externalId = attributes[mapping.id] || attributes.id || attributes.sub;
    }
    
    if (mapping.email) {
      user.email = attributes[mapping.email] || attributes.email || attributes.mail;
    }
    
    if (mapping.name) {
      user.name = attributes[mapping.name] || attributes.name || attributes.displayName;
    } else if (mapping.firstName && mapping.lastName) {
      const firstName = attributes[mapping.firstName] || attributes.givenName || '';
      const lastName = attributes[mapping.lastName] || attributes.sn || '';
      user.name = `${firstName} ${lastName}`.trim();
    }
    
    if (mapping.groups) {
      user.groups = this.parseGroups(attributes[mapping.groups] || attributes.groups || []);
    }
    
    if (mapping.roles) {
      user.roles = this.parseRoles(attributes[mapping.roles] || attributes.roles || []);
    }

    // Map custom attributes
    if (mapping.customAttributes) {
      for (const [key, attrName] of Object.entries(mapping.customAttributes)) {
        if (attributes[attrName]) {
          user.attributes![key] = attributes[attrName];
        }
      }
    }

    return user;
  }

  private parseGroups(groups: unknown): string[] {
    if (Array.isArray(groups)) {
      return groups.map(g => typeof g === 'string' ? g : g.name || g.cn || String(g));
    }
    if (typeof groups === 'string') {
      return groups.split(',').map(g => g.trim());
    }
    return [];
  }

  private parseRoles(roles: unknown): string[] {
    if (Array.isArray(roles)) {
      return roles.map(r => typeof r === 'string' ? r : r.name || String(r));
    }
    if (typeof roles === 'string') {
      return roles.split(',').map(r => r.trim());
    }
    return [];
  }

  private async createOrUpdateUser(userData: Partial<SSOUser>): Promise<SSOUser> {
    const userId = `${userData.provider}:${userData.externalId}`;
    
    let user = this.users.get(userId);
    
    if (!user) {
      // Create new user
      user = {
        id: userId,
        email: userData.email!,
        name: userData.name!,
        provider: userData.provider!,
        externalId: userData.externalId!,
        attributes: userData.attributes || {},
        groups: userData.groups || [],
        roles: userData.roles || [],
        isActive: true
      };
      
      if (this.config.autoProvision) {
        await this.provisionUser(user);
      }
    } else {
      // Update existing user
      user.email = userData.email || user.email;
      user.name = userData.name || user.name;
      user.attributes = { ...user.attributes, ...userData.attributes };
      user.groups = userData.groups || user.groups;
      user.roles = userData.roles || user.roles;
      user.lastLogin = new Date();
    }
    
    this.users.set(userId, user);
    this.emit('user:synced', user);
    
    return user;
  }

  private async provisionUser(user: SSOUser): Promise<void> {
    // Auto-provision user in the system
    this.emit('user:provision', user);
    
    // Additional provisioning logic
    // - Create user account
    // - Assign default roles
    // - Send welcome email
    // - Create user workspace
  }

  private async createSession(
    user: SSOUser,
    sessionData: unknown
  ): Promise<SSOSession> {
    const sessionId = crypto.randomUUID();
    
    const session: SSOSession = {
      id: sessionId,
      userId: user.id,
      provider: user.provider,
      accessToken: sessionData.accessToken,
      refreshToken: sessionData.refreshToken,
      idToken: sessionData.idToken,
      expiresAt: new Date(Date.now() + (sessionData.expiresIn || 3600) * 1000),
      attributes: sessionData.attributes || {},
      mfaVerified: false
    };
    
    // Check if MFA is required
    if (this.config.mfaRequired) {
      session.mfaVerified = await this.verifyMFA(user);
    }
    
    this.sessions.set(sessionId, session);
    
    // Set session cookie
    this.setSessionCookie(sessionId);
    
    this.emit('session:created', session);
    
    return session;
  }

  private async verifyMFA(_user: SSOUser): Promise<boolean> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // MFA verification logic
    // This would integrate with your MFA provider
    return true;
  }

  private setSessionCookie(sessionId: string): void {
    // In a real implementation, this would set an HTTP-only secure cookie
    this.emit('cookie:set', {
      name: 'sso_session',
      value: sessionId,
      options: this.config.sessionConfig
    });
  }

  // Session Management
  public async validateSession(sessionId: string): Promise<SSOUser | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      this.emit('session:expired', sessionId);
      return null;
    }
    
    const user = this.users.get(session.userId);
    
    if (!user || !user.isActive) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    return user;
  }

  public async refreshSession(sessionId: string): Promise<SSOSession | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.refreshToken) {
      return null;
    }
    
    try {
      // Refresh logic based on provider
      switch (this.config.provider) {
        case 'oauth2':
          await this.refreshOAuth2Token(session);
          break;
        case 'oidc':
          await this.refreshOIDCToken(session);
          break;
        default:
          // Extend session expiry
          session.expiresAt = new Date(Date.now() + 3600000);
      }
      
      this.emit('session:refreshed', session);
      return session;
      
    } catch (error) {
      this.emit('session:refresh:error', { sessionId, error });
      return null;
    }
  }

  private async refreshOAuth2Token(session: SSOSession): Promise<void> {
    const accessToken = this.oauth2Client.createToken({
      refresh_token: session.refreshToken
    });
    
    const refreshed = await accessToken.refresh();
    
    session.accessToken = refreshed.token.access_token;
    session.refreshToken = refreshed.token.refresh_token;
    session.expiresAt = new Date(Date.now() + refreshed.token.expires_in * 1000);
  }

  private async refreshOIDCToken(session: SSOSession): Promise<void> {
    const tokenSet = await this.oidcClient.refresh(session.refreshToken);
    
    session.accessToken = tokenSet.access_token;
    session.refreshToken = tokenSet.refresh_token;
    session.idToken = tokenSet.id_token;
    session.expiresAt = new Date(Date.now() + tokenSet.expires_in! * 1000);
  }

  public async logout(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return;
    }
    
    // Provider-specific logout
    switch (this.config.provider) {
      case 'saml':
        await this.logoutSAML(session);
        break;
      case 'oidc':
        await this.logoutOIDC(session);
        break;
    }
    
    this.sessions.delete(sessionId);
    this.emit('logout', { sessionId, userId: session.userId });
  }

  private async logoutSAML(session: SSOSession): Promise<{ url: string }> {
    const request = this.samlProvider.createLogoutRequest(
      this.samlProvider.idp,
      'redirect',
      {
        nameID: session.attributes.nameID,
        sessionIndex: session.attributes.sessionIndex
      }
    );
    
    return { url: request.context };
  }

  private async logoutOIDC(session: SSOSession): Promise<{ url: string }> {
    const endSessionUrl = this.oidcClient.endSessionUrl({
      id_token_hint: session.idToken,
      post_logout_redirect_uri: this.config.providerConfig.redirectUri
    });
    
    return { url: endSessionUrl };
  }

  // Utility Methods
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }

  // Admin Methods
  public async listActiveSessions(): Promise<SSOSession[]> {
    const now = new Date();
    const activeSessions: SSOSession[] = [];
    
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt > now) {
        activeSessions.push(session);
      } else {
        this.sessions.delete(id);
      }
    }
    
    return activeSessions;
  }

  public async revokeUserSessions(userId: string): Promise<number> {
    let count = 0;
    
    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(id);
        count++;
      }
    }
    
    this.emit('sessions:revoked', { userId, count });
    return count;
  }

  public async syncUserGroups(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;
    
    // Re-fetch user groups from provider
    switch (user.provider) {
      case 'ldap': {
        const groups = await this.getLDAPUserGroups(user.externalId);
        user.groups = groups;
        break;
      }
      // Add other providers as needed
    }
    
    this.emit('user:groups:synced', user);
  }
}

export default SSOProvider;