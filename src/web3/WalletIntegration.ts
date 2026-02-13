/**
 * Wallet Integration
 * Connect and manage multiple wallet types: MetaMask, WalletConnect, Hardware wallets
 */

import type {
  BlockchainNetwork,
  WalletType,
  WalletConnection,
  Transaction,
  MultiSigWallet,
  MultiSigTransaction,
} from '../types/web3';
import { blockchainConnector, NETWORK_CONFIGS } from './BlockchainConnector';

export class WalletIntegration {
  private activeWallet?: WalletConnection;
  private listeners: Map<string, Set<WalletEventListener>> = new Map();

  /**
   * Connect wallet
   */
  async connect(type: WalletType, network?: BlockchainNetwork): Promise<WalletConnection> {
    switch (type) {
      case 'metamask':
        return await this.connectMetaMask(network);
      case 'walletconnect':
        return await this.connectWalletConnect(network);
      case 'coinbase':
        return await this.connectCoinbaseWallet(network);
      case 'ledger':
        return await this.connectLedger(network);
      case 'phantom':
        return await this.connectPhantom();
      case 'keplr':
        return await this.connectKeplr();
      case 'gnosis-safe':
        return await this.connectGnosisSafe(network);
      default:
        throw new Error(`Unsupported wallet type: ${type}`);
    }
  }

  /**
   * Connect MetaMask
   */
  private async connectMetaMask(network?: BlockchainNetwork): Promise<WalletConnection> {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      throw new Error('MetaMask not installed');
    }

    const ethereum = (window as any).ethereum;

    // Request accounts
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const address = accounts[0];

    // Get chainId
    const chainId = parseInt(await ethereum.request({ method: 'eth_chainId' }), 16);

    // Determine network
    const detectedNetwork = this.getNetworkFromChainId(chainId);

    // Switch network if requested
    if (network && network !== detectedNetwork) {
      await this.switchNetwork(network);
    }

    const finalNetwork = network || detectedNetwork;
    const balance = await blockchainConnector.getBalance(finalNetwork, address);

    const connection: WalletConnection = {
      type: 'metamask',
      address,
      network: finalNetwork,
      balance,
      connected: true,
      chainId,
    };

    this.activeWallet = connection;
    this.setupMetaMaskListeners();
    this.emit('connected', connection);

