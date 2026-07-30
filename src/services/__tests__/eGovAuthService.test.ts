import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  authenticateWithEGovAccessToken,
  mapEGovProfileToUser,
} from '../eGovAuthService'

const apiProfile = {
  uniqid: 'MVPCBEUVCGPZR',
  email: 'josie@yopmail.com',
  birth_date: '1990-01-01',
  first_name: 'JOSIE',
  middle_name: 'SANTOS',
  last_name: 'DELA CRUZ',
  mobile: '+639090000000',
  photo: 'https://example.test/josie.png',
  street: '1123 RIZAL ST.',
  barangay: 'POBLACION',
  municipality: 'CITY OF ALAMINOS',
  province: 'PANGASINAN',
  region: 'REGION I (ILOCOS REGION)',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('eGovPH access-token prototype authentication', () => {
  it('maps the API profile into the local user session shape', () => {
    const user = mapEGovProfileToUser(apiProfile)

    expect(user.id).toBe('MVPCBEUVCGPZR')
    expect(user.email).toBe('josie@yopmail.com')
    expect(user.address.city).toBe('CITY OF ALAMINOS')
    expect(user.mobileNumber).toBe('+639090000000')
    expect(user.profilePhotoUrl).toBe('https://example.test/josie.png')
  })

  it('uses the password as a bearer token and accepts the matching API email', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 200, message: 'OK', data: apiProfile }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = await authenticateWithEGovAccessToken(
      ' JOSIE@yopmail.com ',
      ' eyJheader.eyJpayload.signature '
    )

    expect(user.uniqid).toBe('MVPCBEUVCGPZR')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe('/egov-api/api/partner/sso_authentication')
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: 'Bearer eyJheader.eyJpayload.signature',
    })
    expect(user).not.toHaveProperty('accessToken')
  })

  it('converts a generated exchange code before requesting the citizen profile', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { access_token: 'sso-access-token' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 200, message: 'OK', data: apiProfile }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const user = await authenticateWithEGovAccessToken('josie@yopmail.com', 'generated-exchange-code')

    expect(user.email).toBe('josie@yopmail.com')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('/egov-api/api/token')
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toMatchObject({
      exchange_code: 'generated-exchange-code',
      scope: 'SSO_AUTHENTICATION',
    })
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({
      Authorization: 'Bearer sso-access-token',
    })
  })

  it('rejects an email that does not belong to the token profile', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 200, message: 'OK', data: apiProfile }),
    }))

    await expect(
      authenticateWithEGovAccessToken('someone-else@example.com', 'test-access-token')
    ).rejects.toThrow('does not match')
  })
})
