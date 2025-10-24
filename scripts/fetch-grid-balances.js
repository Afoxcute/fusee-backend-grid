"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
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
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
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
exports.fetchGridBalances = fetchGridBalances;
exports.fetchGridBalancesWithParams = fetchGridBalancesWithParams;
exports.testGridConfig = testGridConfig;
var grid_1 = require("@sqds/grid");
var env_1 = require("../src/config/env");
// Grid account address to fetch balances for
var GRID_ACCOUNT_ADDRESS = '4UPqaqbN8caP5NBs7k4jf9py4jsRyM75VdixLvifkqDa';
// Initialize Grid client
var gridClient = new grid_1.GridClient({
    environment: env_1.config.grid.environment,
    apiKey: env_1.config.grid.apiKey,
});
// Token mint addresses for reference
var TOKEN_MINTS = {
    SOL: 'So11111111111111111111111111111111111111112', // Native SOL
    USDC_MAINNET: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
',
    USDC_DEVNET: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
};
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
// Main function to fetch and display balances
function fetchGridBalances() {
    return __awaiter(this, void 0, void 0, function () {
        var balances, data, solBalance, hasUsdcMainnet, hasUsdcDevnet, error_1;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 2, , 3]);
                    console.log('🔍 Fetching Grid account balances...');
                    console.log("\uD83D\uDCCB Account Address: ".concat(GRID_ACCOUNT_ADDRESS));
                    console.log("\uD83C\uDF10 Environment: ".concat(env_1.config.grid.environment));
                    console.log("\uD83D\uDD11 API Key: ".concat(env_1.config.grid.apiKey ? '✅ Set' : '❌ Missing'));
                    console.log('─'.repeat(60));
                    // Validate Grid configuration
                    if (!env_1.config.grid.apiKey) {
                        throw new Error('Grid API key is not configured');
                    }
                    // Fetch account balances using Grid SDK
                    console.log('📡 Calling Grid API...');
                    return [4 /*yield*/, gridClient.getAccountBalances(GRID_ACCOUNT_ADDRESS)];
                case 1:
                    balances = _e.sent();
                    // Check if the API call was successful
                    if (!balances.success) {
                        console.error('❌ Grid API call failed:');
                        console.error('Error:', balances.error);
                        console.error('Response:', balances);
                        return [2 /*return*/];
                    }
                    console.log('✅ Grid API call successful!');
                    console.log('─'.repeat(60));
                    // Display raw response for debugging
                    console.log('📊 Raw Grid API Response:');
                    console.log(JSON.stringify(balances, null, 2));
                    console.log('─'.repeat(60));
                    data = balances.data;
                    if (!data) {
                        console.log('⚠️  No balance data received');
                        return [2 /*return*/];
                    }
                    console.log('💰 Account Balances:');
                    console.log('─'.repeat(60));
                    // Display native SOL balance
                    if (data.native) {
                        solBalance = formatBalance(data.native.balance, data.native.decimals);
                        console.log("\uD83D\uDFE1 SOL (Native):");
                        console.log("   Balance: ".concat(data.native.balance, " lamports"));
                        console.log("   Formatted: ".concat(solBalance, " SOL"));
                        console.log("   Decimals: ".concat(data.native.decimals));
                    }
                    else {
                        console.log('🟡 SOL (Native): 0 SOL');
                    }
                    // Display SPL token balances
                    if (data.tokens && data.tokens.length > 0) {
                        console.log("\n\uD83E\uDE99 SPL Tokens (".concat(data.tokens.length, " tokens):"));
                        data.tokens.forEach(function (token, index) {
                            var symbol = getTokenSymbol(token.mint);
                            var formattedBalance = formatBalance(token.balance, token.decimals);
                            console.log("\n   ".concat(index + 1, ". ").concat(symbol, ":"));
                            console.log("      Mint: ".concat(token.mint));
                            console.log("      Balance: ".concat(token.balance));
                            console.log("      Formatted: ".concat(formattedBalance, " ").concat(symbol));
                            console.log("      Decimals: ".concat(token.decimals));
                        });
                    }
                    else {
                        console.log('\n🪙 SPL Tokens: None');
                    }
                    // Display summary
                    console.log('\n📈 Summary:');
                    console.log('─'.repeat(60));
                    console.log("Total SPL Tokens: ".concat(((_a = data.tokens) === null || _a === void 0 ? void 0 : _a.length) || 0));
                    console.log("Has Native SOL: ".concat(!!data.native));
                    console.log("Has USDC: ".concat(((_b = data.tokens) === null || _b === void 0 ? void 0 : _b.some(function (t) {
                        return t.mint === TOKEN_MINTS.USDC_MAINNET || t.mint === TOKEN_MINTS.USDC_DEVNET;
                    })) || false));
                    hasUsdcMainnet = ((_c = data.tokens) === null || _c === void 0 ? void 0 : _c.some(function (t) { return t.mint === TOKEN_MINTS.USDC_MAINNET; })) || false;
                    hasUsdcDevnet = ((_d = data.tokens) === null || _d === void 0 ? void 0 : _d.some(function (t) { return t.mint === TOKEN_MINTS.USDC_DEVNET; })) || false;
                    if (hasUsdcMainnet) {
                        console.log('✅ USDC (Mainnet) detected');
                    }
                    if (hasUsdcDevnet) {
                        console.log('✅ USDC (Devnet) detected');
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _e.sent();
                    console.error('❌ Error fetching Grid balances:');
                    console.error('Error:', error_1);
                    if (error_1 instanceof Error) {
                        console.error('Message:', error_1.message);
                        console.error('Stack:', error_1.stack);
                    }
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Function to test with query parameters
function fetchGridBalancesWithParams() {
    return __awaiter(this, void 0, void 0, function () {
        var queryParams, balances, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    console.log('\n🔍 Fetching Grid account balances with query parameters...');
                    console.log('─'.repeat(60));
                    queryParams = {
                        limit: 10, // Maximum number of tokens to return
                        offset: 0, // Number of tokens to skip
                        mint: TOKEN_MINTS.USDC_DEVNET, // Filter by specific mint (optional)
                    };
                    console.log('📋 Query Parameters:');
                    console.log(JSON.stringify(queryParams, null, 2));
                    return [4 /*yield*/, gridClient.getAccountBalances(GRID_ACCOUNT_ADDRESS, queryParams)];
                case 1:
                    balances = _a.sent();
                    if (!balances.success) {
                        console.error('❌ Grid API call with params failed:');
                        console.error('Error:', balances.error);
                        return [2 /*return*/];
                    }
                    console.log('✅ Grid API call with params successful!');
                    console.log('📊 Response with query params:');
                    console.log(JSON.stringify(balances, null, 2));
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    console.error('❌ Error fetching Grid balances with params:');
                    console.error('Error:', error_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Function to test Grid configuration
function testGridConfig() {
    return __awaiter(this, void 0, void 0, function () {
        var testBalances, error_3;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    console.log('\n🔧 Testing Grid Configuration...');
                    console.log('─'.repeat(60));
                    console.log("Environment: ".concat(env_1.config.grid.environment));
                    console.log("API Key Length: ".concat(((_a = env_1.config.grid.apiKey) === null || _a === void 0 ? void 0 : _a.length) || 0));
                    console.log("API Key Set: ".concat(env_1.config.grid.apiKey ? 'Yes' : 'No'));
                    // Test with a simple call
                    console.log('\n🧪 Testing Grid API connectivity...');
                    return [4 /*yield*/, gridClient.getAccountBalances(GRID_ACCOUNT_ADDRESS)];
                case 1:
                    testBalances = _b.sent();
                    console.log("API Call Success: ".concat(testBalances.success));
                    if (!testBalances.success) {
                        console.log("API Error: ".concat(testBalances.error));
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _b.sent();
                    console.error('❌ Grid configuration test failed:');
                    console.error('Error:', error_3);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
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
                    console.log('🚀 Grid Balance Fetcher Script');
                    console.log('═'.repeat(60));
                    // Test Grid configuration first
                    return [4 /*yield*/, testGridConfig()];
                case 1:
                    // Test Grid configuration first
                    _a.sent();
                    // Fetch balances without parameters
                    return [4 /*yield*/, fetchGridBalances()];
                case 2:
                    // Fetch balances without parameters
                    _a.sent();
                    // Fetch balances with parameters
                    return [4 /*yield*/, fetchGridBalancesWithParams()];
                case 3:
                    // Fetch balances with parameters
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
