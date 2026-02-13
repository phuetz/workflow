/**
 * Wallet Service
 * Multi-wallet integration and management
 */

import { ethers } from 'ethers';
import WalletConnect from '@walletconnect/web3-provider';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import { EventEmitter } from 'events';

export interface WalletConfig {
  supportedChains: number[];
  rpcUrls: Record<number, string>;
  infuraId?: string;
  projectId?: string;
  appName: string;
  appLogoUrl?: string;
}

export interface WalletInfo {
  name: string;
  icon: string;
  type: WalletType;
  isInstalled: boolean;
  isConnected: boolean;
  accounts: string[];
  chainId?: number;
}

export enum WalletType {
  METAMASK = 'metamask',
  WALLETCONNECT = 'walletconnect',
  COINBASE = 'coinbase',
  FORTMATIC = 'fortmatic',
  PORTIS = 'portis',
  TORUS = 'torus',
  LEDGER = 'ledger',
  TREZOR = 'trezor'
}

export interface Transaction {
  to: string;
  value?: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  nonce?: number;
}

export interface TransactionResult {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  status: 'success' | 'failed';
  blockNumber: number;
  timestamp: number;
}

export class WalletService extends EventEmitter {
  private config: WalletConfig;
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private currentWallet: WalletType | null = null;
  private walletConnectProvider: unknown = null;
  private coinbaseWallet: unknown = null;
  
  constructor(config: WalletConfig) {
    super();
    this.config = config;
    this.initialize();
  }
  
  private initialize(): void {
    // Initialize Coinbase Wallet
    this.coinbaseWallet = new CoinbaseWalletSDK({
      appName: this.config.appName,
      appLogoUrl: this.config.appLogoUrl,
      darkMode: false
    });
    
    console.log('Wallet Service initialized');
  }
  
  // Wallet Detection
  
  public getAvailableWallets(): WalletInfo[] {
    const wallets: WalletInfo[] = [];
    
    // MetaMask
    wallets.push({
      name: 'MetaMask',
      icon: '/icons/metamask.svg',
      type: WalletType.METAMASK,
      isInstalled: this.isMetaMaskInstalled(),
      isConnected: false,
      accounts: []
    });
    
    // WalletConnect
    wallets.push({
      name: 'WalletConnect',
      icon: '/icons/walletconnect.svg',
      type: WalletType.WALLETCONNECT,
      isInstalled: true, // Always available
      isConnected: false,
      accounts: []
    });
    
    // Coinbase Wallet
    wallets.push({
      name: 'Coinbase Wallet',
      icon: '/icons/coinbase.svg',
      type: WalletType.COINBASE,
      isInstalled: true, // SDK always available
      isConnected: false,
      accounts: []
    });
    
    return wallets;
  }
  