    return connection;
  }

  /**
   * Connect WalletConnect
   */
  private async connectWalletConnect(network?: BlockchainNetwork): Promise<WalletConnection> {
    // Mock WalletConnect implementation
    // In production, use @walletconnect/web3-provider

    const address = `0x${Math.random().toString(16).slice(2, 42)}`;
    const finalNetwork = network || 'ethereum';
    const balance = await blockchainConnector.getBalance(finalNetwork, address);

    const connection: WalletConnection = {
      type: 'walletconnect',
      address,
      network: finalNetwork,
      balance,
      connected: true,
    };

    this.activeWallet = connection;
    this.emit('connected', connection);

    return connection;
  }

  /**
   * Connect Coinbase Wallet
   */
  private async connectCoinbaseWallet(network?: BlockchainNetwork): Promise<WalletConnection> {
    if (typeof window === 'undefined' || !(window as any).coinbaseSolana) {
      throw new Error('Coinbase Wallet not installed');
    }

    // Mock implementation
    const address = `0x${Math.random().toString(16).slice(2, 42)}`;
    const finalNetwork = network || 'ethereum';
    const balance = await blockchainConnector.getBalance(finalNetwork, address);

    const connection: WalletConnection = {
      type: 'coinbase',
      address,
      network: finalNetwork,
      balance,
      connected: true,
    };

    this.activeWallet = connection;
    this.emit('connected', connection);

    return connection;
  }

  /**
   * Connect Ledger Hardware Wallet
   */
  private async connectLedger(network?: BlockchainNetwork): Promise<WalletConnection> {
    // Mock Ledger connection
    // In production, use @ledgerhq/hw-transport-webusb and @ledgerhq/hw-app-eth

    const address = `0x${Math.random().toString(16).slice(2, 42)}`;
    const finalNetwork = network || 'ethereum';
    const balance = await blockchainConnector.getBalance(finalNetwork, address);

    const connection: WalletConnection = {
      type: 'ledger',
      address,
      network: finalNetwork,
      balance,
      connected: true,
    };

    this.activeWallet = connection;
    this.emit('connected', connection);

    return connection;
  }

  /**
   * Connect Phantom (Solana)
   */
  private async connectPhantom(): Promise<WalletConnection> {
    if (typeof window === 'undefined' || !(window as any).solana) {
      throw new Error('Phantom wallet not installed');
    }

    const solana = (window as any).solana;
    const response = await solana.connect();
    const address = response.publicKey.toString();

    const balance = await blockchainConnector.getBalance('solana', address);

    const connection: WalletConnection = {
      type: 'phantom',
      address,
      network: 'solana',
      balance,
      connected: true,
    };

    this.activeWallet = connection;
    this.setupPhantomListeners();
    this.emit('connected', connection);

    return connection;
  }

  /**
   * Connect Keplr (Cosmos)
   */
  private async connectKeplr(): Promise<WalletConnection> {
    if (typeof window === 'undefined' || !(window as any).keplr) {
      throw new Error('Keplr wallet not installed');
    }

    const keplr = (window as any).keplr;
    await keplr.enable('cosmoshub-4');
    const account = await keplr.getKey('cosmoshub-4');

    const address = account.bech32Address;
    const balance = await blockchainConnector.getBalance('cosmos', address);

    const connection: WalletConnection = {
      type: 'keplr',
      address,
      network: 'cosmos',
      balance,
      connected: true,
    };

    this.activeWallet = connection;
    this.emit('connected', connection);

    return connection;
  }

  /**
   * Connect Gnosis Safe (Multi-sig)
   */
  private async connectGnosisSafe(network?: BlockchainNetwork): Promise<WalletConnection> {
    // Mock Gnosis Safe connection
    const address = `0x${Math.random().toString(16).slice(2, 42)}`;
    const finalNetwork = network || 'ethereum';
    const balance = await blockchainConnector.getBalance(finalNetwork, address);

    const connection: WalletConnection = {
      type: 'gnosis-safe',
      address,
      network: finalNetwork,
      balance,
      connected: true,
    };

    this.activeWallet = connection;
    this.emit('connected', connection);

    return connection;
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    if (!this.activeWallet) return;

    const wallet = this.activeWallet;
    this.activeWallet = undefined;
    this.emit('disconnected', wallet);
  }

  /**
   * Switch network
   */
  async switchNetwork(network: BlockchainNetwork): Promise<void> {
    if (!this.activeWallet) {
      throw new Error('No wallet connected');
    }

    const config = NETWORK_CONFIGS[network];

    if (this.activeWallet.type === 'metamask') {
      const ethereum = (window as any).ethereum;

      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${config.chainId.toString(16)}` }],
        });
      } catch (error: any) {
        // Chain not added, add it
        if (error.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${config.chainId.toString(16)}`,
              chainName: config.name,
              nativeCurrency: config.nativeCurrency,
              rpcUrls: [config.rpcUrl],
              blockExplorerUrls: [config.explorerUrl],
            }],
          });
        } else {
          throw error;
        }
      }
    }

    this.activeWallet.network = network;
    this.activeWallet.chainId = config.chainId;
    this.emit('networkChanged', network);
  }

  /**
   * Sign message
   */
  async signMessage(message: string): Promise<string> {
    if (!this.activeWallet) {
      throw new Error('No wallet connected');
    }

    if (this.activeWallet.type === 'metamask') {
      const ethereum = (window as any).ethereum;
      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, this.activeWallet.address],
      });
      return signature;
    }

    if (this.activeWallet.type === 'phantom') {
      const solana = (window as any).solana;
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await solana.signMessage(encodedMessage, 'utf8');
      return Buffer.from(signedMessage.signature).toString('hex');
    }

    // Mock signature for other wallets
    return `0x${Math.random().toString(16).slice(2)}`;
  }

  /**
   * Sign transaction
   */
  async signTransaction(tx: Partial<Transaction>): Promise<string> {
    if (!this.activeWallet) {
      throw new Error('No wallet connected');
    }

    if (this.activeWallet.type === 'metamask') {
      const ethereum = (window as any).ethereum;
      const signature = await ethereum.request({
        method: 'eth_signTransaction',
        params: [tx],
      });
      return signature;
    }

    // Mock signature for other wallets
    return `0x${Math.random().toString(16).slice(2)}`;
  }

  /**
   * Send transaction
   */
  async sendTransaction(tx: Partial<Transaction>): Promise<string> {
    if (!this.activeWallet) {
      throw new Error('No wallet connected');
    }

    if (this.activeWallet.type === 'metamask') {
      const ethereum = (window as any).ethereum;
      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ ...tx, from: this.activeWallet.address }],
      });
      return txHash;
    }

    // Use connector for other wallets
    const receipt = await blockchainConnector.sendTransaction(
      this.activeWallet.network,
      { ...tx, from: this.activeWallet.address }
    );

    return receipt.transactionHash;
  }

  /**
   * Get active wallet
   */
  getActiveWallet(): WalletConnection | undefined {
    return this.activeWallet;
  }

  /**
   * Get balance
   */
  async getBalance(): Promise<string> {
    if (!this.activeWallet) {
      throw new Error('No wallet connected');
    }

    const balance = await blockchainConnector.getBalance(
      this.activeWallet.network,
      this.activeWallet.address
    );

    this.activeWallet.balance = balance;
    return balance;
  }

  /**
   * Add custom token to wallet
   */
  async addToken(
    address: string,
    symbol: string,
    decimals: number,
    image?: string
  ): Promise<boolean> {
    if (!this.activeWallet || this.activeWallet.type !== 'metamask') {
      return false;
    }

    const ethereum = (window as any).ethereum;

    try {
      const wasAdded = await ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address,
            symbol,
            decimals,
            image,
          },
        },
      });
      return wasAdded;
    } catch {
      return false;
    }
  }

  /**
   * Create multi-sig wallet
   */
  async createMultiSigWallet(
    network: BlockchainNetwork,
    owners: string[],
    threshold: number
  ): Promise<MultiSigWallet> {
    if (threshold > owners.length || threshold < 1) {
      throw new Error('Invalid threshold');
    }

    // Deploy multi-sig contract (Gnosis Safe)
    const address = `0x${Math.random().toString(16).slice(2, 42)}`;

    const wallet: MultiSigWallet = {
      address,
      network,
      owners,
      threshold,
      nonce: 0,
    };

    return wallet;
  }

  /**
   * Propose multi-sig transaction
   */
  async proposeMultiSigTx(
    wallet: MultiSigWallet,
    to: string,
    value: string,
    data: string
  ): Promise<MultiSigTransaction> {
    const tx: MultiSigTransaction = {
      wallet,
      to,
      value,
      data,
      executed: false,
      confirmations: [],
      requiredConfirmations: wallet.threshold,
    };

    return tx;
  }

  /**
   * Confirm multi-sig transaction
   */
  async confirmMultiSigTx(
    tx: MultiSigTransaction,
    signer: string
  ): Promise<void> {
    if (tx.confirmations.includes(signer)) {
      throw new Error('Already confirmed');
    }

    if (!tx.wallet.owners.includes(signer)) {
      throw new Error('Not an owner');
    }

    tx.confirmations.push(signer);

    // Execute if threshold reached
    if (tx.confirmations.length >= tx.requiredConfirmations && !tx.executed) {
      await this.executeMultiSigTx(tx);
    }
  }

  /**
   * Execute multi-sig transaction
   */
  private async executeMultiSigTx(tx: MultiSigTransaction): Promise<void> {
    if (tx.executed) {
      throw new Error('Already executed');
    }

    if (tx.confirmations.length < tx.requiredConfirmations) {
      throw new Error('Not enough confirmations');
    }

    // Execute transaction
    await blockchainConnector.sendTransaction(tx.wallet.network, {
      to: tx.to,
      value: tx.value,
      data: tx.data,
    });

    tx.executed = true;
    tx.wallet.nonce++;
  }

  /**
   * Verify signature
   */
  async verifySignature(
    message: string,
    signature: string,
    address: string
  ): Promise<boolean> {
    // Mock verification
    // In production, use ethers.js verifyMessage
    return true;
  }

  /**
   * Setup MetaMask event listeners
   */
  private setupMetaMaskListeners(): void {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;

    const ethereum = (window as any).ethereum;

    ethereum.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        this.disconnect();
      } else if (this.activeWallet) {
        this.activeWallet.address = accounts[0];
        this.emit('accountChanged', accounts[0]);
      }
    });

    ethereum.on('chainChanged', (chainId: string) => {
      const network = this.getNetworkFromChainId(parseInt(chainId, 16));
      if (this.activeWallet) {
        this.activeWallet.network = network;
        this.activeWallet.chainId = parseInt(chainId, 16);
        this.emit('networkChanged', network);
      }
    });

    ethereum.on('disconnect', () => {
      this.disconnect();
    });
  }

  /**
   * Setup Phantom event listeners
   */
  private setupPhantomListeners(): void {
    if (typeof window === 'undefined' || !(window as any).solana) return;

    const solana = (window as any).solana;

    solana.on('accountChanged', (publicKey: any) => {
      if (publicKey && this.activeWallet) {
        this.activeWallet.address = publicKey.toString();
        this.emit('accountChanged', publicKey.toString());
      } else {
        this.disconnect();
      }
    });

    solana.on('disconnect', () => {
      this.disconnect();
    });
  }

  /**
   * Get network from chain ID
   */
  private getNetworkFromChainId(chainId: number): BlockchainNetwork {
    for (const [network, config] of Object.entries(NETWORK_CONFIGS)) {
      if (config.chainId === chainId) {
        return network as BlockchainNetwork;
      }
    }
    return 'ethereum';
  }

  /**
   * Event listener management
   */
  on(event: WalletEvent, listener: WalletEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: WalletEvent, listener: WalletEventListener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  private emit(event: WalletEvent, data?: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(data));
    }
  }
}

type WalletEvent = 'connected' | 'disconnected' | 'accountChanged' | 'networkChanged';
type WalletEventListener = (data?: any) => void;

// Singleton instance
export const walletIntegration = new WalletIntegration();
