# Testing eGovPH SSO Integration

## Quick Start

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Access the test page**
   - Click the green "Test SSO" button in the bottom-left corner
   - Or navigate to: `http://localhost:5173/test-sso`

3. **Generate test credentials**
   - Click "Run Complete Test Flow"
   - Or follow step-by-step: Generate Token → Generate Code → Test Auth

## Testing Flow

### Method 1: Quick Test (Recommended)
1. Open test page via floating "Test SSO" button
2. (Optional) Enter a test account ID
3. Click "Run Complete Test Flow"
4. Click "Test Authentication" to simulate SSO callback
5. Check if you're redirected and logged in

### Method 2: Step-by-Step
1. Click "Generate Access Token"
2. Copy the access token (shown below button)
3. Click "Generate Exchange Code"
4. Copy the exchange code
5. Click "Test Authentication Flow"
6. Verify auto-login and redirect to dashboard

## What Gets Tested

✅ Partner authentication (access token generation)  
✅ Exchange code minting with test identity  
✅ SSO callback handling  
✅ User data exchange and mapping  
✅ Auto-login functionality  
✅ Session management  

## Understanding the Test Data

The eGovPH hackathon API provides test accounts with pre-populated data:
- Name, birthdate, address
- Email and mobile number  
- Unique identifier (uniqid)

When you generate an exchange code, you're essentially creating a "mock authentication" that simulates a real user signing in via eGovPH.

## Troubleshooting

**Token generation fails**
- Check internet connection
- Verify partner credentials in `.env`
- Check browser console for errors

**Exchange code generation fails**
- Ensure access token was generated first
- Check token hasn't expired (typically 1 hour)
- Verify API endpoint is accessible

**Authentication flow doesn't work**
- Check browser console for errors
- Verify exchange code is valid
- Check that callback URL matches configured route

**403 Forbidden errors**
- This is expected when trying to use eGovPH's `/authorize` endpoint directly
- Use the test page instead to generate exchange codes programmatically

## API Endpoints Used

```
POST https://hackathon-sso.e.gov.ph/api/token
- Generate partner access token
- Body: { partner_code, partner_secret }

POST https://hackathon-sso.e.gov.ph/api/mint
- Generate exchange code with test account
- Headers: Authorization: Bearer {token}
- Body: { test_account, partner_code }

POST https://hackathon-sso.e.gov.ph/api/user-info
- Exchange code for user data
- Body: { exchange_code, partner_code }
```

## Notes

- Test page only visible in development mode
- Exchange codes typically expire after 5-10 minutes
- Access tokens expire after 1 hour
- All test data is simulated and not real user data
