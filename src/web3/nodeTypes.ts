/**
 * Blockchain Node Type Definitions
 * 50+ node types across triggers, actions, queries, and data processing
 */

export interface BlockchainNode {
  id: string;
  type: string;
  category: 'trigger' | 'action' | 'query' | 'data-processing';
  name: string;
  description: string;
  icon: string;
  networks: string[];
  inputs?: NodeInput[];
  outputs?: NodeOutput[];
  config?: Record<string, unknown>;
}

export interface NodeInput {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  default?: unknown;
}

export interface NodeOutput {
  name: string;
  type: string;
  description?: string;
}

// TRIGGER NODES (10)
export const BLOCKCHAIN_TRIGGERS: BlockchainNode[] = [
  {
    id: 'blockchain-event-trigger',
    type: 'blockchain-event',
    category: 'trigger',
    name: 'Blockchain Event',
    description: 'Trigger on new blocks, transactions, or network events',
    icon: '⛓️',
    networks: ['all'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'eventType', type: 'select', required: true, description: 'block | transaction | pending-tx' },
      { name: 'filter', type: 'object', required: false },
    ],
    outputs: [
      { name: 'blockNumber', type: 'number' },
      { name: 'timestamp', type: 'number' },
      { name: 'data', type: 'object' },
    ],
  },
  {
    id: 'smart-contract-event-trigger',
    type: 'contract-event',
    category: 'trigger',
    name: 'Smart Contract Event',
    description: 'Trigger when a smart contract emits an event',
    icon: '📜',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'contract', type: 'address', required: true },
      { name: 'eventName', type: 'string', required: true },
      { name: 'abi', type: 'json', required: true },
      { name: 'filter', type: 'object', required: false },
    ],
    outputs: [
      { name: 'event', type: 'object' },
      { name: 'transactionHash', type: 'string' },
      { name: 'blockNumber', type: 'number' },
    ],
  },
  {
    id: 'wallet-transaction-trigger',
    type: 'wallet-transaction',
    category: 'trigger',
    name: 'Wallet Transaction',
    description: 'Trigger when a wallet receives or sends a transaction',
    icon: '💰',
    networks: ['all'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'address', type: 'address', required: true },
      { name: 'direction', type: 'select', required: true, description: 'incoming | outgoing | both' },
      { name: 'minAmount', type: 'string', required: false },
    ],
    outputs: [
      { name: 'transaction', type: 'object' },
      { name: 'amount', type: 'string' },
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
    ],
  },
  {
    id: 'nft-transfer-trigger',
    type: 'nft-transfer',
    category: 'trigger',
    name: 'NFT Transfer',
    description: 'Trigger when an NFT is transferred',
    icon: '🖼️',
    networks: ['ethereum', 'polygon', 'bsc', 'solana', 'arbitrum', 'optimism', 'base'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'collection', type: 'address', required: false },
      { name: 'tokenId', type: 'string', required: false },
      { name: 'from', type: 'address', required: false },
      { name: 'to', type: 'address', required: false },
    ],
    outputs: [
      { name: 'nft', type: 'object' },
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'string' },
    ],
  },
  {
    id: 'defi-pool-change-trigger',
    type: 'defi-pool-change',
    category: 'trigger',
    name: 'DeFi Pool Change',
    description: 'Trigger on liquidity pool changes (swaps, adds, removes)',
    icon: '💱',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'dex', type: 'select', required: true },
      { name: 'pool', type: 'address', required: true },
      { name: 'eventType', type: 'select', required: true, description: 'swap | mint | burn | all' },
    ],
    outputs: [
      { name: 'event', type: 'object' },
      { name: 'amount0', type: 'string' },
      { name: 'amount1', type: 'string' },
      { name: 'sender', type: 'address' },
    ],
  },
  {
    id: 'gas-price-alert-trigger',
    type: 'gas-price-alert',
    category: 'trigger',
    name: 'Gas Price Alert',
    description: 'Trigger when gas price crosses a threshold',
    icon: '⛽',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'threshold', type: 'string', required: true },
      { name: 'condition', type: 'select', required: true, description: 'above | below' },
    ],
    outputs: [
      { name: 'gasPrice', type: 'string' },
      { name: 'timestamp', type: 'number' },
    ],
  },
  {
    id: 'block-confirmation-trigger',
    type: 'block-confirmation',
    category: 'trigger',
    name: 'Block Confirmation',
    description: 'Trigger after specified block confirmations',
    icon: '✅',
    networks: ['all'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'transactionHash', type: 'string', required: true },
      { name: 'confirmations', type: 'number', required: true, default: 12 },
    ],
    outputs: [
      { name: 'confirmed', type: 'boolean' },
      { name: 'confirmations', type: 'number' },
      { name: 'receipt', type: 'object' },
    ],
  },
  {
    id: 'token-price-trigger',
    type: 'token-price',
    category: 'trigger',
    name: 'Token Price Alert',
    description: 'Trigger when token price crosses a threshold',
    icon: '📈',
    networks: ['all'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'token', type: 'address', required: true },
      { name: 'threshold', type: 'number', required: true },
      { name: 'condition', type: 'select', required: true, description: 'above | below' },
    ],
    outputs: [
      { name: 'price', type: 'number' },
      { name: 'change24h', type: 'number' },
      { name: 'timestamp', type: 'number' },
    ],
  },
  {
    id: 'dao-proposal-trigger',
    type: 'dao-proposal',
    category: 'trigger',
    name: 'DAO Proposal',
    description: 'Trigger on new DAO proposals',
    icon: '🗳️',
    networks: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'dao', type: 'address', required: true },
      { name: 'proposalType', type: 'select', required: false, description: 'created | active | ended | all' },
    ],
    outputs: [
      { name: 'proposal', type: 'object' },
      { name: 'proposalId', type: 'string' },
      { name: 'proposer', type: 'address' },
    ],
  },
  {
    id: 'multi-sig-threshold-trigger',
    type: 'multi-sig-threshold',
    category: 'trigger',
    name: 'Multi-Sig Threshold',
    description: 'Trigger when multi-sig transaction reaches approval threshold',
    icon: '🔐',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'safeAddress', type: 'address', required: true },
    ],
    outputs: [
      { name: 'transaction', type: 'object' },
      { name: 'confirmations', type: 'number' },
      { name: 'threshold', type: 'number' },
    ],
  },
];