  private isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && 
           typeof (window as unknown).ethereum !== 'undefined' &&
           (window as unknown).ethereum.isMetaMask;
  }
  
  // Connection Methods
  
  public async connectWallet(walletType: WalletType): Promise<string[]> {
    try {
      let provider: unknown;
      
      switch (walletType) {
        case WalletType.METAMASK:
          provider = await this.connectMetaMask();
          break;
          
        case WalletType.WALLETCONNECT:
          provider = await this.connectWalletConnect();
          break;
          
        case WalletType.COINBASE:
          provider = await this.connectCoinbase();
          break;
          
        default:
          throw new Error(`Unsupported wallet type: ${walletType}`);
      }
      
      this.provider = new ethers.providers.Web3Provider(provider);
      this.signer = this.provider.getSigner();
      this.currentWallet = walletType;
      
      const accounts = await this.provider.listAccounts();
      const network = await this.provider.getNetwork();
      
      // Set up event listeners
      this.setupEventListeners(provider);
      
      this.emit('connected', {
        wallet: walletType,
        accounts,
        chainId: network.chainId
      });
      
      return accounts;
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  private async connectMetaMask(): Promise<unknown> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed');
    }
    
    const ethereum = (window as unknown).ethereum;
    
    // Request account access
    await ethereum.request({ method: 'eth_requestAccounts' });
    
    return ethereum;
  }
  
  private async connectWalletConnect(): Promise<unknown> {
    this.walletConnectProvider = new WalletConnect({
      rpc: this.config.rpcUrls,
      chainId: this.config.supportedChains[0],
      projectId: this.config.projectId
    });
    
    // Enable session (triggers QR Code modal)
    await this.walletConnectProvider.enable();
    
    return this.walletConnectProvider;
  }
  
  private async connectCoinbase(): Promise<unknown> {
    const ethereum = this.coinbaseWallet.makeWeb3Provider(
      this.config.rpcUrls[this.config.supportedChains[0]],
      this.config.supportedChains[0]
    );
    
    await ethereum.request({ method: 'eth_requestAccounts' });
    
    return ethereum;
  }
  
  public async disconnect(): Promise<void> {
    if (this.walletConnectProvider) {
      await this.walletConnectProvider.disconnect();
      this.walletConnectProvider = null;
    }
    
    if (this.coinbaseWallet) {
      this.coinbaseWallet.disconnect();
    }
    
    this.provider = null;
    this.signer = null;
    this.currentWallet = null;
    
    this.emit('disconnected');
  }
  
  // Network Management
  
  public async switchNetwork(chainId: number): Promise<void> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }
    
    const hexChainId = '0x' + chainId.toString(16);
    
    try {
      await this.provider.send('wallet_switchEthereumChain', [
        { chainId: hexChainId }
      ]);
    } catch (error: unknown) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        await this.addNetwork(chainId);
      } else {
        throw error;
      }
    }
  }
  
  private async addNetwork(chainId: number): Promise<void> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }
    
    const networkConfig = this.getNetworkConfig(chainId);
    
    await this.provider.send('wallet_addEthereumChain', [networkConfig]);
  }
  
  private getNetworkConfig(chainId: number): unknown {
    const configs: Record<number, unknown> = {
      1: {
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.infura.io/v3/' + this.config.infuraId],
        blockExplorerUrls: ['https://etherscan.io']
      },
      137: {
        chainId: '0x89',
        chainName: 'Polygon Mainnet',
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        rpcUrls: ['https://polygon-rpc.com'],
        blockExplorerUrls: ['https://polygonscan.com']
      },
      56: {
        chainId: '0x38',
        chainName: 'Binance Smart Chain',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        rpcUrls: ['https://bsc-dataseed.binance.org'],
        blockExplorerUrls: ['https://bscscan.com']
      },
      43114: {
        chainId: '0xa86a',
        chainName: 'Avalanche C-Chain',
        nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
        rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
        blockExplorerUrls: ['https://snowtrace.io']
      }
    };
    
    return configs[chainId] || {
      chainId: '0x' + chainId.toString(16),
      chainName: `Chain ${chainId}`,
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: [this.config.rpcUrls[chainId]],
      blockExplorerUrls: ['']
    };
  }
  
  // Transaction Methods
  
  public async sendTransaction(transaction: Transaction): Promise<TransactionResult> {
    if (!this.signer) {
      throw new Error('No wallet connected');
    }
    
    try {
      const tx = await this.signer.sendTransaction(transaction);
      const receipt = await tx.wait();
      
      const result: TransactionResult = {
        hash: receipt.transactionHash,
        from: receipt.from,
        to: receipt.to,
        value: tx.value.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        blockNumber: receipt.blockNumber,
        timestamp: Date.now()
      };
      
      this.emit('transactionComplete', result);
      
      return result;
      
    } catch (error) {
      this.emit('transactionError', error);
      throw error;
    }
  }
  
  public async signMessage(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error('No wallet connected');
    }
    
    return await this.signer.signMessage(message);
  }
  
  public async signTypedData(domain: unknown, types: unknown, value: unknown): Promise<string> {
    if (!this.signer || !this.signer._signTypedData) {
      throw new Error('No wallet connected or signing not supported');
    }
    
    return await this.signer._signTypedData(domain, types, value);
  }
  
  // Balance and Info Methods
  
  public async getBalance(address?: string): Promise<string> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }
    
    const account = address || await this.getAccount();
    const balance = await this.provider.getBalance(account);
    
    return ethers.utils.formatEther(balance);
  }
  
  public async getTokenBalance(tokenAddress: string, userAddress?: string): Promise<string> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }
    
    const account = userAddress || await this.getAccount();
    
    // ERC20 ABI for balanceOf
    const abi = ['function balanceOf(address owner) view returns (uint256)'];
    const contract = new ethers.Contract(tokenAddress, abi, this.provider);
    
    const balance = await contract.balanceOf(account);
    
    return ethers.utils.formatEther(balance);
  }
  
  public async getAccount(): Promise<string> {
    if (!this.signer) {
      throw new Error('No wallet connected');
    }
    
    return await this.signer.getAddress();
  }
  
  public async getNetwork(): Promise<ethers.providers.Network> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }
    
    return await this.provider.getNetwork();
  }
  
  public async getGasPrice(): Promise<string> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }
    
    const gasPrice = await this.provider.getGasPrice();
    return ethers.utils.formatUnits(gasPrice, 'gwei');
  }
  
  public async estimateGas(transaction: Transaction): Promise<string> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }
    
    const gasEstimate = await this.provider.estimateGas(transaction);
    return gasEstimate.toString();
  }
  
  // Event Handling
  
  private setupEventListeners(provider: unknown): void {
    if (provider.on) {
      provider.on('accountsChanged', (accounts: string[]) => {
        this.emit('accountsChanged', accounts);
        
        if (accounts.length === 0) {
          this.disconnect();
        }
      });
      
      provider.on('chainChanged', (chainId: string) => {
        const numericChainId = parseInt(chainId, 16);
        this.emit('chainChanged', numericChainId);
      });
      
      provider.on('disconnect', () => {
        this.disconnect();
      });
    }
  }
  
  // Utility Methods
  
  public isConnected(): boolean {
    return this.provider !== null && this.signer !== null;
  }
  
  public getCurrentWallet(): WalletType | null {
    return this.currentWallet;
  }
  
  public getProvider(): ethers.providers.Web3Provider | null {
    return this.provider;
  }
  
  public getSigner(): ethers.Signer | null {
    return this.signer;
  }
  
  // Contract Interaction Helpers
  
  public getContract(address: string, abi: unknown): ethers.Contract {
    if (!this.signer) {
      throw new Error('No wallet connected');
    }
    
    return new ethers.Contract(address, abi, this.signer);
  }
  
  public getReadOnlyContract(address: string, abi: unknown): ethers.Contract {
    if (!this.provider) {
      throw new Error('No provider available');
    }
    
    return new ethers.Contract(address, abi, this.provider);
  }
  
  // Transaction History
  
  public async getTransactionHistory(address?: string, limit: number = 10): Promise<unknown[]> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }
    
    const account = address || await this.getAccount();
    
    // Get recent blocks to scan for transactions
    const currentBlock = await this.provider.getBlockNumber();
    const transactions: unknown[] = [];
    
    // This is a simplified implementation
    // In production, use a proper indexing service like The Graph or Moralis
    for (let i = 0; i < Math.min(100, limit * 10); i++) {
      try {
        const block = await this.provider.getBlock(currentBlock - i);
        
        for (const txHash of block.transactions.slice(0, 10)) {
          const tx = await this.provider.getTransaction(txHash);
          
          if (tx.from === account || tx.to === account) {
            const receipt = await this.provider.getTransactionReceipt(txHash);
            
            transactions.push({
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: ethers.utils.formatEther(tx.value),
              gasUsed: receipt?.gasUsed?.toString(),
              status: receipt?.status === 1 ? 'success' : 'failed',
              blockNumber: tx.blockNumber,
              timestamp: block.timestamp * 1000
            });
            
            if (transactions.length >= limit) {
              return transactions;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching transaction:', error);
      }
    }
    
    return transactions;
  }
  
  // ENS Support
  
  public async resolveENS(ensName: string): Promise<string | null> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }
    
    try {
      return await this.provider.resolveName(ensName);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return null;
    }
  }
  
  public async lookupENS(address: string): Promise<string | null> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }
    
    try {
      return await this.provider.lookupAddress(address);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return null;
    }
  }
  
  // Multi-signature Wallet Support
  
  public async createMultisigTransaction(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    multisigAddress: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    to: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: string
  ): Promise<string> {
    // This would integrate with Gnosis Safe or similar multisig contracts
    // Implementation depends on the specific multisig contract being used
    throw new Error('Multisig support not implemented yet');
  }
  
  // Hardware Wallet Support
  
  public async connectLedger(): Promise<string[]> {
    // Integration with Ledger hardware wallets
    // Would use @ledgerhq/hw-app-eth
    throw new Error('Ledger support not implemented yet');
  }
  
  public async connectTrezor(): Promise<string[]> {
    // Integration with Trezor hardware wallets
    // Would use trezor-connect
    throw new Error('Trezor support not implemented yet');
  }
}