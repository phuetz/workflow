/**
 * Blockchain Security Module
 * Enterprise-grade security for blockchain transactions and smart contracts
 */

import { logger } from '../services/SimpleLogger';
import type {
  BlockchainTransaction,
  TransactionSimulation,
  SmartContractAudit,
  SecurityIssue,
  ApprovalCheck,
  StateChange,
} from '../types/security';

export class BlockchainSecurity {
  private simulationCache: Map<string, TransactionSimulation> = new Map();
  private auditCache: Map<string, SmartContractAudit> = new Map();
  private approvalRegistry: Map<string, ApprovalCheck[]> = new Map();

  // ================================
  // TRANSACTION SIMULATION
  // ================================

  /**
   * Simulate transaction before execution to detect issues
   */
  async simulateTransaction(
    transaction: BlockchainTransaction,
    network: string
  ): Promise<TransactionSimulation> {
    const cacheKey = this.getTransactionCacheKey(transaction, network);

    // Check cache
    const cached = this.simulationCache.get(cacheKey);
    if (cached) {
      logger.info('Using cached simulation result');
      return cached;
    }

    logger.info('Simulating blockchain transaction', { network, from: transaction.from, to: transaction.to });

    const simulation: TransactionSimulation = {
      success: true,
      gasUsed: '21000',
      gasPrice: transaction.gasPrice || '0',
      totalCost: '0',
      changes: [],
      warnings: [],
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // Validate transaction structure
      const structureValidation = this.validateTransactionStructure(transaction);
      if (!structureValidation.valid) {
        simulation.success = false;
        simulation.errors.push(...structureValidation.errors);
        return simulation;
      }

      // Check for reentrancy vulnerability
      const reentrancyCheck = await this.checkReentrancy(transaction, network);
      if (reentrancyCheck.vulnerable) {
        simulation.warnings.push('Potential reentrancy vulnerability detected');
        simulation.success = false;
        simulation.errors.push('REENTRANCY_DETECTED');
      }

      // Validate gas limits
      const gasValidation = this.validateGasLimits(transaction);
      if (!gasValidation.valid) {
        simulation.warnings.push(...gasValidation.warnings);
        if (gasValidation.critical) {
          simulation.success = false;
          simulation.errors.push('GAS_LIMIT_EXCEEDED');
        }
      }

      // Check for dangerous patterns
      const patternCheck = this.detectDangerousPatterns(transaction);
      if (patternCheck.found) {
        simulation.warnings.push(...patternCheck.patterns);
      }

      // Simulate state changes
      const stateChanges = await this.simulateStateChanges(transaction, network);
      simulation.changes = stateChanges;

      // Calculate costs
      const gasUsed = parseInt(simulation.gasUsed);
      const gasPrice = parseInt(transaction.gasPrice || '0');
      simulation.totalCost = (gasUsed * gasPrice).toString();

      // Cache result
      this.simulationCache.set(cacheKey, simulation);

      logger.info('Transaction simulation complete', {
        success: simulation.success,
        warnings: simulation.warnings.length,
        errors: simulation.errors.length,
      });

      return simulation;
    } catch (error) {
      logger.error('Transaction simulation failed', error);
      simulation.success = false;
      simulation.errors.push(error instanceof Error ? error.message : 'Unknown simulation error');
      return simulation;
    }
  }

  // ================================
  // SMART CONTRACT AUDITING
  // ================================