// ACTION NODES (20)
export const BLOCKCHAIN_ACTIONS: BlockchainNode[] = [
  {
    id: 'send-transaction-action',
    type: 'send-transaction',
    category: 'action',
    name: 'Send Transaction',
    description: 'Send a blockchain transaction',
    icon: '📤',
    networks: ['all'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'to', type: 'address', required: true },
      { name: 'value', type: 'string', required: true },
      { name: 'data', type: 'string', required: false },
      { name: 'gasLimit', type: 'string', required: false },
    ],
    outputs: [
      { name: 'transactionHash', type: 'string' },
      { name: 'receipt', type: 'object' },
    ],
  },
  {
    id: 'deploy-contract-action',
    type: 'deploy-contract',
    category: 'action',
    name: 'Deploy Contract',
    description: 'Deploy a smart contract',
    icon: '🚀',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'bytecode', type: 'string', required: true },
      { name: 'abi', type: 'json', required: true },
      { name: 'constructorParams', type: 'array', required: false },
    ],
    outputs: [
      { name: 'contractAddress', type: 'address' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'call-contract-action',
    type: 'call-contract',
    category: 'action',
    name: 'Call Contract Function',
    description: 'Execute a smart contract function',
    icon: '📞',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'contract', type: 'address', required: true },
      { name: 'abi', type: 'json', required: true },
      { name: 'function', type: 'string', required: true },
      { name: 'params', type: 'array', required: false },
      { name: 'value', type: 'string', required: false },
    ],
    outputs: [
      { name: 'result', type: 'any' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'mint-nft-action',
    type: 'mint-nft',
    category: 'action',
    name: 'Mint NFT',
    description: 'Mint a new NFT',
    icon: '🎨',
    networks: ['ethereum', 'polygon', 'bsc', 'solana', 'arbitrum', 'optimism', 'base'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'collection', type: 'address', required: true },
      { name: 'to', type: 'address', required: true },
      { name: 'metadata', type: 'object', required: true },
      { name: 'tokenId', type: 'string', required: false },
    ],
    outputs: [
      { name: 'nft', type: 'object' },
      { name: 'tokenId', type: 'string' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'burn-nft-action',
    type: 'burn-nft',
    category: 'action',
    name: 'Burn NFT',
    description: 'Burn an NFT permanently',
    icon: '🔥',
    networks: ['ethereum', 'polygon', 'bsc', 'solana', 'arbitrum', 'optimism', 'base'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'collection', type: 'address', required: true },
      { name: 'tokenId', type: 'string', required: true },
    ],
    outputs: [
      { name: 'success', type: 'boolean' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'defi-swap-action',
    type: 'defi-swap',
    category: 'action',
    name: 'DeFi Swap',
    description: 'Swap tokens on a DEX',
    icon: '🔄',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche', 'solana'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'dex', type: 'select', required: true },
      { name: 'tokenIn', type: 'address', required: true },
      { name: 'tokenOut', type: 'address', required: true },
      { name: 'amountIn', type: 'string', required: true },
      { name: 'slippage', type: 'number', required: true, default: 0.5 },
    ],
    outputs: [
      { name: 'amountOut', type: 'string' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'add-liquidity-action',
    type: 'add-liquidity',
    category: 'action',
    name: 'Add Liquidity',
    description: 'Add liquidity to a DeFi pool',
    icon: '💧',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'dex', type: 'select', required: true },
      { name: 'token0', type: 'address', required: true },
      { name: 'token1', type: 'address', required: true },
      { name: 'amount0', type: 'string', required: true },
      { name: 'amount1', type: 'string', required: true },
    ],
    outputs: [
      { name: 'lpTokens', type: 'string' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'stake-tokens-action',
    type: 'stake-tokens',
    category: 'action',
    name: 'Stake Tokens',
    description: 'Stake tokens in a staking pool',
    icon: '🥩',
    networks: ['all'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'pool', type: 'address', required: true },
      { name: 'amount', type: 'string', required: true },
    ],
    outputs: [
      { name: 'staked', type: 'string' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'dao-vote-action',
    type: 'dao-vote',
    category: 'action',
    name: 'DAO Vote',
    description: 'Vote on a DAO proposal',
    icon: '🗳️',
    networks: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'dao', type: 'address', required: true },
      { name: 'proposalId', type: 'string', required: true },
      { name: 'support', type: 'select', required: true, description: 'for | against | abstain' },
      { name: 'reason', type: 'string', required: false },
    ],
    outputs: [
      { name: 'voted', type: 'boolean' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'multi-sig-execute-action',
    type: 'multi-sig-execute',
    category: 'action',
    name: 'Execute Multi-Sig',
    description: 'Execute a multi-sig transaction',
    icon: '✍️',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'safeAddress', type: 'address', required: true },
      { name: 'transactionId', type: 'string', required: true },
    ],
    outputs: [
      { name: 'executed', type: 'boolean' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'bridge-tokens-action',
    type: 'bridge-tokens',
    category: 'action',
    name: 'Bridge Tokens',
    description: 'Bridge tokens between chains',
    icon: '🌉',
    networks: ['all'],
    inputs: [
      { name: 'fromChain', type: 'blockchain-network', required: true },
      { name: 'toChain', type: 'blockchain-network', required: true },
      { name: 'token', type: 'address', required: true },
      { name: 'amount', type: 'string', required: true },
      { name: 'recipient', type: 'address', required: true },
      { name: 'bridge', type: 'select', required: true },
    ],
    outputs: [
      { name: 'bridgeTransactionId', type: 'string' },
      { name: 'estimatedTime', type: 'number' },
    ],
  },
  {
    id: 'ipfs-upload-action',
    type: 'ipfs-upload',
    category: 'action',
    name: 'Upload to IPFS',
    description: 'Upload data to IPFS',
    icon: '☁️',
    networks: ['all'],
    inputs: [
      { name: 'data', type: 'any', required: true },
      { name: 'pin', type: 'boolean', required: false, default: true },
    ],
    outputs: [
      { name: 'cid', type: 'string' },
      { name: 'url', type: 'string' },
    ],
  },
  {
    id: 'approve-token-action',
    type: 'approve-token',
    category: 'action',
    name: 'Approve Token',
    description: 'Approve token spending',
    icon: '✅',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'token', type: 'address', required: true },
      { name: 'spender', type: 'address', required: true },
      { name: 'amount', type: 'string', required: true },
    ],
    outputs: [
      { name: 'approved', type: 'boolean' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'claim-rewards-action',
    type: 'claim-rewards',
    category: 'action',
    name: 'Claim Rewards',
    description: 'Claim staking or farming rewards',
    icon: '🎁',
    networks: ['all'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'pool', type: 'address', required: true },
    ],
    outputs: [
      { name: 'rewards', type: 'string' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'transfer-nft-action',
    type: 'transfer-nft',
    category: 'action',
    name: 'Transfer NFT',
    description: 'Transfer an NFT to another address',
    icon: '➡️',
    networks: ['ethereum', 'polygon', 'bsc', 'solana', 'arbitrum', 'optimism', 'base'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'collection', type: 'address', required: true },
      { name: 'tokenId', type: 'string', required: true },
      { name: 'to', type: 'address', required: true },
    ],
    outputs: [
      { name: 'success', type: 'boolean' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'list-nft-action',
    type: 'list-nft',
    category: 'action',
    name: 'List NFT on Marketplace',
    description: 'List an NFT for sale',
    icon: '🏪',
    networks: ['ethereum', 'polygon', 'solana'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'marketplace', type: 'select', required: true },
      { name: 'collection', type: 'address', required: true },
      { name: 'tokenId', type: 'string', required: true },
      { name: 'price', type: 'string', required: true },
      { name: 'duration', type: 'number', required: false, default: 604800 },
    ],
    outputs: [
      { name: 'listingId', type: 'string' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'create-collection-action',
    type: 'create-collection',
    category: 'action',
    name: 'Create NFT Collection',
    description: 'Deploy a new NFT collection',
    icon: '🎭',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'symbol', type: 'string', required: true },
      { name: 'standard', type: 'select', required: true, description: 'ERC721 | ERC1155' },
      { name: 'baseUri', type: 'string', required: false },
    ],
    outputs: [
      { name: 'collectionAddress', type: 'address' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'remove-liquidity-action',
    type: 'remove-liquidity',
    category: 'action',
    name: 'Remove Liquidity',
    description: 'Remove liquidity from a DeFi pool',
    icon: '💸',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'dex', type: 'select', required: true },
      { name: 'pool', type: 'address', required: true },
      { name: 'lpTokens', type: 'string', required: true },
    ],
    outputs: [
      { name: 'amount0', type: 'string' },
      { name: 'amount1', type: 'string' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'unstake-tokens-action',
    type: 'unstake-tokens',
    category: 'action',
    name: 'Unstake Tokens',
    description: 'Unstake tokens from a staking pool',
    icon: '🔓',
    networks: ['all'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'pool', type: 'address', required: true },
      { name: 'amount', type: 'string', required: true },
    ],
    outputs: [
      { name: 'unstaked', type: 'string' },
      { name: 'transactionHash', type: 'string' },
    ],
  },
  {
    id: 'batch-transfer-action',
    type: 'batch-transfer',
    category: 'action',
    name: 'Batch Transfer',
    description: 'Send tokens to multiple recipients',
    icon: '📦',
    networks: ['all'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'token', type: 'address', required: false },
      { name: 'recipients', type: 'array', required: true },
      { name: 'amounts', type: 'array', required: true },
    ],
    outputs: [
      { name: 'transactionHashes', type: 'array' },
      { name: 'totalSent', type: 'string' },
    ],
  },
];

// QUERY NODES (15)
export const BLOCKCHAIN_QUERIES: BlockchainNode[] = [
  {
    id: 'get-balance-query',
    type: 'get-balance',
    category: 'query',
    name: 'Get Balance',
    description: 'Get wallet balance',
    icon: '💵',
    networks: ['all'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'address', type: 'address', required: true },
      { name: 'token', type: 'address', required: false },
    ],
    outputs: [
      { name: 'balance', type: 'string' },
      { name: 'formatted', type: 'string' },
    ],
  },
  {
    id: 'read-contract-query',
    type: 'read-contract',
    category: 'query',
    name: 'Read Contract',
    description: 'Read data from a smart contract',
    icon: '📖',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'contract', type: 'address', required: true },
      { name: 'abi', type: 'json', required: true },
      { name: 'function', type: 'string', required: true },
      { name: 'params', type: 'array', required: false },
    ],
    outputs: [
      { name: 'result', type: 'any' },
    ],
  },
  {
    id: 'get-transaction-query',
    type: 'get-transaction',
    category: 'query',
    name: 'Get Transaction',
    description: 'Get transaction details',
    icon: '🔍',
    networks: ['all'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'transactionHash', type: 'string', required: true },
    ],
    outputs: [
      { name: 'transaction', type: 'object' },
      { name: 'receipt', type: 'object' },
    ],
  },
  {
    id: 'check-ownership-query',
    type: 'check-ownership',
    category: 'query',
    name: 'Check NFT Ownership',
    description: 'Check if address owns an NFT',
    icon: '🔎',
    networks: ['ethereum', 'polygon', 'bsc', 'solana', 'arbitrum', 'optimism', 'base'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'collection', type: 'address', required: true },
      { name: 'tokenId', type: 'string', required: true },
      { name: 'owner', type: 'address', required: true },
    ],
    outputs: [
      { name: 'owns', type: 'boolean' },
      { name: 'actualOwner', type: 'address' },
    ],
  },
  {
    id: 'get-nft-metadata-query',
    type: 'get-nft-metadata',
    category: 'query',
    name: 'Get NFT Metadata',
    description: 'Fetch NFT metadata',
    icon: '📋',
    networks: ['ethereum', 'polygon', 'bsc', 'solana', 'arbitrum', 'optimism', 'base'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'collection', type: 'address', required: true },
      { name: 'tokenId', type: 'string', required: true },
    ],
    outputs: [
      { name: 'metadata', type: 'object' },
      { name: 'uri', type: 'string' },
    ],
  },
  {
    id: 'defi-pool-info-query',
    type: 'defi-pool-info',
    category: 'query',
    name: 'Get Pool Info',
    description: 'Get DeFi pool information',
    icon: '📊',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'dex', type: 'select', required: true },
      { name: 'token0', type: 'address', required: true },
      { name: 'token1', type: 'address', required: true },
    ],
    outputs: [
      { name: 'pool', type: 'object' },
      { name: 'reserves', type: 'array' },
      { name: 'apy', type: 'number' },
    ],
  },
  {
    id: 'gas-estimation-query',
    type: 'gas-estimation',
    category: 'query',
    name: 'Estimate Gas',
    description: 'Estimate transaction gas cost',
    icon: '⛽',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'transaction', type: 'object', required: true },
    ],
    outputs: [
      { name: 'gasLimit', type: 'string' },
      { name: 'gasPrice', type: 'string' },
      { name: 'estimatedCost', type: 'string' },
      { name: 'estimatedCostUSD', type: 'number' },
    ],
  },
  {
    id: 'network-stats-query',
    type: 'network-stats',
    category: 'query',
    name: 'Network Statistics',
    description: 'Get blockchain network stats',
    icon: '📈',
    networks: ['all'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
    ],
    outputs: [
      { name: 'blockHeight', type: 'number' },
      { name: 'tps', type: 'number' },
      { name: 'gasPrice', type: 'string' },
      { name: 'networkHealth', type: 'string' },
    ],
  },
  {
    id: 'token-price-query',
    type: 'get-token-price',
    category: 'query',
    name: 'Get Token Price',
    description: 'Get token price from oracle',
    icon: '💰',
    networks: ['all'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'token', type: 'address', required: true },
      { name: 'oracle', type: 'select', required: false, default: 'chainlink' },
    ],
    outputs: [
      { name: 'price', type: 'number' },
      { name: 'decimals', type: 'number' },
      { name: 'timestamp', type: 'number' },
    ],
  },
  {
    id: 'get-allowance-query',
    type: 'get-allowance',
    category: 'query',
    name: 'Get Token Allowance',
    description: 'Check token spending allowance',
    icon: '🔓',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'token', type: 'address', required: true },
      { name: 'owner', type: 'address', required: true },
      { name: 'spender', type: 'address', required: true },
    ],
    outputs: [
      { name: 'allowance', type: 'string' },
    ],
  },
  {
    id: 'get-staking-position-query',
    type: 'get-staking-position',
    category: 'query',
    name: 'Get Staking Position',
    description: 'Get user staking position',
    icon: '📍',
    networks: ['all'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'pool', type: 'address', required: true },
      { name: 'user', type: 'address', required: true },
    ],
    outputs: [
      { name: 'stakedAmount', type: 'string' },
      { name: 'rewards', type: 'string' },
      { name: 'unlockTime', type: 'number' },
    ],
  },
  {
    id: 'get-dao-proposal-query',
    type: 'get-dao-proposal',
    category: 'query',
    name: 'Get DAO Proposal',
    description: 'Get DAO proposal details',
    icon: '📜',
    networks: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'dao', type: 'address', required: true },
      { name: 'proposalId', type: 'string', required: true },
    ],
    outputs: [
      { name: 'proposal', type: 'object' },
      { name: 'votes', type: 'object' },
      { name: 'status', type: 'string' },
    ],
  },
  {
    id: 'get-nfts-by-owner-query',
    type: 'get-nfts-by-owner',
    category: 'query',
    name: 'Get NFTs by Owner',
    description: 'Get all NFTs owned by address',
    icon: '🖼️',
    networks: ['ethereum', 'polygon', 'bsc', 'solana', 'arbitrum', 'optimism', 'base'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'collection', type: 'address', required: false },
      { name: 'owner', type: 'address', required: true },
    ],
    outputs: [
      { name: 'nfts', type: 'array' },
      { name: 'totalCount', type: 'number' },
    ],
  },
  {
    id: 'get-token-info-query',
    type: 'get-token-info',
    category: 'query',
    name: 'Get Token Info',
    description: 'Get token information',
    icon: 'ℹ️',
    networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'token', type: 'address', required: true },
    ],
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'decimals', type: 'number' },
      { name: 'totalSupply', type: 'string' },
    ],
  },
  {
    id: 'get-transaction-history-query',
    type: 'get-transaction-history',
    category: 'query',
    name: 'Get Transaction History',
    description: 'Get wallet transaction history',
    icon: '📜',
    networks: ['all'],
    inputs: [
      { name: 'network', type: 'blockchain-network', required: true },
      { name: 'address', type: 'address', required: true },
      { name: 'limit', type: 'number', required: false, default: 100 },
    ],
    outputs: [
      { name: 'transactions', type: 'array' },
      { name: 'totalCount', type: 'number' },
    ],
  },
];

