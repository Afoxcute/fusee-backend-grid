import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { getAccount, getMint, createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import Logger from '../utils/logger';

// Get network configuration from environment
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'mainnet';

// Solana RPC endpoints
const MAINNET_RPC_URL = process.env.SOLANA_MAINNET_RPC || 'https://api.mainnet-beta.solana.com';
const DEVNET_RPC_URL = process.env.SOLANA_DEVNET_RPC || 'https://api.devnet.solana.com';

// Determine RPC URL based on network
const getRpcUrl = () => {
  return SOLANA_NETWORK === 'devnet' ? DEVNET_RPC_URL : MAINNET_RPC_URL;
};

// Get cluster name
const CLUSTER = SOLANA_NETWORK === 'devnet' ? 'devnet' : 'mainnet-beta';

// Token mint addresses based on network
const TOKEN_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL (same for both networks)
  USDC: SOLANA_NETWORK === 'devnet' 
    ? '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' // Devnet USDC
    : 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Mainnet USDC
};

export interface TokenBalance {
  mint: string;
  balance: string;
  formattedBalance: string;
  decimals: number;
  symbol: string;
  uiAmount: number;
  accountAddress?: string;
}

export interface WalletBalances {
  sol: TokenBalance;
  usdc: TokenBalance;
  allTokens: TokenBalance[];
  summary: {
    totalTokens: number;
    hasNative: boolean;
    hasUsdc: boolean;
    walletAddress: string;
  };
}

export class BlockchainService {
  private connection: Connection;

  constructor(rpcUrl?: string) {
    const url = rpcUrl || getRpcUrl();
    this.connection = new Connection(url, 'confirmed');
    Logger.info(`BlockchainService initialized for ${SOLANA_NETWORK} network: ${url}`);
  }