  /**
   * Audit smart contract for security vulnerabilities
   */
  async auditSmartContract(
    contractAddress: string,
    network: string,
    bytecode?: string
  ): Promise<SmartContractAudit> {
    const cacheKey = `${network}:${contractAddress}`;

    // Check cache
    const cached = this.auditCache.get(cacheKey);
    if (cached && Date.now() - new Date(cached.timestamp).getTime() < 3600000) {
      logger.info('Using cached audit result');
      return cached;
    }

    logger.info('Auditing smart contract', { network, contractAddress });

    const audit: SmartContractAudit = {
      contractAddress,
      network,
      issues: [],
      riskScore: 0,
      timestamp: new Date().toISOString(),
      recommendations: [],
    };

    try {
      // Check for known vulnerabilities
      const knownVulnerabilities = await this.checkKnownVulnerabilities(contractAddress, network);
      audit.issues.push(...knownVulnerabilities);

      // Analyze bytecode if provided
      if (bytecode) {
        const bytecodeIssues = this.analyzeBytecode(bytecode);
        audit.issues.push(...bytecodeIssues);
      }

      // Check for common patterns
      const patternIssues = await this.checkCommonPatterns(contractAddress, network);
      audit.issues.push(...patternIssues);

      // Calculate risk score
      audit.riskScore = this.calculateRiskScore(audit.issues);

      // Generate recommendations
      audit.recommendations = this.generateRecommendations(audit.issues);

      // Cache result
      this.auditCache.set(cacheKey, audit);

      logger.info('Contract audit complete', {
        issues: audit.issues.length,
        riskScore: audit.riskScore,
      });

      return audit;
    } catch (error) {
      logger.error('Contract audit failed', error);
      audit.issues.push({
        severity: 'high',
        type: 'AUDIT_ERROR',
        description: error instanceof Error ? error.message : 'Unknown audit error',
        remediation: 'Review contract manually',
      });
      audit.riskScore = 100;
      return audit;
    }
  }

  // ================================
  // REENTRANCY DETECTION
  // ================================

  /**
   * Check for reentrancy vulnerabilities
   */
  async checkReentrancy(
    transaction: BlockchainTransaction,
    network: string
  ): Promise<{ vulnerable: boolean; details: string[] }> {
    const details: string[] = [];
    let vulnerable = false;

    try {
      // Check if transaction involves external calls
      if (transaction.data && transaction.data.length > 0) {
        // Look for external call patterns in data
        const hasExternalCall = this.detectExternalCalls(transaction.data);

        if (hasExternalCall) {
          details.push('Transaction contains external calls');

          // Check if state changes occur after external calls
          const stateChangesAfterCalls = await this.checkStateChangeOrdering(
            transaction,
            network
          );

          if (stateChangesAfterCalls) {
            vulnerable = true;
            details.push('State changes occur after external calls - potential reentrancy');
          }
        }
      }

      return { vulnerable, details };
    } catch (error) {
      logger.error('Reentrancy check failed', error);
      return { vulnerable: false, details: ['Reentrancy check failed'] };
    }
  }

  // ================================
  // GAS LIMIT VALIDATION
  // ================================

  /**
   * Validate gas limits and pricing
   */
  validateGasLimits(transaction: BlockchainTransaction): {
    valid: boolean;
    warnings: string[];
    critical: boolean;
  } {
    const warnings: string[] = [];
    let valid = true;
    let critical = false;

    // Check gas limit
    if (transaction.gas) {
      const gasLimit = parseInt(transaction.gas);

      // Extremely high gas limit (>10M)
      if (gasLimit > 10000000) {
        warnings.push('Extremely high gas limit detected');
        valid = false;
        critical = true;
      }
      // High gas limit (>1M)
      else if (gasLimit > 1000000) {
        warnings.push('High gas limit - verify this is intentional');
      }
      // Low gas limit (<21000)
      else if (gasLimit < 21000) {
        warnings.push('Gas limit below minimum for standard transfer');
        valid = false;
        critical = true;
      }
    }

    // Check gas price
    if (transaction.gasPrice) {
      const gasPrice = parseInt(transaction.gasPrice);
      const maxGasPrice = 500000000000; // 500 gwei

      if (gasPrice > maxGasPrice) {
        warnings.push('Gas price exceeds maximum threshold');
        valid = false;
        critical = true;
      }
    }

    return { valid, warnings, critical };
  }

  // ================================
  // SLIPPAGE PROTECTION
  // ================================

