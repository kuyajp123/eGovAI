export interface EGovUser {
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

export interface User extends EGovUser {
  id: string
  registeredAt: string
  lastLogin: string
  profileLocked: boolean
  ssoProvider: 'egovph'
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
  error: string | null
}
