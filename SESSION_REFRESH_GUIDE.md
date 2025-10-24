# Session Refresh Guide

## Overview
This guide explains how to handle Privy session expiry and refresh sessions using the new endpoints.

## Session Expiry Details
- **Privy Session Expiry**: 24 hours
- **OTP Expiry**: 15 minutes
- **Error**: "Privy signing error: KeyQuorum user session key is expired"

## New Endpoints

### 1. Check Session Status
```bash
GET /api/users/session-status/{email}
```

**Example Response (Expired Session):**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "gridAddress": "ELZZGyUaouBYC4K23QhL82BR8VRnQNvofkjoP5z7HvBV"
  },
  "sessionStatus": {
    "isExpired": true,
    "sessionAgeHours": 25,
    "sessionExpiryHours": 24,
    "needsRefresh": true,
    "lastUpdated": "2025-10-19T10:00:00.000Z"
  },
  "guidance": {
    "message": "Your Privy session has expired. Please refresh your session to continue.",
    "action": "Call /api/users/refresh-session to refresh your session",
    "expiryInfo": {
      "sessionExpiresAfter": "24 hours",
      "otpExpiresAfter": "15 minutes"
    }
  }
}
```

### 2. Refresh Session (Initiate)
```bash
POST /api/users/refresh-session
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Session refresh initiated. Please complete authentication with OTP.",
  "pendingKey": "12345678-1234-1234-1234-123456789abc",
  "maskedKey": "12345678...9abc",
  "expiresAt": "2025-10-20T12:00:00.000Z",
  "sessionExpired": true
}
```

### 3. Complete Session Refresh
```bash
POST /api/users/complete-session-refresh
Content-Type: application/json

{
  "pendingKey": "12345678-1234-1234-1234-123456789abc",
  "otpCode": "123456"
}
```

**Response:**
```json
{
  "message": "Session refreshed successfully",
  "token": "new_jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "gridAddress": "ELZZGyUaouBYC4K23QhL82BR8VRnQNvofkjoP5z7HvBV"
  },
  "sessionRefreshed": true
}
```

## Error Handling in Transactions

When a transaction fails due to session expiry, you'll receive:

```json
{
  "error": "Session expired",
  "details": "Your Privy session has expired. Please refresh your session to continue.",
  "sessionExpired": true,
  "guidance": {
    "message": "Your authentication session has expired after 24 hours.",
    "action": "Call /api/users/refresh-session to refresh your session",
    "endpoints": {
      "refreshSession": "/api/users/refresh-session",
      "completeRefresh": "/api/users/complete-session-refresh",
      "checkStatus": "/api/users/session-status/user@example.com"
    }
  }
}
```

## Usage Flow

1. **Detect Session Expiry**: Transaction fails with "Privy signing error"
2. **Check Status**: Call `/api/users/session-status/{email}` to confirm
3. **Initiate Refresh**: Call `/api/users/refresh-session` with email
4. **Complete Refresh**: Use OTP from email to call `/api/users/complete-session-refresh`
5. **Retry Transaction**: Use new JWT token for subsequent requests

## Frontend Integration

```javascript
async function handleTransactionWithSessionRefresh(transactionData) {
  try {
    return await executeTransaction(transactionData);
  } catch (error) {
    if (error.sessionExpired) {
      // Session expired, refresh it
      await refreshUserSession(error.guidance.endpoints);
      // Retry transaction
      return await executeTransaction(transactionData);
    }
    throw error;
  }
}

async function refreshUserSession(endpoints) {
  // 1. Initiate refresh
  const refreshResponse = await fetch(endpoints.refreshSession, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail })
  });
  
  const { pendingKey } = await refreshResponse.json();
  
  // 2. Get OTP from user (email)
  const otpCode = await promptUserForOTP();
  
  // 3. Complete refresh
  const completeResponse = await fetch(endpoints.completeRefresh, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pendingKey, otpCode })
  });
  
  const { token } = await completeResponse.json();
  
  // 4. Update stored token
  localStorage.setItem('authToken', token);
}
```

## Testing

Test session expiry by:
1. Waiting 24+ hours after authentication
2. Attempting a transaction
3. Verifying you receive session expiry error
4. Following the refresh flow
5. Confirming transactions work after refresh