// DATA PROCESSING NODES (5)
export const BLOCKCHAIN_DATA_PROCESSORS: BlockchainNode[] = [
  {
    id: 'decode-transaction-processor',
    type: 'decode-transaction',
    category: 'data-processing',
    name: 'Decode Transaction',
    description: 'Decode transaction data',
    icon: '🔓',
    networks: ['all'],
    inputs: [
      { name: 'data', type: 'string', required: true },
      { name: 'abi', type: 'json', required: false },
    ],
    outputs: [
      { name: 'decoded', type: 'object' },
      { name: 'function', type: 'string' },
      { name: 'params', type: 'object' },
    ],
  },
  {
    id: 'parse-events-processor',
    type: 'parse-events',
    category: 'data-processing',
    name: 'Parse Events',
    description: 'Parse contract events from logs',
    icon: '📝',
    networks: ['all'],
    inputs: [
      { name: 'logs', type: 'array', required: true },
      { name: 'abi', type: 'json', required: true },
    ],
    outputs: [
      { name: 'events', type: 'array' },
      { name: 'count', type: 'number' },
    ],
  },
  {
    id: 'verify-signature-processor',
    type: 'verify-signature',
    category: 'data-processing',
    name: 'Verify Signature',
    description: 'Verify message signature',
    icon: '✅',
    networks: ['all'],
    inputs: [
      { name: 'message', type: 'string', required: true },
      { name: 'signature', type: 'string', required: true },
      { name: 'address', type: 'address', required: true },
    ],
    outputs: [
      { name: 'valid', type: 'boolean' },
      { name: 'recoveredAddress', type: 'address' },
    ],
  },
  {
    id: 'convert-units-processor',
    type: 'convert-units',
    category: 'data-processing',
    name: 'Convert Units',
    description: 'Convert between wei/ether/gwei',
    icon: '🔄',
    networks: ['all'],
    inputs: [
      { name: 'value', type: 'string', required: true },
      { name: 'from', type: 'select', required: true, description: 'wei | gwei | ether' },
      { name: 'to', type: 'select', required: true, description: 'wei | gwei | ether' },
    ],
    outputs: [
      { name: 'converted', type: 'string' },
    ],
  },
  {
    id: 'format-data-processor',
    type: 'format-blockchain-data',
    category: 'data-processing',
    name: 'Format Blockchain Data',
    description: 'Format blockchain data for display',
    icon: '💅',
    networks: ['all'],
    inputs: [
      { name: 'data', type: 'any', required: true },
      { name: 'format', type: 'select', required: true, description: 'short | long | json | table' },
    ],
    outputs: [
      { name: 'formatted', type: 'string' },
    ],
  },
];

// Export all nodes
export const ALL_BLOCKCHAIN_NODES = [
  ...BLOCKCHAIN_TRIGGERS,
  ...BLOCKCHAIN_ACTIONS,
  ...BLOCKCHAIN_QUERIES,
  ...BLOCKCHAIN_DATA_PROCESSORS,
];

// Total count: 10 triggers + 20 actions + 15 queries + 5 data processors = 50 nodes
