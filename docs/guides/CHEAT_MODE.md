# 🎮 Developer Guide: Safe Cheat Mode

> **⚠️ WARNING**: This feature is for **DEVELOPMENT & TESTING ONLY**. Never set the `TEST_CHEAT_KEY` environment variable in a production environment.

## Overview
The "Cheat Mode" allows developers to bypass complex on-chain signature verification and force a specific reputation grade (Grade A) for testing purposes. This is useful for UI testing, integration tests, or quick debugging without setting up a full wallet stack.

## Activation
Cheat mode is **disabled by default**. To enable it, you must set a secret key in your server's environment.

1.  **Configure Server (.env)**
    Add the following variable to your `.env` or `.env.local` file:
    ```env
    TEST_CHEAT_KEY=secure-random-key-123
    ```

## Usage
To use the cheat mode, include the secret key in your HTTP request headers.

### Request Header
| Header Name | Value | Description |
| :--- | :--- | :--- |
| `X-Test-Cheat-Key` | `<YOUR_SECRET_KEY>` | Must match the server's env var identically. |

### Example (cURL)
```bash
curl -X GET http://localhost:3000/gatekeeper/my-service/resource \
  -H "X-Agent-ID: test-agent" \
  -H "X-Test-Cheat-Key: secure-random-key-123"
```

### Example (Axis/JS)
```javascript
const response = await axios.get(url, {
  headers: {
    'X-Agent-ID': 'test-runner',
    'X-Test-Cheat-Key': process.env.TEST_CHEAT_KEY // Load from client env
  }
});
```

## Behavior
When active:
1.  **Signature Verification**: SKIPPED (No `X-Agent-Signature` or `X-Auth-Timestamp` required).
2.  **Reputation Score**: IGNORED (Real score is not fetched).
3.  **Forced Grade**: **Grade A** (Highest trust tier).
4.  **Optimistic Payment**: GRANTED (Allows "Pay Later" flow immediately).

## Security Note
-   The server checks `process.env.TEST_CHEAT_KEY`. If this variable is empty or undefined, the cheat logic is **completely skipped**, ensuring production safety.
-   Always use a strong, random string for the key if used in a shared dev environment through network tunnels (e.g., ngrok).
