"use client"
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { getSafeCallbackUrl, withCallbackUrl } from '@/lib/utils';

function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [signupEmail, setSignupEmail] = useState(''); // To store email after initial signup
  const [otpError, setOtpError] = useState('');
  const [loadingOtp, setOtpLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get('callbackUrl'));
  const loginHref = withCallbackUrl("/login", callbackUrl);

  useEffect(() => {
    let timer;
    if (showOtpInput && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (showOtpInput && resendTimer === 0) {
      setCanResendOtp(true);
    }
    return () => clearInterval(timer);
  }, [showOtpInput, resendTimer]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, birthDate, password }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong!');
      }

      setSuccessMessage(data.message || 'OTP sent to your email. Please verify.');
      setSignupEmail(email);
      setShowOtpInput(true);
      setResendTimer(30); // Start 30-second timer
      setCanResendOtp(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError('');

    try {
      const response = await fetch('/api/auth/verify-otp-and-signup', {
        method: 'POST',
        body: JSON.stringify({ email: signupEmail, otp }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed!');
      }

      const result = await signIn('credentials', {
        redirect: false,
        email: signupEmail,
        password,
      });

      if (result?.error) {
        router.push(withCallbackUrl('/login?success=Account verified and created successfully', callbackUrl));
      } else {
        router.replace(callbackUrl);
      }
    } catch (error) {
      setOtpError(error.message);
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleResendOtp() {
    setLoading(true); // Use general loading for resend action
    setOtpError('');
    setSuccessMessage('');
    setCanResendOtp(false);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email: signupEmail, birthDate, password }), // Use stored signup details
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend OTP!');
      }

      setSuccessMessage(data.message || 'New OTP sent to your email.');
      setResendTimer(30); // Reset 30-second timer
    } catch (error) {
      setOtpError(error.message); // Use otpError for resend errors
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {showOtpInput ? 'Verify Your Account' : 'Create your account'}
          </h2>
        </div>

        {!showOtpInput ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="name" className="sr-only">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="birth-date" className="sr-only">
                  Birth Date
                </label>
                <input
                  id="birth-date"
                  name="birthDate"
                  type="date"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            {successMessage && (
              <div className="text-green-500 text-sm text-center">{successMessage}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {loading ? 'Creating account...' : 'Sign up'}
              </button>
            </div>

            <div className="text-sm text-center">
              <Link href={loginHref} className="font-medium text-indigo-600 hover:text-indigo-500">
                Already have an account? Sign in
              </Link>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleOtpSubmit}>
            <p className="text-center text-sm text-gray-600">An OTP has been sent to {signupEmail}. Please enter it below to verify your account.</p>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="otp" className="sr-only">
                  OTP
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
            </div>

            {otpError && (
              <div className="text-red-500 text-sm text-center">{otpError}</div>
            )}
            {successMessage && !showOtpInput && (
              <div className="text-green-500 text-sm text-center">{successMessage}</div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={loadingOtp}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {loadingOtp ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>

            <div className="text-center text-sm">
              {resendTimer > 0 ? (
                <p className="text-gray-500">Resend OTP in {resendTimer}s</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResendOtp || loading}
                  className="font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Resend OTP'}
                </button>
              )}
            </div>

            <div className="text-sm text-center">
              <Link href={loginHref} className="font-medium text-indigo-600 hover:text-indigo-500">
                Already have an account? Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}