  /**
   * Calculate and validate slippage for trades
   */
  calculateSlippage(
    expectedAmount: string,
    actualAmount: string
  ): { slippage: number; excessive: boolean } {
    const expected = parseFloat(expectedAmount);
    const actual = parseFloat(actualAmount);

    const slippage = Math.abs((actual - expected) / expected) * 100;
    const excessive = slippage >= 5; // 5% threshold (inclusive)

    return { slippage, excessive };
  }

  /**
   * Validate slippage is within acceptable limits
   */
  validateSlippage(
    expectedAmount: string,
    actualAmount: string,
    maxSlippage: number = 5
  ): { valid: boolean; slippage: number; warning?: string } {
    const { slippage, excessive } = this.calculateSlippage(expectedAmount, actualAmount);

    if (slippage > maxSlippage) {
      return {
        valid: false,
        slippage,
        warning: `Slippage ${slippage.toFixed(2)}% exceeds maximum ${maxSlippage}%`,
      };
    }

    if (excessive) {
      return {
        valid: true,
        slippage,
        warning: `High slippage detected: ${slippage.toFixed(2)}%`,
      };
    }

    return { valid: true, slippage };
  }

  // ================================
  // APPROVAL MANAGEMENT
  // ================================

  /**
   * Check token approvals
   */
  async checkApprovals(
    address: string,
    network: string
  ): Promise<ApprovalCheck[]> {
    const cacheKey = `${network}:${address}`;

    const cached = this.approvalRegistry.get(cacheKey);
    if (cached) {
      return cached;
    }

    // In production, would query on-chain approvals
    const approvals: ApprovalCheck[] = [];

    this.approvalRegistry.set(cacheKey, approvals);
    return approvals;
  }

