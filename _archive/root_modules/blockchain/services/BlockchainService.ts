/**
 * Blockchain Service
 * Web3 integration and smart contract interaction
 */

import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';
import Web3Modal from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { EventEmitter } from 'events';
import WorkflowNFT from '../contracts/WorkflowNFT.json';
import WorkflowDAO from '../contracts/WorkflowDAO.json';
import WorkflowToken from '../contracts/WorkflowToken.json';
import WorkflowExecutor from '../contracts/WorkflowExecutor.json';

export interface BlockchainConfig {
  networkName: string;
  rpcUrl: string;
  chainId: number;
  contracts: {
    nft?: string;
    dao?: string;
    token?: string;
    executor?: string;
  };
  ipfs: {
    host: string;
    port: number;
    protocol: string;
  };
}

export interface WorkflowNFTMetadata {
  name: string;
  description: string;
  image?: string;
  workflowDefinition: unknown;
  category: string;
  tags: string[];
  version: string;
  author: string;
  license: string;
}

export class BlockchainService extends EventEmitter {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer | null = null;
  private contracts: {
    nft?: ethers.Contract;
    dao?: ethers.Contract;
    token?: ethers.Contract;
    executor?: ethers.Contract;
  } = {};
  private ipfs: unknown;
  private web3Modal: Web3Modal;
  private config: BlockchainConfig;
  
