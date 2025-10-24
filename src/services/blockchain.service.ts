import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { getAccount, getMint, createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import Logger from '../utils/logger';

// Solana devnet RPC endpoint
const DEVNET_RPC_URL = 'https://api.devnet.solana.com';

// Token mint addresses
const TOKEN_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  USDC_DEVNET: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
  USDC_MAINNET: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Mainnet USDC
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

  constructor(rpcUrl: string = DEVNET_RPC_URL) {
    this.connection = new Connection(rpcUrl, 'confirmed');
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
      const usdcMint = new PublicKey(TOKEN_MINTS.USDC_DEVNET);
      
      // Get all token accounts for this wallet
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: usdcMint }
      );

      if (tokenAccounts.value.length === 0) {
        return {
          mint: TOKEN_MINTS.USDC_DEVNET,
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
        mint: TOKEN_MINTS.USDC_DEVNET,
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
        mint: TOKEN_MINTS.USDC_DEVNET,
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
        else if (mint === TOKEN_MINTS.USDC_DEVNET) symbol = 'USDC';
        else if (mint === TOKEN_MINTS.USDC_MAINNET) symbol = 'USDC';

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
          mint: TOKEN_MINTS.USDC_DEVNET,
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
    gridAccountAddress?: string
  ): Promise<{ transaction: string } | null> {
    try {
      Logger.info(`Creating transaction: ${amount} ${tokenMint} from ${fromAddress} to ${toAddress}`);
      
      const fromPublicKey = new PublicKey(fromAddress);
      const toPublicKey = new PublicKey(toAddress);
      
      Logger.info(`Public keys created: from=${fromPublicKey.toString()}, to=${toPublicKey.toString()}`);

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

        const mintPublicKey = new PublicKey(tokenMint);
        
        try {
          // Get associated token addresses
          const fromTokenAccount = await getAssociatedTokenAddress(mintPublicKey, fromPublicKey);
          const toTokenAccount = await getAssociatedTokenAddress(mintPublicKey, toPublicKey);

          Logger.info(`Token accounts:`, {
            fromTokenAccount: fromTokenAccount.toString(),
            toTokenAccount: toTokenAccount.toString(),
            mint: tokenMint
          });

          // Check if token accounts exist
          const fromAccountInfo = await this.connection.getAccountInfo(fromTokenAccount);
          const toAccountInfo = await this.connection.getAccountInfo(toTokenAccount);

          Logger.info(`Token account status:`, {
            fromAccountExists: !!fromAccountInfo,
            toAccountExists: !!toAccountInfo
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

          // Get mint info to calculate the correct amount
          const mintInfo = await getMint(this.connection, mintPublicKey);
          const tokenAmount = Math.floor(amount * Math.pow(10, mintInfo.decimals));

          Logger.info(`Creating SPL token transfer instruction:`, {
            fromTokenAccount: fromTokenAccount.toString(),
            toTokenAccount: toTokenAccount.toString(),
            amount: amount,
            tokenAmount: tokenAmount,
            decimals: mintInfo.decimals,
            mint: tokenMint
          });

          // Create SPL token transfer instruction
          transaction.add(
            createTransferInstruction(
              fromTokenAccount,
              toTokenAccount,
              fromPublicKey, // authority
              tokenAmount
            )
          );
          
          Logger.info(`Created SPL token transfer: ${amount} tokens (${tokenAmount} raw units) with ${mintInfo.decimals} decimals`);
        } catch (tokenError) {
          Logger.error('Error creating SPL token transfer:', tokenError);
          
          // Fallback to SOL transfer if SPL token transfer fails
          Logger.warn(`Falling back to SOL transfer due to SPL token error: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`);
          const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: fromPublicKey,
              toPubkey: toPublicKey,
              lamports,
            })
          );
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
