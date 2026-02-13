/**
 * Authentication Flow
 * Handles SAML and OIDC authentication request generation and response parsing
 */

import * as crypto from 'crypto';
import {
  SSOProviderConfig,
  AuthenticationRequest,
  SAMLResponse,
} from './types';

export class AuthenticationFlow {
  /**
   * Generate a secure random token
   */
  public generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate SAML AuthnRequest URL
   */
  public generateSAMLAuthnRequest(
    provider: SSOProviderConfig,
    state: string,
    forceAuthn?: boolean
  ): string {
    const saml = provider.saml!;
    const id = '_' + this.generateSecureToken();
    const issueInstant = new Date().toISOString();

    const authnRequest = `
      <samlp:AuthnRequest
        xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        ID="${id}"
        Version="2.0"
        IssueInstant="${issueInstant}"
        Destination="${saml.ssoUrl}"
        AssertionConsumerServiceURL="${saml.assertionConsumerServiceUrl}"
        ${forceAuthn ? 'ForceAuthn="true"' : ''}
        ${saml.passiveAuthn ? 'IsPassive="true"' : ''}>
        <saml:Issuer>${saml.entityId}</saml:Issuer>
        <samlp:NameIDPolicy Format="${this.getNameIdFormat(saml.nameIdFormat)}" AllowCreate="true"/>
      </samlp:AuthnRequest>
    `.trim();

    const encodedRequest = Buffer.from(authnRequest).toString('base64');
    return `${saml.ssoUrl}?SAMLRequest=${encodeURIComponent(encodedRequest)}&RelayState=${encodeURIComponent(state)}`;
  }

  /**
   * Generate OIDC Authorization URL
   */
  public generateOIDCAuthnRequest(
    provider: SSOProviderConfig,
    state: string,
    nonce: string,
    request: AuthenticationRequest
  ): string {
    const oidc = provider.oidc!;

    const params = new URLSearchParams({
      response_type: oidc.responseType,
      client_id: oidc.clientId,
      redirect_uri: oidc.redirectUri,
      scope: oidc.scope.join(' '),
      state,
      nonce,
    });

    if (oidc.responseMode) {
      params.append('response_mode', oidc.responseMode);
    }

    if (request.prompt) {
      params.append('prompt', request.prompt);
    }

    if (request.loginHint) {
      params.append('login_hint', request.loginHint);
    }

    if (request.acrValues && request.acrValues.length > 0) {
      params.append('acr_values', request.acrValues.join(' '));
    }

    if (oidc.codeChallengeMethod === 'S256') {
      const codeVerifier = this.generateSecureToken();
      const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    return `${oidc.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Parse SAML Response
   */
  public parseSAMLResponse(xmlResponse: string): SAMLResponse {
    const extractValue = (tag: string): string => {
      const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i');
      const match = xmlResponse.match(regex);
      return match ? match[1] : '';
    };

    const extractAttributes = (): Record<string, string | string[]> => {
      const attributes: Record<string, string | string[]> = {};
      const attrRegex =
        /<(?:saml:)?Attribute\s+Name="([^"]+)"[^>]*>[\s\S]*?<(?:saml:)?AttributeValue[^>]*>([^<]*)<\/(?:saml:)?AttributeValue>/gi;
      let match;
      while ((match = attrRegex.exec(xmlResponse)) !== null) {
        const name = match[1];
        const value = match[2];
        if (attributes[name]) {
          if (Array.isArray(attributes[name])) {
            (attributes[name] as string[]).push(value);
          } else {
            attributes[name] = [attributes[name] as string, value];
          }
        } else {
          attributes[name] = value;
        }
      }
      return attributes;
    };

    return {
      issuer: extractValue('(?:saml:)?Issuer'),
      nameId: extractValue('(?:saml:)?NameID'),
      nameIdFormat: 'emailAddress',
      sessionIndex: extractValue('SessionIndex'),
      attributes: extractAttributes(),
      signature: {
        valid: xmlResponse.includes('SignatureValue'),
        algorithm: 'sha256',
      },
    };
  }

  /**
   * Generate SAML Logout Request URL
   */
  public generateSAMLLogoutRequest(
    provider: SSOProviderConfig,
    sessionIndex?: string,
    nameId?: string
  ): string {
    const saml = provider.saml!;
    const id = '_' + this.generateSecureToken();
    const issueInstant = new Date().toISOString();

    const logoutRequest = `
      <samlp:LogoutRequest
        xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        ID="${id}"
        Version="2.0"
        IssueInstant="${issueInstant}"
        Destination="${saml.sloUrl}">
        <saml:Issuer>${saml.entityId}</saml:Issuer>
        <saml:NameID>${nameId}</saml:NameID>
        ${sessionIndex ? `<samlp:SessionIndex>${sessionIndex}</samlp:SessionIndex>` : ''}
      </samlp:LogoutRequest>
    `.trim();

    const encodedRequest = Buffer.from(logoutRequest).toString('base64');
    return `${saml.sloUrl}?SAMLRequest=${encodeURIComponent(encodedRequest)}`;
  }

  /**
   * Generate OIDC Logout URL
   */
  public generateOIDCLogoutUrl(provider: SSOProviderConfig, idTokenHint?: string): string {
    const oidc = provider.oidc!;
    const logoutUrl = oidc.issuer + '/v2/logout';

    const params = new URLSearchParams({
      client_id: oidc.clientId,
    });

    if (oidc.postLogoutRedirectUri) {
      params.append('post_logout_redirect_uri', oidc.postLogoutRedirectUri);
    }

    if (idTokenHint) {
      params.append('id_token_hint', idTokenHint);
    }

    return `${logoutUrl}?${params.toString()}`;
  }

  /**
   * Get SAML NameID format URN
   */
  private getNameIdFormat(format: string): string {
    const formats: Record<string, string> = {
      emailAddress: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      persistent: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      transient: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
      unspecified: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
    };
    return formats[format] || formats.unspecified;
  }
}