  constructor(config: BlockchainConfig) {
    super();
    this.config = config;
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    // Initialize provider
    this.provider = new ethers.providers.JsonRpcProvider(this.config.rpcUrl);
    
    // Initialize IPFS
    this.ipfs = create({
      host: this.config.ipfs.host,
      port: this.config.ipfs.port,
      protocol: this.config.ipfs.protocol
    });
    
    // Initialize Web3Modal
    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          rpc: {
            [this.config.chainId]: this.config.rpcUrl
          }
        }
      }
    };
    
    this.web3Modal = new Web3Modal({
      network: this.config.networkName,
      cacheProvider: true,
      providerOptions
    });
    
    console.log('Blockchain Service initialized');
  }
  
  // Wallet Connection
  
  public async connectWallet(): Promise<string> {
    try {
      const instance = await this.web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(instance);
      this.signer = provider.getSigner();
      
      // Initialize contracts with signer
      await this.initializeContracts();
      
      const address = await this.signer.getAddress();
      
      // Subscribe to account changes
      instance.on('accountsChanged', (accounts: string[]) => {
        this.emit('accountsChanged', accounts);
      });
      
      instance.on('chainChanged', (chainId: number) => {
        this.emit('chainChanged', chainId);
      });
      
      this.emit('connected', address);
      return address;
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  public async disconnectWallet(): Promise<void> {
    await this.web3Modal.clearCachedProvider();
    this.signer = null;
    this.emit('disconnected');
  }
  
  public async getAccount(): Promise<string | null> {
    if (!this.signer) return null;
    return await this.signer.getAddress();
  }
  
  public async getBalance(address?: string): Promise<ethers.BigNumber> {
    const account = address || await this.getAccount();
    if (!account) throw new Error('No account connected');
    
    return await this.provider.getBalance(account);
  }
  
  // Contract Initialization
  
  private async initializeContracts(): Promise<void> {
    if (!this.signer) throw new Error('No signer available');
    
    if (this.config.contracts.nft) {
      this.contracts.nft = new ethers.Contract(
        this.config.contracts.nft,
        WorkflowNFT.abi,
        this.signer
      );
    }
    
    if (this.config.contracts.dao) {
      this.contracts.dao = new ethers.Contract(
        this.config.contracts.dao,
        WorkflowDAO.abi,
        this.signer
      );
    }
    
    if (this.config.contracts.token) {
      this.contracts.token = new ethers.Contract(
        this.config.contracts.token,
        WorkflowToken.abi,
        this.signer
      );
    }
    
    if (this.config.contracts.executor) {
      this.contracts.executor = new ethers.Contract(
        this.config.contracts.executor,
        WorkflowExecutor.abi,
        this.signer
      );
    }
  }
  
  // NFT Operations
  
  public async mintWorkflowNFT(
    metadata: WorkflowNFTMetadata,
    isPublic: boolean,
    price: ethers.BigNumber,
    royaltyPercentage: number
  ): Promise<string> {
    if (!this.contracts.nft) throw new Error('NFT contract not initialized');
    
    // Upload metadata to IPFS
    const metadataUri = await this.uploadToIPFS(metadata);
    
    // Calculate workflow hash
    const workflowHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(JSON.stringify(metadata.workflowDefinition))
    );
    
    // Convert royalty percentage to basis points (e.g., 2.5% = 250)
    const royaltyBasisPoints = Math.floor(royaltyPercentage * 100);
    
    // Mint NFT
    const tx = await this.contracts.nft.mintWorkflow(
      metadata.name,
      metadata.description,
      metadata.category,
      metadataUri,
      workflowHash,
      isPublic,
      price,
      royaltyBasisPoints
    );
    
    const receipt = await tx.wait();
    const event = receipt.events?.find((e: unknown) => e.event === 'WorkflowMinted');
    
    if (!event) throw new Error('Minting failed');
    
    const tokenId = event.args.tokenId.toString();
    
    this.emit('workflowMinted', {
      tokenId,
      creator: await this.getAccount(),
      name: metadata.name,
      txHash: receipt.transactionHash
    });
    
    return tokenId;
  }
  
  public async updateWorkflowNFT(
    tokenId: string,
    metadata: WorkflowNFTMetadata,
    newPrice: ethers.BigNumber
  ): Promise<void> {
    if (!this.contracts.nft) throw new Error('NFT contract not initialized');
    
    const metadataUri = await this.uploadToIPFS(metadata);
    
    const tx = await this.contracts.nft.updateWorkflow(
      tokenId,
      metadataUri,
      metadata.description,
      newPrice
    );
    
    await tx.wait();
    
    this.emit('workflowUpdated', { tokenId });
  }
  
  public async purchaseExecutionRights(
    tokenId: string,
    duration: number,
    executions: number,
    price: ethers.BigNumber
  ): Promise<void> {
    if (!this.contracts.nft) throw new Error('NFT contract not initialized');
    
    const tx = await this.contracts.nft.purchaseExecutionRights(
      tokenId,
      duration,
      executions,
      { value: price }
    );
    
    await tx.wait();
    
    this.emit('executionRightsPurchased', { tokenId, duration, executions });
  }
  
  public async executeWorkflowOnChain(tokenId: string): Promise<void> {
    if (!this.contracts.nft) throw new Error('NFT contract not initialized');
    
    const tx = await this.contracts.nft.executeWorkflow(tokenId);
    await tx.wait();
    
    this.emit('workflowExecuted', { tokenId });
  }
  
  public async getWorkflowDetails(tokenId: string): Promise<unknown> {
    if (!this.contracts.nft) throw new Error('NFT contract not initialized');
    
    const details = await this.contracts.nft.getWorkflowDetails(tokenId);
    const metadata = await this.fetchFromIPFS(details.uri);
    
    return {
      ...details,
      metadata
    };
  }
  
  // DAO Operations
  
  public async createProposal(
    targets: string[],
    values: ethers.BigNumber[],
    calldatas: string[],
    description: string,
    proposalType: number,
    detailedProposal: unknown
  ): Promise<string> {
    if (!this.contracts.dao) throw new Error('DAO contract not initialized');
    
    // Upload detailed proposal to IPFS
    const ipfsHash = await this.uploadToIPFS(detailedProposal);
    
    const tx = await this.contracts.dao.proposeWithMetadata(
      targets,
      values,
      calldatas,
      description,
      proposalType,
      ipfsHash
    );
    
    const receipt = await tx.wait();
    const event = receipt.events?.find((e: unknown) => e.event === 'ProposalCreated');
    
    if (!event) throw new Error('Proposal creation failed');
    
    const proposalId = event.args.proposalId.toString();
    
    this.emit('proposalCreated', {
      proposalId,
      proposer: await this.getAccount(),
      description
    });
    
    return proposalId;
  }
  
  public async vote(
    proposalId: string,
    support: number, // 0 = Against, 1 = For, 2 = Abstain
    reason?: string
  ): Promise<void> {
    if (!this.contracts.dao) throw new Error('DAO contract not initialized');
    
    const tx = reason
      ? await this.contracts.dao.castVoteWithReason(proposalId, support, reason)
      : await this.contracts.dao.castVote(proposalId, support);
    
    await tx.wait();
    
    this.emit('voteCast', { proposalId, support, voter: await this.getAccount() });
  }
  
  public async executeProposal(
    targets: string[],
    values: ethers.BigNumber[],
    calldatas: string[],
    descriptionHash: string
  ): Promise<void> {
    if (!this.contracts.dao) throw new Error('DAO contract not initialized');
    
    const tx = await this.contracts.dao.execute(
      targets,
      values,
      calldatas,
      descriptionHash
    );
    
    await tx.wait();
    
    this.emit('proposalExecuted', { descriptionHash });
  }
  
  public async delegateVotes(delegatee: string): Promise<void> {
    if (!this.contracts.token) throw new Error('Token contract not initialized');
    
    const tx = await this.contracts.token.delegate(delegatee);
    await tx.wait();
    
    this.emit('votesDelegated', { delegatee });
  }
  
  // Token Operations
  
  public async getTokenBalance(address?: string): Promise<ethers.BigNumber> {
    if (!this.contracts.token) throw new Error('Token contract not initialized');
    
    const account = address || await this.getAccount();
    if (!account) throw new Error('No account connected');
    
    return await this.contracts.token.balanceOf(account);
  }
  
  public async stakeTokens(amount: ethers.BigNumber): Promise<void> {
    if (!this.contracts.token) throw new Error('Token contract not initialized');
    
    const tx = await this.contracts.token.stake(amount);
    await tx.wait();
    
    this.emit('tokensStaked', { amount, staker: await this.getAccount() });
  }
  
  public async unstakeTokens(amount: ethers.BigNumber): Promise<void> {
    if (!this.contracts.token) throw new Error('Token contract not initialized');
    
    const tx = await this.contracts.token.unstake(amount);
    await tx.wait();
    
    this.emit('tokensUnstaked', { amount, staker: await this.getAccount() });
  }
  
  // Workflow Execution
  
  public async registerWorkflowExecutor(
    executorAddress: string,
    stake: ethers.BigNumber
  ): Promise<void> {
    if (!this.contracts.executor) throw new Error('Executor contract not initialized');
    
    const tx = await this.contracts.executor.registerExecutor(
      executorAddress,
      { value: stake }
    );
    
    await tx.wait();
    
    this.emit('executorRegistered', { executorAddress });
  }
  
  public async submitExecutionProof(
    workflowId: string,
    executionHash: string,
    gasUsed: number,
    result: string
  ): Promise<void> {
    if (!this.contracts.executor) throw new Error('Executor contract not initialized');
    
    const tx = await this.contracts.executor.submitExecutionProof(
      workflowId,
      executionHash,
      gasUsed,
      result
    );
    
    await tx.wait();
    
    this.emit('executionProofSubmitted', { workflowId, executionHash });
  }
  
  // IPFS Operations
  
  private async uploadToIPFS(data: unknown): Promise<string> {
    try {
      const json = JSON.stringify(data);
      const result = await this.ipfs.add(json);
      return `ipfs://${result.path}`;
    } catch (error) {
      console.error('IPFS upload failed:', error);
      throw new Error('Failed to upload to IPFS');
    }
  }
  
  private async fetchFromIPFS(uri: string): Promise<unknown> {
    try {
      const cid = uri.replace('ipfs://', '');
      const stream = this.ipfs.cat(cid);
      
      let data = '';
      for await (const chunk of stream) {
        data += chunk.toString();
      }
      
      return JSON.parse(data);
    } catch (error) {
      console.error('IPFS fetch failed:', error);
      throw new Error('Failed to fetch from IPFS');
    }
  }
  
  public async uploadWorkflowToIPFS(workflow: unknown): Promise<string> {
    const encrypted = await this.encryptWorkflow(workflow);
    return await this.uploadToIPFS(encrypted);
  }
  
  // Encryption for sensitive workflows
  
  private async encryptWorkflow(workflow: unknown): Promise<unknown> {
    // In production, use proper encryption
    // This is a placeholder
    return {
      encrypted: true,
      data: Buffer.from(JSON.stringify(workflow)).toString('base64')
    };
  }
  
  private async decryptWorkflow(encryptedData: unknown): Promise<unknown> {
    if (!encryptedData.encrypted) return encryptedData;
    
    // In production, use proper decryption
    const decrypted = Buffer.from(encryptedData.data, 'base64').toString();
    return JSON.parse(decrypted);
  }
  
  // Event Subscriptions
  
  public async subscribeToWorkflowEvents(tokenId: string): Promise<void> {
    if (!this.contracts.nft) throw new Error('NFT contract not initialized');
    
    const filter = this.contracts.nft.filters.WorkflowExecuted(tokenId);
    
    this.contracts.nft.on(filter, (tokenId, executor, remaining) => {
      this.emit('workflowExecutionEvent', {
        tokenId: tokenId.toString(),
        executor,
        remaining: remaining.toString()
      });
    });
  }
  
  public async subscribeToDAOEvents(): Promise<void> {
    if (!this.contracts.dao) throw new Error('DAO contract not initialized');
    
    this.contracts.dao.on('ProposalCreated', (proposalId, proposer, proposalType, description) => {
      this.emit('daoProposalCreated', {
        proposalId: proposalId.toString(),
        proposer,
        proposalType,
        description
      });
    });
    
    this.contracts.dao.on('VoteCast', (voter, proposalId, support, weight, reason) => {
      this.emit('daoVoteCast', {
        voter,
        proposalId: proposalId.toString(),
        support,
        weight: weight.toString(),
        reason
      });
    });
  }
  
  // Gas Estimation
  
  public async estimateGas(
    method: string,
    params: unknown[]
  ): Promise<ethers.BigNumber> {
    const contract = this.contracts[method.split('.')[0]];
    if (!contract) throw new Error('Contract not found');
    
    const methodName = method.split('.')[1];
    return await contract.estimateGas[methodName](...params);
  }
  
  // Network Information
  
  public async getNetworkInfo(): Promise<unknown> {
    const network = await this.provider.getNetwork();
    const blockNumber = await this.provider.getBlockNumber();
    const gasPrice = await this.provider.getGasPrice();
    
    return {
      name: network.name,
      chainId: network.chainId,
      blockNumber,
      gasPrice: gasPrice.toString()
    };
  }
  
  public isConnected(): boolean {
    return this.signer !== null;
  }
  
  public getContractAddresses(): unknown {
    return this.config.contracts;
  }
}