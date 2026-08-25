# eGovPH SSO Integration Guide

## Overview

This document describes the eGovPH Single Sign-On (SSO) integration for eBuddy Digital Citizen Portal.

## Technical Requirements

### ✅ SSL Certificate
- **Status**: Required in production
- **Implementation**: Configured via `EGOV_CONFIG.requireSSL`
- **Note**: Ensure your hosting environment has a valid SSL certificate

### ✅ Mobile Responsiveness
- All pages are built with mobile-first responsive design
- Tailwind CSS breakpoints ensure proper display on all devices
- Touch targets meet minimum 44px requirement

### ✅ Base URL Configuration
- **SSO Callback URL**: `https://your-domain.com/egovph/sso?exchange_code={code}`
- **Configuration**: Set in `.env` file via `VITE_APP_BASE_URL`

## SSO Flow Implementation

### 1. User Authentication Flow

```typescript
// 1. User clicks "Sign in with eGovPH"
// 2. Redirect to eGovPH SSO
window.location.href = `${EGOV_SSO_URL}/authorize?callback=${YOUR_CALLBACK_URL}`

// 3. eGovPH redirects back with exchange_code
// https://your-domain.com/egovph/sso?exchange_code=abc123

// 4. Exchange code for user data
const userData = await exchangeCodeForUserData(exchangeCode)

// 5. Find or create user
const user = await findExistingUser(userData) || await registerUser(userData)

// 6. Auto-login
login(user)
```

### 2. User Matching Logic

#### Existing Users
1. **Primary Match**: Search by `uniqid`
2. **Secondary Match**: Match by personal details (name + birthdate)
3. **Bind uniqid**: If matched by details, bind the uniqid to streamline future logins

#### New Users
1. Automatically register using eGovPH SSO data
2. Set `profileLocked: true` to prevent local edits
3. Auto-authenticate and redirect to dashboard

## API Endpoints

### Required Backend Endpoints

```typescript
// 1. Exchange authorization code
POST /api/auth/exchange
Body: { exchange_code: string }
Response: { user: EGovUser }

// 2. Find user by uniqid
GET /api/users/find?uniqid={uniqid}
Response: { user: User }

// 3. Match user by details
POST /api/users/match
Body: { firstName, lastName, birthdate }
Response: { user: User }

// 4. Register new user
POST /api/users/register
Body: EGovUser
Response: { user: User }

// 5. Bind uniqid to existing user
PATCH /api/users/{userId}/bind-uniqid
Body: { uniqid: string }

// 6. Update last login
PATCH /api/users/{userId}/last-login
Body: { lastLogin: string }
```

## UI/UX Implementation

### ✅ Features Disabled
- ❌ Manual login/registration forms
- ❌ Password management pages
- ❌ Profile editing (locked by eGovPH)
- ❌ External app download links

### ✅ Profile Locking
- All profile updates must occur through eGovPH
- Users see a "Profile Locked" notice
- Profile displays read-only data from eGovPH

## Data Mapping

```typescript
interface EGovUser {
  uniqid: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  birthdate: string
  email: string
  mobileNumber: string
  address: {
    street?: string
    barangay?: string
    city: string
    province: string
    region: string
    zipCode?: string
  }
}
```

## Session Management

- **Duration**: 30 minutes (configurable)
- **Storage**: LocalStorage
- **Auto-refresh**: Implement token refresh if needed
- **Logout**: Managed via eGovPH (no manual logout)

## Security Considerations

1. **SSL/TLS**: Always use HTTPS in production
2. **CSRF Protection**: Implement CSRF tokens for state management
3. **Session Validation**: Validate exchange_code server-side
4. **Data Encryption**: Encrypt sensitive data at rest
5. **Rate Limiting**: Implement rate limiting on callback endpoint

## Configuration

### Environment Variables

Create a `.env` file:

```bash
# Your application's public URL
VITE_APP_BASE_URL=https://govassistant.example.com

# eGovPH SSO endpoint (provided by eGovPH)
VITE_EGOV_SSO_URL=https://sso.egovph.gov.ph

# Your backend API URL
VITE_API_BASE_URL=https://govassistant.example.com/api
```

## Testing Checklist

### Data Sync
- [ ] User info accurately mapped from eGovPH
- [ ] Name, birthdate, address, email, mobile sync correctly
- [ ] Special characters in names handled properly

### Auto-Login
- [ ] Users logged in automatically after SSO callback
- [ ] Session persists across page refreshes
- [ ] Session expires after configured timeout

### Profile Locking
- [ ] Profile page is read-only
- [ ] "Managed by eGovPH" notice displayed
- [ ] No edit buttons or forms visible
- [ ] Link to eGovPH portal for updates

### No Manual Auth
- [ ] No login/registration forms visible
- [ ] No manual logout button (sessions managed by eGovPH)
- [ ] Only SSO sign-in button on landing page

### Mobile Responsiveness
- [ ] No text/image overlap on mobile devices
- [ ] Proper display on smartphones (320px - 428px)
- [ ] Proper display on tablets (768px - 1024px)
- [ ] Touch targets minimum 44x44px
- [ ] Fast load times on 3G/4G connections

## Troubleshooting

### Common Issues

**Issue**: Missing exchange_code parameter
- **Solution**: Verify callback URL is correctly configured in eGovPH dashboard

**Issue**: User data not syncing
- **Solution**: Check API endpoint responses and data mapping

**Issue**: Session not persisting
- **Solution**: Verify localStorage is enabled and not blocked

**Issue**: Mobile layout issues
- **Solution**: Test responsive breakpoints and viewport settings

## Support

For eGovPH SSO technical support:
- Email: support@egovph.gov.ph
- Documentation: https://docs.egovph.gov.ph/sso

## Compliance

This implementation meets all eGovPH SSO integration requirements:
- ✅ Active SSL Certificate
- ✅ Mobile Responsiveness
- ✅ Proper SSO callback URL
- ✅ Data sync and user matching
- ✅ Auto-login functionality
- ✅ Profile locking
- ✅ No manual authentication
