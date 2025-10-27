import Logger from '../utils/logger';

export interface LuloTransactionResponse {
  transaction: string;
}

export interface LuloInstructionsResponse {
  instructions: {
    computeBudgetInstructions: any[];
    regularDepositInstruction?: any;
    protectedDepositInstruction?: any;
    withdrawProtectedInstruction?: any;
    initiateRegularWithdrawInstruction?: any;
    completeRegularWithdrawInstruction?: any;
    initializeReferrerInstructions?: any[];
    addressLookupTableAddresses: string[];
    setupInstructions?: any[];
  };
}

export interface LuloAccountResponse {
  [key: string]: any;
}

export interface LuloPendingWithdrawalsResponse {
  pendingWithdrawals: Array<{
    owner: string;
    withdrawalId: number;
    nativeAmount: string;
    createdTimestamp: number;
    cooldownSeconds: string;
    mintAddress: string;
  }>;
}

export interface LuloPoolsResponse {
  regular: {
    type: string;
    apy: number;
    maxWithdrawalAmount: number;
    price: number;
  };
  protected: {
    type: string;
    apy: number;
    openCapacity: number;
    price: number;
  };
  averagePoolRate: number;
  totalLiquidity: number;
  availableLiquidity: number;
  regularLiquidityAmount: number;
  protectedLiquidityAmount: number;
  regularAvailableAmount: number;
}

export interface LuloRatesResponse {
  regular: {
    CURRENT: number;
    '1HR': number;
    '1YR': number;
    '24HR': number;
    '30DAY': number;
    '7DAY': number;
  };
  protected: {
    CURRENT: number;
    '1HR': number;
    '1YR': number;
    '24HR': number;
    '30DAY': number;
    '7DAY': number;
  };
}

export interface LuloReferrerResponse {
  owner: string;
  luloAccount: string;
  luloAccountExists: boolean;
  referrerAccount: string;
  referrerAccountExists: boolean;
  referredAmount: number;
  protectedReferredAmount: number;
  regularReferredAmount: number;
  referralFeeUnclaimed: number;
  netReferralFeesUnclaimed: number;
  totalClaimed: number;
  referralFee: number;
  claimFee: number;
  numReferrals: number;
  code: string;
}

