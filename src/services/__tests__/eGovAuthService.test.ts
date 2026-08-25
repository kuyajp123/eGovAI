import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  authenticateWithEGovAccessToken,
  authenticateWithEGovExchangeCode,
  authenticateWithOtpAndPin,
  authenticateWithPin,
  checkPartnerAccess,
  EGovAuthenticationError,
  exchangeEGovCodeForAccessToken,
  fetchEGovProfile,
  generateOtp,
  mapEGovProfileToUser,
  validateOtp,
} from '../eGovAuthService'

const apiProfile = {
  uniqid: 'MVPCBEUVCGPZR',
  email: 'josie@yopmail.com',
  birth_date: '1990-01-01',
  first_name: 'JOSIE',
  middle_name: 'SANTOS',
  last_name: 'DELA CRUZ',
  suffix: 'JR',
  mobile: '+639090000001',
  photo: 'https://example.test/josie.png',
  street: '1123 RIZAL ST.',
  barangay: 'POBLACION',
  municipality: 'CITY OF ALAMINOS',
  province: 'PANGASINAN',
  region: 'REGION I (ILOCOS REGION)',
  zip_code: '2404',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('eGovPH SSO Authentication Service', () => {
  describe('Profile Mapping (mapEGovProfileToUser)', () => {
    it('maps complete API profile into local user session structure', () => {
      const user = mapEGovProfileToUser(apiProfile)

      expect(user.id).toBe('MVPCBEUVCGPZR')
      expect(user.uniqid).toBe('MVPCBEUVCGPZR')
      expect(user.firstName).toBe('JOSIE')
      expect(user.middleName).toBe('SANTOS')
      expect(user.lastName).toBe('DELA CRUZ')
      expect(user.suffix).toBe('JR')
      expect(user.email).toBe('josie@yopmail.com')
      expect(user.mobileNumber).toBe('+639090000001')
      expect(user.address.city).toBe('CITY OF ALAMINOS')
      expect(user.address.zipCode).toBe('2404')
      expect(user.profileLocked).toBe(true)
      expect(user.ssoProvider).toBe('egovph')
      expect(user.profilePhotoUrl).toBe('https://example.test/josie.png')
    })

    it('maps nested address and alternative field names properly', () => {
      const altProfile = {
        user_id: 'ALT_CITIZEN_123',
        firstName: 'Pedro',
        lastName: 'Penduko',
        birthdate: '1985-05-15',
        phone: '+639171234567',
        profile_photo_url: 'https://example.test/pedro.png',
        address: {
          street: '456 Mabini St',
          barangay: 'San Antonio',
          city: 'Pasig City',
          province: 'Metro Manila',
          region: 'NCR',
          zipCode: '1600',
        },
      }

      const user = mapEGovProfileToUser(altProfile)
      expect(user.uniqid).toBe('ALT_CITIZEN_123')
      expect(user.firstName).toBe('Pedro')
      expect(user.lastName).toBe('Penduko')
      expect(user.mobileNumber).toBe('+639171234567')
      expect(user.address.city).toBe('Pasig City')
      expect(user.address.zipCode).toBe('1600')
      expect(user.profilePhotoUrl).toBe('https://example.test/pedro.png')
    })

    it('throws when profile has no unique citizen identifier', () => {
      expect(() => mapEGovProfileToUser({})).toThrow('The eGovPH profile did not include a valid citizen identifier')
    })
  })

  describe('Mode A: In-App SSO (authenticateWithEGovExchangeCode)', () => {
    it('successfully converts exchange_code to token and retrieves profile', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'valid_access_token_123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 200, data: apiProfile }),
        })
      vi.stubGlobal('fetch', fetchMock)

      const user = await authenticateWithEGovExchangeCode('802d20idlNst3YNSVjuMKWV9q7LVESCI')

      expect(fetchMock).toHaveBeenCalledTimes(2)
      // Call 1: POST /api/token
      expect(fetchMock.mock.calls[0][0]).toBe('/egov-api/api/token')
      const tokenBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
      expect(tokenBody.exchange_code).toBe('802d20idlNst3YNSVjuMKWV9q7LVESCI')
      expect(tokenBody.scope).toBe('SSO_AUTHENTICATION')

      // Call 2: POST /api/partner/sso_authentication
      expect(fetchMock.mock.calls[1][0]).toBe('/egov-api/api/partner/sso_authentication')
      expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({
        Authorization: 'Bearer valid_access_token_123',
      })

      expect(user.uniqid).toBe('MVPCBEUVCGPZR')
      expect(user.firstName).toBe('JOSIE')
    })

    it('handles 401 expired exchange code', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'unauthorized', message: 'The exchange_code is expired' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await expect(authenticateWithEGovExchangeCode('expired_code')).rejects.toThrow(
        EGovAuthenticationError
      )
    })

    it('handles 403 forbidden partner credentials', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'forbidden' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await expect(authenticateWithEGovExchangeCode('any_code')).rejects.toThrow(
        /Access Forbidden/
      )
    })

    it('handles 429 quota exceeded', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'quota_exceeded' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await expect(authenticateWithEGovExchangeCode('any_code')).rejects.toThrow(
        /Quota Exceeded/
      )
    })
  })

  describe('Appendix A: Direct REST APIs (OTP + PIN)', () => {
    it('checkPartnerAccess probes partner code status', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ is_code_valid: 1 }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const isValid = await checkPartnerAccess()
      expect(isValid).toBe(true)
      expect(fetchMock.mock.calls[0][0]).toBe('/egov-api/api/partner/check_access')
    })

    it('generateOtp sends OTP generation request', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 200, message: 'OTP sent' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await generateOtp('+639090000001', 'MOBILE_NUMBER')
      expect(result.success).toBe(true)
      expect(fetchMock.mock.calls[0][0]).toBe('/egov-api/api/otp_generate')
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
      expect(body.username).toBe('+639090000001')
      expect(body.type).toBe('MOBILE_NUMBER')
    })

    it('validateOtp receives validation token', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ otp_validation_token: 'TOKEN_XYZ_123' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const token = await validateOtp('+639090000001', '123456', 'MOBILE_NUMBER')
      expect(token).toBe('TOKEN_XYZ_123')
      expect(fetchMock.mock.calls[0][0]).toBe('/egov-api/api/otp_validate')
    })

    it('authenticateWithPin receives exchange code', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          exchange_code: 'EXCHANGE_CODE_789',
          shared_data: ['Fullname', 'Birthdate', 'Mobile'],
        }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const res = await authenticateWithPin('+639090000001', '000000', 'TOKEN_XYZ_123')
      expect(res.exchangeCode).toBe('EXCHANGE_CODE_789')
      expect(res.sharedData).toContain('Fullname')
    })

    it('authenticateWithOtpAndPin completes full Appendix A OTP + PIN flow', async () => {
      const fetchMock = vi.fn()
        // 1. otp_validate
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ otp_validation_token: 'VALID_TOKEN' }),
        })
        // 2. authenticate
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ exchange_code: 'MINTED_EXCHANGE_CODE' }),
        })
        // 3. token
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'FINAL_ACCESS_TOKEN' }),
        })
        // 4. sso_authentication profile
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 200, data: apiProfile }),
        })
      vi.stubGlobal('fetch', fetchMock)

      const user = await authenticateWithOtpAndPin('+639090000001', '123456', '000000', 'MOBILE_NUMBER')
      expect(fetchMock).toHaveBeenCalledTimes(4)
      expect(user.uniqid).toBe('MVPCBEUVCGPZR')
      expect(user.mobileNumber).toBe('+639090000001')
    })
  })
})