  /**
   * Test connection to Solana blockchain
   */
  async testConnection(): Promise<{ success: boolean; error?: string; version?: string }> {
    try {
      const version = await this.connection.getVersion();
      Logger.info('Blockchain connection test successful', { version });
      return { success: true, version: version['solana-core'] };
    } catch (error) {
      Logger.error('Blockchain connection test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get SOL balance for a wallet address
   */
  async getSolBalance(walletAddress: string): Promise<TokenBalance> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      
      const formattedBalance = (balance / LAMPORTS_PER_SOL).toFixed(9);
      
      return {
        mint: TOKEN_MINTS.SOL,
        balance: balance.toString(),
        formattedBalance,
        decimals: 9,
        symbol: 'SOL',
        uiAmount: parseFloat(formattedBalance),
      };
    } catch (error) {
      Logger.error(`Error fetching SOL balance for ${walletAddress}:`, error);
      return {
        mint: TOKEN_MINTS.SOL,
        balance: '0',
        formattedBalance: '0.000000000',
        decimals: 9,
        symbol: 'SOL',
        uiAmount: 0,
      };
    }
  }

  /**
   * Get USDC balance for a wallet address
   */
  async getUsdcBalance(walletAddress: string): Promise<TokenBalance> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const usdcMint = new PublicKey(TOKEN_MINTS.USDC);
      
      // Get all token accounts for this wallet
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: usdcMint }
      );

      if (tokenAccounts.value.length === 0) {
        return {
          mint: TOKEN_MINTS.USDC,
          balance: '0',
          formattedBalance: '0.000000',
          decimals: 6,
          symbol: 'USDC',
          uiAmount: 0,
        };
      }

      // Get the first USDC token account
      const tokenAccount = tokenAccounts.value[0];
      const accountInfo = tokenAccount.account.data.parsed.info;
      
      const balance = accountInfo.tokenAmount.amount;
      const decimals = accountInfo.tokenAmount.decimals;
      const formattedBalance = (parseFloat(balance) / Math.pow(10, decimals)).toFixed(decimals);

      return {
        mint: TOKEN_MINTS.USDC,
        balance,
        formattedBalance,
        decimals,
        symbol: 'USDC',
        uiAmount: parseFloat(formattedBalance),
        accountAddress: tokenAccount.pubkey.toString(),
      };
    } catch (error) {
      Logger.error(`Error fetching USDC balance for ${walletAddress}:`, error);
      return {
        mint: TOKEN_MINTS.USDC,
        balance: '0',
        formattedBalance: '0.000000',
        decimals: 6,
        symbol: 'USDC',
        uiAmount: 0,
      };
    }
  }

  /**
   * Get all token balances for a wallet address
   */
  async getAllTokenBalances(walletAddress: string): Promise<TokenBalance[]> {
    try {
      const publicKey = new PublicKey(walletAddress);
      
      // Get all token accounts for this wallet
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const tokenBalances: TokenBalance[] = [];

      for (const tokenAccount of tokenAccounts.value) {
        const accountInfo = tokenAccount.account.data.parsed.info;
        const mint = accountInfo.mint;
        const balance = accountInfo.tokenAmount.amount;
        const decimals = accountInfo.tokenAmount.decimals;
        
        // Skip zero balance tokens
        if (parseFloat(balance) === 0) continue;

        const formattedBalance = (parseFloat(balance) / Math.pow(10, decimals)).toFixed(decimals);
        
        // Determine symbol based on mint address
        let symbol = 'UNKNOWN';
        if (mint === TOKEN_MINTS.SOL) symbol = 'SOL';
        else if (mint === TOKEN_MINTS.USDC) symbol = 'USDC';

        tokenBalances.push({
          mint,
          balance,
          formattedBalance,
          decimals,
          symbol,
          uiAmount: parseFloat(formattedBalance),
          accountAddress: tokenAccount.pubkey.toString(),
        });
      }

      return tokenBalances;
    } catch (error) {
      Logger.error(`Error fetching all token balances for ${walletAddress}:`, error);
      return [];
    }
  }

  /**
   * Get comprehensive wallet balances (SOL, USDC, and all tokens)
   */
  async getWalletBalances(walletAddress: string): Promise<WalletBalances> {
    try {
      Logger.info(`Fetching blockchain balances for wallet: ${walletAddress}`);

      // Fetch SOL balance
      const solBalance = await this.getSolBalance(walletAddress);
      
      // Fetch USDC balance
      const usdcBalance = await this.getUsdcBalance(walletAddress);
      
      // Fetch all token balances
      const allTokens = await this.getAllTokenBalances(walletAddress);

      const result: WalletBalances = {
        sol: solBalance,
        usdc: usdcBalance,
        allTokens,
        summary: {
          totalTokens: allTokens.length,
          hasNative: parseFloat(solBalance.balance) > 0,
          hasUsdc: parseFloat(usdcBalance.balance) > 0,
          walletAddress,
        },
      };

      Logger.info(`Successfully fetched blockchain balances for ${walletAddress}:`, {
        sol: solBalance.formattedBalance,
        usdc: usdcBalance.formattedBalance,
        totalTokens: allTokens.length,
      });

      return result;
    } catch (error) {
      Logger.error(`Error fetching wallet balances for ${walletAddress}:`, error);
      
      // Return zero balances on error
      return {
        sol: {
          mint: TOKEN_MINTS.SOL,
          balance: '0',
          formattedBalance: '0.000000000',
          decimals: 9,
          symbol: 'SOL',
          uiAmount: 0,
        },
        usdc: {
          mint: TOKEN_MINTS.USDC,
          balance: '0',
          formattedBalance: '0.000000',
          decimals: 6,
          symbol: 'USDC',
          uiAmount: 0,
        },
        allTokens: [],
        summary: {
          totalTokens: 0,
          hasNative: false,
          hasUsdc: false,
          walletAddress,
        },
      };
    }
  }

  /**
   * Validate if a wallet address is valid
   */
  isValidWalletAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get token mint information
   */
  async getTokenMintInfo(mintAddress: string): Promise<{ decimals: number; supply: string } | null> {
    try {
      const mint = new PublicKey(mintAddress);
      const mintInfo = await getMint(this.connection, mint);
      
      return {
        decimals: mintInfo.decimals,
        supply: mintInfo.supply.toString(),
      };
    } catch (error) {
      Logger.error(`Error fetching mint info for ${mintAddress}:`, error);
      return null;
    }
  }

  /**
   * Create a raw transaction for sending tokens
   * Following the guide pattern for Grid SDK compatibility
   */
  async createTransaction(
    fromAddress: string,
    toAddress: string,
    tokenMint: string,
    amount: number,
    gridAccountAddress?: string,
    feeAmount?: number,
    feeRecipient?: string
  ): Promise<{ transaction: string } | null> {
    try {
      Logger.info(`Creating transaction: ${amount} ${tokenMint} from ${fromAddress} to ${toAddress}`);
      
      const fromPublicKey = new PublicKey(fromAddress);
      const toPublicKey = new PublicKey(toAddress);
      
      Logger.info(`Public keys created: from=${fromPublicKey.toString()}, to=${toPublicKey.toString()}`);

      // Validate that the public keys are valid Solana addresses
      try {
        Logger.info(`Validating FROM public key: ${fromPublicKey.toString()}`);
        // Test if the public key is valid by checking if it's on the curve
        const fromKeyBytes = fromPublicKey.toBytes();
        Logger.info(`FROM public key validation successful: ${fromPublicKey.toString()}`);
      } catch (fromKeyError) {
        Logger.error(`Invalid FROM public key:`, {
          fromAddress: fromAddress,
          fromPublicKey: fromPublicKey.toString(),
          error: fromKeyError,
          errorMessage: fromKeyError instanceof Error ? fromKeyError.message : 'Unknown error'
        });
        throw new Error(`Invalid FROM address: ${fromAddress} - ${fromKeyError instanceof Error ? fromKeyError.message : 'Not a valid Solana public key'}`);
      }

      try {
        Logger.info(`Validating TO public key: ${toPublicKey.toString()}`);
        // Test if the public key is valid by checking if it's on the curve
        const toKeyBytes = toPublicKey.toBytes();
        Logger.info(`TO public key validation successful: ${toPublicKey.toString()}`);
      } catch (toKeyError) {
        Logger.error(`Invalid TO public key:`, {
          toAddress: toAddress,
          toPublicKey: toPublicKey.toString(),
          error: toKeyError,
          errorMessage: toKeyError instanceof Error ? toKeyError.message : 'Unknown error'
        });
        throw new Error(`Invalid TO address: ${toAddress} - ${toKeyError instanceof Error ? toKeyError.message : 'Not a valid Solana public key'}`);
      }

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      Logger.info(`Latest blockhash: ${blockhash}`);
      
      // Create transaction following the guide pattern
      const transaction = new Transaction();
      
      if (tokenMint === TOKEN_MINTS.SOL) {
        // SOL transfer following the guide pattern
        const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
        
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: fromPublicKey, // Use sender as source
            toPubkey: toPublicKey,
            lamports,
          })
        );
        
        Logger.info(`Created SOL transfer: ${amount} SOL (${lamports} lamports)`, {
          from: fromPublicKey.toString(),
          to: toPublicKey.toString(),
          amount: amount
        });
      } else {
        // SPL Token transfer (USDC, etc.)
        Logger.info(`Creating SPL token transfer for ${tokenMint}:`, {
          from: fromPublicKey.toString(),
          to: toPublicKey.toString(),
          amount: amount,
          tokenMint: tokenMint
        });

        // Validate mint address first
        let mintPublicKey;
        try {
          Logger.info(`Validating mint address: ${tokenMint}`);
          mintPublicKey = new PublicKey(tokenMint);
          Logger.info(`Mint address validation successful: ${mintPublicKey.toString()}`);
        } catch (mintError) {
          Logger.error(`Invalid mint address:`, {
            tokenMint: tokenMint,
            error: mintError,
            errorMessage: mintError instanceof Error ? mintError.message : 'Unknown error'
          });
          throw new Error(`Invalid mint address: ${tokenMint}`);
        }
        
        try {
          Logger.info(`Step 1: Getting associated token addresses for mint ${tokenMint}`);
          Logger.info(`Step 1 Details:`, {
            mintPublicKey: mintPublicKey.toString(),
            fromPublicKey: fromPublicKey.toString(),
            toPublicKey: toPublicKey.toString(),
            tokenMint: tokenMint
          });
          
          // Get associated token addresses with individual error handling
          let fromTokenAccount, toTokenAccount;
          
          try {
            Logger.info(`Step 1a: Getting FROM token account address`);
            Logger.info(`Step 1a Parameters:`, {
              mintPublicKey: mintPublicKey.toString(),
              fromPublicKey: fromPublicKey.toString(),
              mintPublicKeyBytes: Array.from(mintPublicKey.toBytes()),
              fromPublicKeyBytes: Array.from(fromPublicKey.toBytes())
            });
            
            fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey, true);
            Logger.info(`Step 1a Complete: FROM token account = ${fromTokenAccount.toString()}`);
          } catch (fromError) {
            Logger.error(`Step 1a Failed: Error getting FROM token account:`, {
              error: fromError,
              errorMessage: fromError instanceof Error ? fromError.message : 'Unknown error',
              errorStack: fromError instanceof Error ? fromError.stack : undefined,
              errorName: fromError instanceof Error ? fromError.name : 'Unknown',
              mintPublicKey: mintPublicKey.toString(),
              fromPublicKey: fromPublicKey.toString(),
              tokenMint: tokenMint
            });
            
            // Also log the error directly to console for debugging
            console.error('Step 1a Error Details:', fromError);
            console.error('Step 1a Error Message:', fromError instanceof Error ? fromError.message : 'Unknown error');
            console.error('Step 1a Error Stack:', fromError instanceof Error ? fromError.stack : 'No stack trace');
            
            throw fromError;
          }
          
          try {
            Logger.info(`Step 1b: Getting TO token account address`);
            toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey, true);
            Logger.info(`Step 1b Complete: TO token account = ${toTokenAccount.toString()}`);
          } catch (toError) {
            Logger.error(`Step 1b Failed: Error getting TO token account:`, {
              error: toError,
              errorMessage: toError instanceof Error ? toError.message : 'Unknown error',
              errorStack: toError instanceof Error ? toError.stack : undefined,
              errorName: toError instanceof Error ? toError.name : 'Unknown',
              mintPublicKey: mintPublicKey.toString(),
              toPublicKey: toPublicKey.toString(),
              tokenMint: tokenMint
            });
            
            // Also log the error directly to console for debugging
            console.error('Step 1b Error Details:', toError);
            console.error('Step 1b Error Message:', toError instanceof Error ? toError.message : 'Unknown error');
            console.error('Step 1b Error Stack:', toError instanceof Error ? toError.stack : 'No stack trace');
            
            throw toError;
          }

          Logger.info(`Step 1 Complete: Token accounts calculated:`, {
            fromTokenAccount: fromTokenAccount.toString(),
            toTokenAccount: toTokenAccount.toString(),
            mint: tokenMint
          });

          Logger.info(`Step 2: Checking if token accounts exist`);
          
          // Check if token accounts exist
          const fromAccountInfo = await this.connection.getAccountInfo(fromTokenAccount);
          const toAccountInfo = await this.connection.getAccountInfo(toTokenAccount);

          Logger.info(`Step 2 Complete: Token account status:`, {
            fromAccountExists: !!fromAccountInfo,
            toAccountExists: !!toAccountInfo,
            fromAccountInfo: fromAccountInfo ? 'exists' : 'missing',
            toAccountInfo: toAccountInfo ? 'exists' : 'missing'
          });

          // If sender's token account doesn't exist, create it
          if (!fromAccountInfo) {
            Logger.info(`Creating sender's token account: ${fromTokenAccount.toString()}`);
            transaction.add(
              createAssociatedTokenAccountInstruction(
                fromPublicKey, // payer
                fromTokenAccount, // associatedToken
                fromPublicKey, // owner
                mintPublicKey // mint
              )
            );
          }

          // If recipient's token account doesn't exist, create it
          if (!toAccountInfo) {
            Logger.info(`Creating recipient's token account: ${toTokenAccount.toString()}`);
            transaction.add(
              createAssociatedTokenAccountInstruction(
                fromPublicKey, // payer
                toTokenAccount, // associatedToken
                toPublicKey, // owner
                mintPublicKey // mint
              )
            );
          }

          Logger.info(`Step 3: Getting mint info and calculating token amount`);
          
          // Get mint info to calculate the correct amount
          const mintInfo = await getMint(this.connection, mintPublicKey);
          const tokenAmount = Math.floor(amount * Math.pow(10, mintInfo.decimals));

          Logger.info(`Step 3 Complete: Mint info retrieved:`, {
            fromTokenAccount: fromTokenAccount.toString(),
            toTokenAccount: toTokenAccount.toString(),
            amount: amount,
            tokenAmount: tokenAmount,
            decimals: mintInfo.decimals,
            mint: tokenMint,
            mintSupply: mintInfo.supply.toString()
          });

          Logger.info(`Step 4: Creating SPL token transfer instruction`);
          
          // Create SPL token transfer instruction
          transaction.add(
            createTransferInstruction(
              fromTokenAccount,
              toTokenAccount,
              fromPublicKey, // authority
              tokenAmount
            )
          );
          
          Logger.info(`Step 4 Complete: SPL token transfer instruction added successfully`);
          Logger.info(`Created SPL token transfer: ${amount} tokens (${tokenAmount} raw units) with ${mintInfo.decimals} decimals`);
        } catch (tokenError) {
          Logger.error('Error creating SPL token transfer:', {
            error: tokenError,
            errorMessage: tokenError instanceof Error ? tokenError.message : 'Unknown error',
            errorStack: tokenError instanceof Error ? tokenError.stack : undefined,
            tokenMint: tokenMint,
            fromAddress: fromPublicKey.toString(),
            toAddress: toPublicKey.toString(),
            amount: amount
          });
          
          // Re-throw the error instead of falling back to SOL
          throw new Error(`SPL token transfer failed: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`);
        }
      }

      // Add fee transfer if fee amount and recipient are provided
      if (feeAmount && feeRecipient && tokenMint !== TOKEN_MINTS.SOL) {
        try {
          Logger.info(`Adding fee transfer: ${feeAmount} ${tokenMint} to ${feeRecipient}`);
          
          const feeRecipientPublicKey = new PublicKey(feeRecipient);
          const feeMintPublicKey = new PublicKey(tokenMint);
          
          // Get associated token addresses for fee recipient
          const fromFeeTokenAccount = await getAssociatedTokenAddress(feeMintPublicKey, fromPublicKey, true);
          const feeRecipientTokenAccount = await getAssociatedTokenAddress(feeMintPublicKey, feeRecipientPublicKey, true);
          
          // Check if fee recipient token account exists
          const feeRecipientAccountInfo = await this.connection.getAccountInfo(feeRecipientTokenAccount);
          
          if (!feeRecipientAccountInfo) {
            Logger.info(`Creating fee recipient's token account: ${feeRecipientTokenAccount.toString()}`);
            transaction.add(
              createAssociatedTokenAccountInstruction(
                fromPublicKey, // payer
                feeRecipientTokenAccount, // associatedToken
                feeRecipientPublicKey, // owner
                feeMintPublicKey // mint
              )
            );
          }
          
          // Get mint info to calculate the correct fee amount
          const feeMintInfo = await getMint(this.connection, feeMintPublicKey);
          const feeTokenAmount = Math.floor(feeAmount * Math.pow(10, feeMintInfo.decimals));
          
          Logger.info(`Adding fee transfer instruction: ${feeAmount} ${tokenMint} (${feeTokenAmount} raw units)`);
          
          // Add fee transfer instruction
          transaction.add(
            createTransferInstruction(
              fromFeeTokenAccount,
              feeRecipientTokenAccount,
              fromPublicKey, // authority
              feeTokenAmount
            )
          );
          
          Logger.info(`Fee transfer instruction added successfully`);
        } catch (feeError) {
          Logger.error('Error adding fee transfer:', feeError);
          // Fail the entire transaction if fee transfer fails
          throw new Error(`Fee transfer failed: ${feeError instanceof Error ? feeError.message : 'Unknown error'}`);
        }
      }

      // Set fee payer and recent blockhash following the guide pattern
      transaction.feePayer = fromPublicKey;
      transaction.recentBlockhash = blockhash;

      // Serialize transaction to base64
      const serializedTransaction = transaction.serialize({ requireAllSignatures: false });
      const transactionBase64 = serializedTransaction.toString('base64');

      // Validate base64 transaction
      if (!transactionBase64 || transactionBase64.length === 0) {
        Logger.error('Failed to serialize transaction to base64');
        return null;
      }

      Logger.info(`Transaction created successfully:`, {
        instructionCount: transaction.instructions.length,
        recentBlockhash: blockhash,
        feePayer: fromPublicKey.toString(),
        base64Length: transactionBase64.length,
        isValidBase64: transactionBase64.length > 0
      });

      // Log the complete base64 transaction string as requested
      console.log('\n=== TRANSACTION BASE64 STRING ===');
      console.log(`Transaction: ${amount} ${tokenMint} from ${fromAddress} to ${toAddress}`);
      console.log(`Base64 Length: ${transactionBase64.length} characters`);
      console.log(`Instruction Count: ${transaction.instructions.length}`);
      console.log(`Recent Blockhash: ${blockhash}`);
      console.log(`Fee Payer: ${fromPublicKey.toString()}`);
      console.log('\n--- COMPLETE BASE64 TRANSACTION ---');
      console.log(transactionBase64);
      console.log('--- END BASE64 TRANSACTION ---\n');

      return { transaction: transactionBase64 };
    } catch (error) {
      Logger.error('Error creating transaction:', error);
      return null;
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();
export default blockchainService;

// Export network configuration
export { TOKEN_MINTS, SOLANA_NETWORK, CLUSTER };