class LuloService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.LULO_API_URL || 'https://api.lulo.fi/v1';
    this.apiKey = process.env.LULO_API_KEY || '';
    
    if (!this.apiKey) {
      Logger.warn('Lulo API key not configured. Yield investment features will not work.');
    }
  }

  private getHeaders() {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  // Transaction Generation Methods
  async initializeReferrer(owner: string, feePayer: string, priorityFee?: string): Promise<LuloTransactionResponse> {
    const params = new URLSearchParams();
    if (priorityFee) params.append('priorityFee', priorityFee);

    const response = await fetch(
      `${this.baseUrl}/generate.transaction.initializeReferrer?${params.toString()}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          owner,
          feePayer,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async generateDepositTransaction(
    owner: string,
    feePayer: string,
    mintAddress: string,
    regularAmount?: number,
    protectedAmount?: number,
    referrer?: string,
    priorityFee?: string
  ): Promise<LuloTransactionResponse> {
    const params = new URLSearchParams();
    if (priorityFee) params.append('priorityFee', priorityFee);

    const body: any = {
      owner,
      feePayer,
      mintAddress,
    };

    if (regularAmount !== undefined) body.regularAmount = regularAmount;
    if (protectedAmount !== undefined) body.protectedAmount = protectedAmount;
    if (referrer) body.referrer = referrer;

    const response = await fetch(
      `${this.baseUrl}/generate.transactions.deposit?${params.toString()}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      Logger.error(`Lulo API error (status ${response.status}):`, {
        url: `${this.baseUrl}/generate.transactions.deposit`,
        status: response.status,
        errorBody: errorText,
        requestBody: body
      });
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    return await response.json();
  }

  async generateWithdrawProtectedTransaction(
    owner: string,
    feePayer: string,
    mintAddress: string,
    amount: number,
    priorityFee?: string
  ): Promise<LuloTransactionResponse> {
    const params = new URLSearchParams();
    if (priorityFee) params.append('priorityFee', priorityFee);

    const response = await fetch(
      `${this.baseUrl}/generate.transactions.withdrawProtected?${params.toString()}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          owner,
          feePayer,
          mintAddress,
          amount,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async generateInitiateRegularWithdrawTransaction(
    owner: string,
    feePayer: string,
    mintAddress: string,
    amount: number,
    priorityFee?: string
  ): Promise<LuloTransactionResponse> {
    const params = new URLSearchParams();
    if (priorityFee) params.append('priorityFee', priorityFee);

    const response = await fetch(
      `${this.baseUrl}/generate.transactions.initiateRegularWithdraw?${params.toString()}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          owner,
          feePayer,
          mintAddress,
          amount,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async generateCompleteRegularWithdrawalTransaction(
    owner: string,
    pendingWithdrawalId: number,
    feePayer: string,
    priorityFee?: string
  ): Promise<LuloTransactionResponse> {
    const params = new URLSearchParams();
    if (priorityFee) params.append('priorityFee', priorityFee);

    const response = await fetch(
      `${this.baseUrl}/generate.transactions.completeRegularWithdrawal?${params.toString()}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          owner,
          pendingWithdrawalId,
          feePayer,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Instructions Generation Methods
  async generateInitializeReferrerInstructions(
    owner: string,
    feePayer: string,
    priorityFee?: string
  ): Promise<LuloInstructionsResponse> {
    const params = new URLSearchParams();
    if (priorityFee) params.append('priorityFee', priorityFee);

    const response = await fetch(
      `${this.baseUrl}/generate.instructions.initializeReferrer?${params.toString()}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          owner,
          feePayer,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async generateDepositInstructions(
    owner: string,
    feePayer: string,
    mintAddress: string,
    regularAmount?: number,
    protectedAmount?: number,
    referrer?: string,
    priorityFee?: string
  ): Promise<LuloInstructionsResponse> {
    const params = new URLSearchParams();
    if (priorityFee) params.append('priorityFee', priorityFee);

    const body: any = {
      owner,
      feePayer,
      mintAddress,
    };

    if (regularAmount !== undefined) body.regularAmount = regularAmount;
    if (protectedAmount !== undefined) body.protectedAmount = protectedAmount;
    if (referrer) body.referrer = referrer;

    const response = await fetch(
      `${this.baseUrl}/generate.instructions.deposit?${params.toString()}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async generateWithdrawProtectedInstructions(
    owner: string,
    feePayer: string,
    mintAddress: string,
    amount: number,
    priorityFee?: string
  ): Promise<LuloInstructionsResponse> {
    const params = new URLSearchParams();
    if (priorityFee) params.append('priorityFee', priorityFee);

    const response = await fetch(
      `${this.baseUrl}/generate.instructions.withdrawProtected?${params.toString()}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          owner,
          feePayer,
          mintAddress,
          amount,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async generateInitiateRegularWithdrawInstructions(
    owner: string,
    feePayer: string,
    mintAddress: string,
    amount: number,
    priorityFee?: string
  ): Promise<LuloInstructionsResponse> {
    const params = new URLSearchParams();
    if (priorityFee) params.append('priorityFee', priorityFee);

    const response = await fetch(
      `${this.baseUrl}/generate.instructions.initiateRegularWithdraw?${params.toString()}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          owner,
          feePayer,
          mintAddress,
          amount,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async generateCompleteRegularWithdrawalInstructions(
    owner: string,
    pendingWithdrawalId: number,
    feePayer: string,
    priorityFee?: string
  ): Promise<LuloInstructionsResponse> {
    const params = new URLSearchParams();
    if (priorityFee) params.append('priorityFee', priorityFee);

    const response = await fetch(
      `${this.baseUrl}/generate.instructions.completeRegularWithdrawal?${params.toString()}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          owner,
          pendingWithdrawalId,
          feePayer,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Data Retrieval Methods
  async getAccount(owner: string): Promise<LuloAccountResponse> {
    const params = new URLSearchParams({ owner });
    const response = await fetch(
      `${this.baseUrl}/account.getAccount?${params.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async getPendingWithdrawals(owner: string): Promise<LuloPendingWithdrawalsResponse> {
    const params = new URLSearchParams({ owner });
    const response = await fetch(
      `${this.baseUrl}/account.withdrawals.listPendingWithdrawals?${params.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async getPools(owner?: string): Promise<LuloPoolsResponse> {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);

    const response = await fetch(
      `${this.baseUrl}/pool.getPools?${params.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async getRates(owner?: string): Promise<LuloRatesResponse> {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);

    const response = await fetch(
      `${this.baseUrl}/rates.getRates?${params.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async getReferrer(owner: string): Promise<LuloReferrerResponse> {
    const params = new URLSearchParams({ owner });
    const response = await fetch(
      `${this.baseUrl}/referral.getReferrer?${params.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Utility Methods
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getApiKeyLength(): number {
    return this.apiKey.length;
  }
}

export default new LuloService();
