"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](e)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t[t.length - 1]]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchBlockchainBalances = fetchBlockchainBalances;
exports.testBlockchainConnection = testBlockchainConnection;
var web3_js_1 = require("@solana/web3.js");
var spl_token_1 = require("@solana/spl-token");
// Wallet address to fetch balances for
var WALLET_ADDRESS = '4UPqaqbN8caP5NBs7k4jf9py4jsRyM75VdixLvifkqDa';
// Solana devnet RPC endpoint
var DEVNET_RPC_URL = 'https://api.devnet.solana.com';
// Token mint addresses
var TOKEN_MINTS = {
    SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL
    USDC_DEVNET: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
    USDC_MAINNET: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
', // Mainnet USDC
};
// Initialize Solana connection
var connection = new web3_js_1.Connection(DEVNET_RPC_URL, 'confirmed');
// Helper function to format balance
function formatBalance(balance, decimals) {
    var num = parseFloat(balance);
    return (num / Math.pow(10, decimals)).toFixed(decimals);
}
// Helper function to get token symbol
function getTokenSymbol(mint) {
    switch (mint) {
        case TOKEN_MINTS.SOL:
            return 'SOL';
        case TOKEN_MINTS.USDC_MAINNET:
        case TOKEN_MINTS.USDC_DEVNET:
            return 'USDC';
        default:
            return 'UNKNOWN';
    }
}
// Test blockchain connection
function testBlockchainConnection() {
    return __awaiter(this, void 0, void 0, function () {
        var version, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('🔧 Testing Blockchain Connection...');
                    console.log('─'.repeat(60));
                    console.log("RPC URL: ".concat(DEVNET_RPC_URL));
                    return [4 /*yield*/, connection.getVersion()];
                case 1:
                    version = _a.sent();
                    console.log("✅ Connection successful!");
                    console.log("Solana Core Version: ".concat(version['solana-core']));
                    console.log("Feature Set: ".concat(version['feature-set']));
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error('❌ Blockchain connection failed:');
                    console.error('Error:', error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Get SOL balance for a wallet address
function getSolBalance(walletAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var publicKey, balance, formattedBalance, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('🔍 Fetching SOL balance...');
                    publicKey = new web3_js_1.PublicKey(walletAddress);
                    return [4 /*yield*/, connection.getBalance(publicKey)];
                case 1:
                    balance = _a.sent();
                    formattedBalance = (balance / web3_js_1.LAMPORTS_PER_SOL).toFixed(9);
                    console.log("✅ SOL Balance: ".concat(formattedBalance, " SOL (").concat(balance, " lamports)"));
                    return [2 /*return*/, {
                            mint: TOKEN_MINTS.SOL,
                            balance: balance.toString(),
                            formattedBalance: formattedBalance,
                            decimals: 9,
                            symbol: 'SOL',
                            uiAmount: parseFloat(formattedBalance),
                        }];
                case 2:
                    error_2 = _a.sent();
                    console.error('❌ Error fetching SOL balance:', error_2);
                    return [2 /*return*/, {
                            mint: TOKEN_MINTS.SOL,
                            balance: '0',
                            formattedBalance: '0.000000000',
                            decimals: 9,
                            symbol: 'SOL',
                            uiAmount: 0,
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Get USDC balance for a wallet address
function getUsdcBalance(walletAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var publicKey, usdcMint, tokenAccounts, accountInfo, balance, decimals, formattedBalance, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('🔍 Fetching USDC balance...');
                    publicKey = new web3_js_1.PublicKey(walletAddress);
                    usdcMint = new web3_js_1.PublicKey(TOKEN_MINTS.USDC_DEVNET);
                    return [4 /*yield*/, connection.getParsedTokenAccountsByOwner(publicKey, { mint: usdcMint })];
                case 1:
                    tokenAccounts = _a.sent();
                    if (tokenAccounts.value.length === 0) {
                        console.log('⚠️  No USDC token account found');
                        return [2 /*return*/, {
                                mint: TOKEN_MINTS.USDC_DEVNET,
                                balance: '0',
                                formattedBalance: '0.000000',
                                decimals: 6,
                                symbol: 'USDC',
                                uiAmount: 0,
                            }];
                    }
                    accountInfo = tokenAccounts.value[0].account.data.parsed.info;
                    balance = accountInfo.tokenAmount.amount;
                    decimals = accountInfo.tokenAmount.decimals;
                    formattedBalance = (parseFloat(balance) / Math.pow(10, decimals)).toFixed(decimals);
                    console.log("✅ USDC Balance: ".concat(formattedBalance, " USDC (").concat(balance, " units)"));
                    return [2 /*return*/, {
                            mint: TOKEN_MINTS.USDC_DEVNET,
                            balance: balance,
                            formattedBalance: formattedBalance,
                            decimals: decimals,
                            symbol: 'USDC',
                            uiAmount: parseFloat(formattedBalance),
                            accountAddress: tokenAccounts.value[0].pubkey.toString(),
                        }];
                case 2:
                    error_3 = _a.sent();
                    console.error('❌ Error fetching USDC balance:', error_3);
                    return [2 /*return*/, {
                            mint: TOKEN_MINTS.USDC_DEVNET,
                            balance: '0',
                            formattedBalance: '0.000000',
                            decimals: 6,
                            symbol: 'USDC',
                            uiAmount: 0,
                        }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Get all token balances for a wallet address
function getAllTokenBalances(walletAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var publicKey, tokenAccounts, tokenBalances, tokenAccount, accountInfo, mint, balance, decimals, formattedBalance, symbol, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('🔍 Fetching all token balances...');
                    publicKey = new web3_js_1.PublicKey(walletAddress);
                    return [4 /*yield*/, connection.getParsedTokenAccountsByOwner(publicKey, { programId: new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') })];
                case 1:
                    tokenAccounts = _a.sent();
                    tokenBalances = [];
                    tokenAccounts.value.forEach(function (tokenAccount) {
                        accountInfo = tokenAccount.account.data.parsed.info;
                        mint = accountInfo.mint;
                        balance = accountInfo.tokenAmount.amount;
                        decimals = accountInfo.tokenAmount.decimals;
                        // Skip zero balance tokens
                        if (parseFloat(balance) === 0)
                            return;
                        formattedBalance = (parseFloat(balance) / Math.pow(10, decimals)).toFixed(decimals);
                        // Determine symbol based on mint address
                        symbol = 'UNKNOWN';
                        if (mint === TOKEN_MINTS.SOL)
                            symbol = 'SOL';
                        else if (mint === TOKEN_MINTS.USDC_DEVNET)
                            symbol = 'USDC';
                        else if (mint === TOKEN_MINTS.USDC_MAINNET)
                            symbol = 'USDC';
                        tokenBalances.push({
                            mint: mint,
                            balance: balance,
                            formattedBalance: formattedBalance,
                            decimals: decimals,
                            symbol: symbol,
                            uiAmount: parseFloat(formattedBalance),
                            accountAddress: tokenAccount.pubkey.toString(),
                        });
                    });
                    console.log("✅ Found ".concat(tokenBalances.length, " token accounts with non-zero balances"));
                    return [2 /*return*/, tokenBalances];
                case 2:
                    error_4 = _a.sent();
                    console.error('❌ Error fetching all token balances:', error_4);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Main function to fetch and display balances from blockchain
function fetchBlockchainBalances() {
    return __awaiter(this, void 0, void 0, function () {
        var solBalance, usdcBalance, allTokens, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    console.log('🔍 Fetching blockchain balances...');
                    console.log("📋 Wallet Address: ".concat(WALLET_ADDRESS));
                    console.log("🌐 RPC URL: ".concat(DEVNET_RPC_URL));
                    console.log('─'.repeat(60));
                    return [4 /*yield*/, getSolBalance(WALLET_ADDRESS)];
                case 1:
                    solBalance = _a.sent();
                    return [4 /*yield*/, getUsdcBalance(WALLET_ADDRESS)];
                case 2:
                    usdcBalance = _a.sent();
                    return [4 /*yield*/, getAllTokenBalances(WALLET_ADDRESS)];
                case 3:
                    allTokens = _a.sent();
                    console.log('\n💰 Blockchain Balances Summary:');
                    console.log('─'.repeat(60));
                    console.log("🟡 SOL: ".concat(solBalance.formattedBalance, " SOL"));
                    console.log("💵 USDC: ".concat(usdcBalance.formattedBalance, " USDC"));
                    console.log("🪙 Total Tokens: ".concat(allTokens.length));
                    console.log('\n📊 Detailed Token Information:');
                    console.log('─'.repeat(60));
                    allTokens.forEach(function (token, index) {
                        console.log("\n   ".concat(index + 1, ". ").concat(token.symbol, ":"));
                        console.log("      Mint: ".concat(token.mint));
                        console.log("      Balance: ".concat(token.balance));
                        console.log("      Formatted: ".concat(token.formattedBalance, " ").concat(token.symbol));
                        console.log("      Decimals: ".concat(token.decimals));
                        console.log("      Account: ".concat(token.accountAddress));
                    });
                    console.log('\n✅ Blockchain balance fetch completed!');
                    return [3 /*break*/, 5];
                case 4:
                    error_5 = _a.sent();
                    console.error('❌ Error fetching blockchain balances:');
                    console.error('Error:', error_5);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
// Main execution
function main() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🚀 Blockchain Balance Fetcher Script');
                    console.log('═'.repeat(60));
                    return [4 /*yield*/, testBlockchainConnection()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, fetchBlockchainBalances()];
                case 2:
                    _a.sent();
                    console.log('\n✅ Script completed!');
                    return [2 /*return*/];
            }
        });
    });
}
// Run the script
if (require.main === module) {
    main().catch(console.error);
}

