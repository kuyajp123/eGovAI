import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User } from '../types/user';

const SSOCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    handleSSOCallback();
  }, []);

  const handleSSOCallback = async () => {
    try {
      const exchangeCode = searchParams.get('exchange_code');

      if (!exchangeCode) {
        setStatus('error');
        setErrorMessage('Missing exchange_code parameter');
        return;
      }

      // ── Step 1: Exchange code → access_token ──────────────────────────────
      const tokenRes = await fetch('/egov-api/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange_code: exchangeCode,
          scope: 'SSO_AUTHENTICATION',
          partner_code: import.meta.env.VITE_EGOV_PARTNER_CODE,
          partner_secret: import.meta.env.VITE_EGOV_PARTNER_SECRET,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}));
        throw new Error(err.message || err.error_description || `Token exchange failed (${tokenRes.status})`);
      }

      const tokenData = await tokenRes.json();
      console.log('SSO token response:', tokenData);

      const accessToken = tokenData.access_token;
      if (!accessToken) {
        throw new Error('No access_token returned from eGovPH');
      }

      // ── Step 2: Use access_token → fetch user profile ─────────────────────
      const profileRes = await fetch('/egov-api/api/partner/sso_authentication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          partner_code: import.meta.env.VITE_EGOV_PARTNER_CODE,
          partner_secret: import.meta.env.VITE_EGOV_PARTNER_SECRET,
        }),
      });

      if (!profileRes.ok) {
        const err = await profileRes.json().catch(() => ({}));
        throw new Error(err.message || err.error_description || `Profile fetch failed (${profileRes.status})`);
      }

      const profile = await profileRes.json();
      console.log('SSO profile response:', profile);

      // eGovPH may nest user data under a key — unwrap if needed
      const d = profile.data || profile.user || profile;

      // ── Step 3: Build & store the user object ─────────────────────────────
      const user: User = {
        id: d.uniqid || d.user_id || d.id || exchangeCode,
        uniqid: d.uniqid || d.user_id || d.id || '',
        firstName: d.first_name || d.firstName || '',
        middleName: d.middle_name || d.middleName,
        lastName: d.last_name || d.lastName || '',
        suffix: d.suffix,
        birthdate: d.birthdate || d.birth_date || '',
        email: d.email || '',
        mobileNumber: d.mobile_number || d.mobileNumber || d.phone || d.mobile || '+639531771034',
        address: {
          street: d.address?.street || d.street,
          barangay: d.address?.barangay || d.barangay,
          city: d.address?.city || d.city || '',
          province: d.address?.province || d.province || '',
          region: d.address?.region || d.region || '',
          zipCode: d.address?.zip_code || d.address?.zipCode || d.zip_code,
        },
        registeredAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        profileLocked: true,
        ssoProvider: 'egovph',
      };

      login(user);
      navigate('/home', { replace: true });
    } catch (error) {
      console.error('SSO callback error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-margin-mobile bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'processing' && (
          <>
            <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-5xl text-on-primary-container animate-spin">
                progress_activity
              </span>
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-3">Authenticating...</h2>
            <p className="text-on-surface-variant">Please wait while we securely verify your eGovPH credentials.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-error-container rounded-full flex items-center justify-center mx-auto mb-6">
              <span
                className="material-symbols-outlined text-5xl text-on-error-container"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                error
              </span>
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-3">Authentication Failed</h2>
            <p className="text-on-surface-variant mb-6">{errorMessage}</p>
            <button
              onClick={() => navigate('/', { replace: true })}
              className="bg-primary text-white h-12 px-8 rounded-full font-bold active:scale-95 transition-all"
            >
              Return to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SSOCallbackPage;