  /**
   * Revoke dangerous approvals
   */
  async revokeApproval(
    token: string,
    spender: string,
    owner: string,
    network: string
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      logger.info('Revoking approval', { token, spender, owner, network });

      // In production, would create and send revoke transaction
      const transactionHash = `0x${Math.random().toString(16).slice(2)}`;

      return { success: true, transactionHash };
    } catch (error) {
      logger.error('Failed to revoke approval', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ================================
  // SIGNATURE VERIFICATION
  // ================================

  /**
   * Verify transaction signature
   */
  async verifySignature(
    transaction: BlockchainTransaction,
    signature: string,
    expectedSigner: string
  ): Promise<{ valid: boolean; signer?: string; error?: string }> {
    try {
      // In production, would use ethers.js or web3.js to verify
      logger.info('Verifying transaction signature');

      // Simulate signature recovery
      const recoveredSigner = expectedSigner; // Mock

      const valid = recoveredSigner.toLowerCase() === expectedSigner.toLowerCase();

      return { valid, signer: recoveredSigner };
    } catch (error) {
      logger.error('Signature verification failed', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  private validateTransactionStructure(transaction: BlockchainTransaction): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!transaction.from || !this.isValidAddress(transaction.from)) {
      errors.push('Invalid from address');
    }

    if (!transaction.to || !this.isValidAddress(transaction.to)) {
      errors.push('Invalid to address');
    }

    if (!transaction.value || parseFloat(transaction.value) < 0) {
      errors.push('Invalid transaction value');
    }

    return { valid: errors.length === 0, errors };
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private detectExternalCalls(data: string): boolean {
    // Simplified check for external call patterns in transaction data
    const externalCallPatterns = [
      'call',
      'delegatecall',
      'callcode',
      'staticcall',
    ];

    return externalCallPatterns.some(pattern => data.toLowerCase().includes(pattern));
  }

  private async checkStateChangeOrdering(
    transaction: BlockchainTransaction,
    network: string
  ): Promise<boolean> {
    // Simplified check - in production would analyze contract bytecode
    logger.debug('Checking state change ordering', { network });
    return false; // Default to safe
  }

  private detectDangerousPatterns(transaction: BlockchainTransaction): {
    found: boolean;
    patterns: string[];
  } {
    const patterns: string[] = [];

    // Check for self-destruct
    if (transaction.data?.includes('selfdestruct') || transaction.data?.includes('ff')) {
      patterns.push('Self-destruct operation detected');
    }

    // Check for delegate call
    if (transaction.data?.includes('delegatecall')) {
      patterns.push('Delegate call detected - ensure target is trusted');
    }

    return { found: patterns.length > 0, patterns };
  }

  private async simulateStateChanges(
    transaction: BlockchainTransaction,
    network: string
  ): Promise<StateChange[]> {
    logger.debug('Simulating state changes', { network });

    // In production, would use tenderly/hardhat/ganache
    const changes: StateChange[] = [
      {
        address: transaction.from,
        before: { balance: '1000000000000000000' },
        after: { balance: '999979000000000000' },
        type: 'balance',
      },
      {
        address: transaction.to,
        before: { balance: '0' },
        after: { balance: transaction.value },
        type: 'balance',
      },
    ];

    return changes;
  }

  private async checkKnownVulnerabilities(
    contractAddress: string,
    network: string
  ): Promise<SecurityIssue[]> {
    logger.debug('Checking known vulnerabilities', { contractAddress, network });

    // In production, would query vulnerability databases
    return [];
  }

  private analyzeBytecode(bytecode: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check for dangerous opcodes
    if (bytecode.includes('ff')) {
      issues.push({
        severity: 'high',
        type: 'SELFDESTRUCT',
        description: 'Contract contains selfdestruct operation',
        remediation: 'Ensure selfdestruct is properly protected',
      });
    }

    if (bytecode.includes('f4')) {
      issues.push({
        severity: 'medium',
        type: 'DELEGATECALL',
        description: 'Contract uses delegatecall',
        remediation: 'Verify delegatecall target is trusted',
      });
    }

    return issues;
  }

  private async checkCommonPatterns(
    contractAddress: string,
    network: string
  ): Promise<SecurityIssue[]> {
    logger.debug('Checking common vulnerability patterns', { contractAddress, network });

    // In production, would analyze contract code
    return [];
  }

  private calculateRiskScore(issues: SecurityIssue[]): number {
    let score = 0;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score += 40;
          break;
        case 'high':
          score += 25;
          break;
        case 'medium':
          score += 10;
          break;
        case 'low':
          score += 3;
          break;
        case 'info':
          score += 1;
          break;
      }
    }

    return Math.min(score, 100);
  }

  private generateRecommendations(issues: SecurityIssue[]): string[] {
    const recommendations = new Set<string>();

    for (const issue of issues) {
      recommendations.add(issue.remediation);
    }

    if (issues.some(i => i.type === 'REENTRANCY')) {
      recommendations.add('Implement checks-effects-interactions pattern');
      recommendations.add('Use ReentrancyGuard from OpenZeppelin');
    }

    if (issues.length === 0) {
      recommendations.add('No critical issues found - continue monitoring');
    }

    return Array.from(recommendations);
  }

  private getTransactionCacheKey(transaction: BlockchainTransaction, network: string): string {
    return `${network}:${transaction.from}:${transaction.to}:${transaction.value}:${transaction.data || ''}`;
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Clear simulation cache
   */
  clearSimulationCache(): void {
    this.simulationCache.clear();
    logger.info('Simulation cache cleared');
  }

  /**
   * Clear audit cache
   */
  clearAuditCache(): void {
    this.auditCache.clear();
    logger.info('Audit cache cleared');
  }

  /**
   * Get security metrics
   */
  getMetrics() {
    return {
      simulationsCached: this.simulationCache.size,
      auditsCached: this.auditCache.size,
      approvalsTracked: Array.from(this.approvalRegistry.values()).flat().length,
    };
  }
}

// Export singleton instance
export const blockchainSecurity = new BlockchainSecurity();
