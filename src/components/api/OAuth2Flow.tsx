/**
 * OAuth2 Flow Component
 * UI for initiating OAuth 2.0 authorization flows
 * PROJET SAUVÉ - Phase 5.2: Credentials Manager
 */

import React, { useState, useCallback } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import type { OAuth2Config } from '../../types/credentials';

interface OAuth2FlowProps {
  onComplete?: (credentialId: string) => void;
  onCancel?: () => void;
}

const OAuth2Flow: React.FC<OAuth2FlowProps> = ({
  onComplete,
  onCancel
}) => {
  const [step, setStep] = useState<'provider' | 'config' | 'auth' | 'complete'>('provider');
  const [provider, setProvider] = useState('custom');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // OAuth2 configuration
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [authorizationUrl, setAuthorizationUrl] = useState('');
  const [tokenUrl, setTokenUrl] = useState('');
  const [redirectUri, setRedirectUri] = useState('http://localhost:3000/oauth/callback');
  const [scope, setScope] = useState('');
  const [usePKCE, setUsePKCE] = useState(true);

  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCredentialId, setCreatedCredentialId] = useState<string | null>(null);

  // Use workflow store for credentials management
  const { credentials, updateCredentials } = useWorkflowStore();

  /**
   * Preset OAuth providers
   */
  const OAUTH_PROVIDERS = {
    google: {
      name: 'Google',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      defaultScope: 'openid profile email'
    },
    github: {
      name: 'GitHub',
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      defaultScope: 'repo user'
    },
    slack: {
      name: 'Slack',
      authorizationUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      defaultScope: 'chat:write channels:read'
    },
    microsoft: {
      name: 'Microsoft',
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      defaultScope: 'openid profile email'
    },
    salesforce: {
      name: 'Salesforce',
      authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
      defaultScope: 'api refresh_token'
    },
    custom: {
      name: 'Custom Provider',
      authorizationUrl: '',
      tokenUrl: '',
      defaultScope: ''
    }
  };

  /**
   * Handle provider selection
   */
  const handleProviderSelect = useCallback((selectedProvider: string) => {
    setProvider(selectedProvider);
    const config = OAUTH_PROVIDERS[selectedProvider as keyof typeof OAUTH_PROVIDERS];
    if (config) {
      setAuthorizationUrl(config.authorizationUrl);
      setTokenUrl(config.tokenUrl);
      setScope(config.defaultScope);
    }
    setStep('config');
  }, []);

  /**
   * Start OAuth authorization flow
   */
  const handleStartAuth = useCallback(async () => {
    if (!name.trim()) {
      setError('Please enter a credential name');
      return;
    }

    if (!clientId || !clientSecret) {
      setError('Please enter Client ID and Client Secret');
      return;
    }

    if (!authorizationUrl || !tokenUrl) {
      setError('Please enter Authorization URL and Token URL');
      return;
    }

    setError(null);
    setAuthorizing(true);
    setStep('auth');

    try {
      const config: OAuth2Config = {
        authorizationUrl,
        tokenUrl,
        clientId,
        clientSecret,
        redirectUri,
        scope: scope || undefined,
        grantType: 'authorization_code',
        usePKCE
      };

      // Start OAuth flow - open authorization URL in new window
      const state = crypto.randomUUID();
      const authUrl = new URL(config.authorizationUrl);
      authUrl.searchParams.set('client_id', config.clientId);
      authUrl.searchParams.set('redirect_uri', config.redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', state);
      if (config.scope) authUrl.searchParams.set('scope', config.scope);

      // Store config for callback handling
      sessionStorage.setItem('oauth2_state', state);
      sessionStorage.setItem('oauth2_config', JSON.stringify(config));

      // Open auth window
      const authWindow = window.open(authUrl.toString(), 'OAuth2', 'width=600,height=700');

      // Poll for completion (callback will set the credential)
      const pollInterval = setInterval(() => {
        const credentialId = sessionStorage.getItem('oauth2_credential_id');
        if (credentialId) {
          clearInterval(pollInterval);
          sessionStorage.removeItem('oauth2_credential_id');
          setCreatedCredentialId(credentialId);
          setStep('complete');
          setAuthorizing(false);
          if (onComplete) onComplete(credentialId);
        }
        if (authWindow?.closed) {
          clearInterval(pollInterval);
          setAuthorizing(false);
        }
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authorization failed');
      setStep('config');
    } finally {
      // Note: setAuthorizing(false) is called in poll interval
    }
  }, [
    name,
    description,
    clientId,
    clientSecret,
    authorizationUrl,
    tokenUrl,
    redirectUri,
    scope,
    usePKCE,
    credentials,
    updateCredentials,
    onComplete
  ]);

  /**
   * Render provider selection
   */
  const renderProviderSelection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Select OAuth Provider</h3>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(OAUTH_PROVIDERS).map(([key, config]) => (
          <button
            key={key}
            onClick={() => handleProviderSelect(key)}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
          >
            <div className="font-medium">{config.name}</div>
            {key !== 'custom' && (
              <div className="text-xs text-gray-500 mt-1">Pre-configured endpoints</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  /**
   * Render configuration form
   */
  const renderConfigForm = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Configure OAuth 2.0</h3>

      <div>
        <label className="block text-sm font-medium mb-1">
          Credential Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="My OAuth Credential"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description (optional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Brief description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Client ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="your-client-id"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Client Secret <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="your-client-secret"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Authorization URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={authorizationUrl}
          onChange={(e) => setAuthorizationUrl(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="https://provider.com/oauth/authorize"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Token URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={tokenUrl}
          onChange={(e) => setTokenUrl(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="https://provider.com/oauth/token"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Redirect URI</label>
        <input
          type="url"
          value={redirectUri}
          onChange={(e) => setRedirectUri(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="http://localhost:3000/oauth/callback"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Scope (optional)</label>
        <input
          type="text"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="read write"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="usePKCE"
          checked={usePKCE}
          onChange={(e) => setUsePKCE(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="usePKCE" className="text-sm">
          Use PKCE (Proof Key for Code Exchange) - Recommended
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-900 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <button
          onClick={handleStartAuth}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Start Authorization
        </button>
        <button
          onClick={() => setStep('provider')}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
        >
          Back
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  /**
   * Render authorization in progress
   */
  const renderAuthInProgress = () => (
    <div className="space-y-4 text-center py-8">
      <div className="text-4xl mb-4">🔐</div>
      <h3 className="text-lg font-semibold">Authorizing...</h3>
      <p className="text-gray-600">
        Please complete the authorization in the popup window.
      </p>
      <div className="animate-pulse text-blue-600">
        Waiting for authorization...
      </div>
    </div>
  );

  /**
   * Render completion
   */
  const renderComplete = () => (
    <div className="space-y-4 text-center py-8">
      <div className="text-6xl mb-4">✓</div>
      <h3 className="text-lg font-semibold text-green-600">Authorization Complete!</h3>
      <p className="text-gray-600">
        Your OAuth 2.0 credential has been successfully created and tokens have been stored securely.
      </p>
      <div className="bg-green-50 p-4 rounded-md">
        <p className="text-sm text-green-900">
          Credential ID: <code className="font-mono">{createdCredentialId}</code>
        </p>
      </div>
      <button
        onClick={onCancel}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Close
      </button>
    </div>
  );

  /**
   * Render current step
   */
  const renderStep = () => {
    switch (step) {
      case 'provider':
        return renderProviderSelection();
      case 'config':
        return renderConfigForm();
      case 'auth':
        return renderAuthInProgress();
      case 'complete':
        return renderComplete();
      default:
        return null;
    }
  };

  return (
    <div className="oauth2-flow bg-white rounded-lg p-6 max-w-2xl">
      {renderStep()}
    </div>
  );
};

export default OAuth2Flow;
