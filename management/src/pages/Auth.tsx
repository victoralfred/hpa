import { Component, createSignal, createEffect, Show, For } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';
import { LoginForm, RegisterForm, SocialProvider } from '../types';
import FormField from '../components/ui/FormField';
import PasswordInput from '../components/ui/PasswordInput';
import Checkbox from '../components/ui/Checkbox';
import Button from '../components/ui/Button';
import { validateForm, authValidationSchemas, debounce, hasFormErrors } from '../utils/validation';

const Auth: Component = () => {
  const auth = useAuth();

  // Page state
  const [mode, setMode] = createSignal<'login' | 'register'>('login');
  const [showResetPassword, setShowResetPassword] = createSignal(false);

  // Form data signals
  const [loginData, setLoginData] = createSignal<LoginForm>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [registerData, setRegisterData] = createSignal<RegisterForm>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    termsAccepted: false,
  });

  const [resetEmail, setResetEmail] = createSignal('');

  // Validation state
  const [loginErrors, setLoginErrors] = createSignal<Record<string, string | null>>({});
  const [registerErrors, setRegisterErrors] = createSignal<Record<string, string | null>>({});
  const [resetError, setResetError] = createSignal<string | null>(null);

  // Loading states
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Success states
  const [resetSent, setResetSent] = createSignal(false);

  // Social login providers (placeholder)
  const socialProviders: SocialProvider[] = [
    {
      id: 'google',
      name: 'Google',
      icon: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z',
      color: '#4285F4',
      enabled: false, // Placeholder - not implemented
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z',
      color: '#333',
      enabled: false, // Placeholder - not implemented
    },
    {
      id: 'microsoft',
      name: 'Microsoft',
      icon: 'M12 12H2V2h10v10zM22 2v10H12V2h10zM2 22h10V12H2v10zM12 12h10v10H12V12z',
      color: '#00A4EF',
      enabled: false, // Placeholder - not implemented
    },
  ];

  // Debounced validation functions
  const debouncedLoginValidation = debounce(() => {
    const errors = validateForm(loginData(), authValidationSchemas.login);
    setLoginErrors(errors);
  }, 300);

  const debouncedRegisterValidation = debounce(() => {
    const errors = validateForm(registerData(), authValidationSchemas.register);
    setRegisterErrors(errors);
  }, 300);

  // Form handlers
  const handleLoginInput = (field: keyof LoginForm, value: any) => {
    setLoginData(prev => ({ ...prev, [field]: value }));
    debouncedLoginValidation();
  };

  const handleRegisterInput = (field: keyof RegisterForm, value: any) => {
    setRegisterData(prev => ({ ...prev, [field]: value }));
    debouncedRegisterValidation();
  };

  const handleLoginSubmit = async (e: Event) => {
    e.preventDefault();
    
    const errors = validateForm(loginData(), authValidationSchemas.login);
    setLoginErrors(errors);

    if (hasFormErrors(errors)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await auth.login(loginData());
      // Navigation will be handled by the auth state change
    } catch (error) {
      console.error('Login failed:', error);
      // Error is handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: Event) => {
    e.preventDefault();
    
    const errors = validateForm(registerData(), authValidationSchemas.register);
    setRegisterErrors(errors);

    if (hasFormErrors(errors)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await auth.register(registerData());
      // Navigation will be handled by the auth state change
    } catch (error) {
      console.error('Registration failed:', error);
      // Error is handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: Event) => {
    e.preventDefault();
    
    const email = resetEmail().trim();
    if (!email) {
      setResetError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setResetError('Please enter a valid email address');
      return;
    }

    setResetError(null);
    setIsSubmitting(true);

    try {
      await auth.resetPassword(email);
      setResetSent(true);
    } catch (error) {
      console.error('Reset password failed:', error);
      // Error is handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = (provider: SocialProvider) => {
    // Placeholder for social login implementation
    console.log(`Social login with ${provider.name} clicked (not implemented)`);
  };

  // Clear errors when switching modes
  createEffect(() => {
    mode(); // Track mode changes
    auth.clearError();
    setLoginErrors({});
    setRegisterErrors({});
    setResetError(null);
  });

  const SocialLoginButton: Component<{ provider: SocialProvider }> = ({ provider }) => (
    <button
      type="button"
      onClick={() => handleSocialLogin(provider)}
      disabled={!provider.enabled}
      class={`
        flex items-center justify-center w-full px-4 py-3 border border-gray-300 rounded-lg 
        text-sm font-medium transition-all duration-200 
        ${provider.enabled 
          ? 'text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500' 
          : 'text-gray-400 bg-gray-50 cursor-not-allowed'
        }
      `}
    >
      <svg class="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
        <path d={provider.icon} />
      </svg>
      Continue with {provider.name}
      {!provider.enabled && <span class="ml-2 text-xs">(Coming Soon)</span>}
    </button>
  );

  const Divider: Component = () => (
    <div class="relative my-6">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-gray-300" />
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="px-4 bg-white text-gray-500">Or</span>
      </div>
    </div>
  );

  return (
    <div class="auth-container min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div class="auth-card max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
        {/* Header */}
        <div class="text-center">
          <div class="auth-logo mx-auto h-12 w-12 bg-primary-600 rounded-xl flex items-center justify-center mb-6">
            <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5-4a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <Show when={!showResetPassword()}>
            <div>
              <h1 class="auth-title text-3xl font-bold text-gray-900 mb-2">
                {mode() === 'login' ? 'Welcome back' : 'Create account'}
              </h1>
              <p class="auth-subtitle text-base text-gray-600">
                {mode() === 'login' 
                  ? 'Sign in to your HPA Management account'
                  : 'Get started with HPA Management platform'
                }
              </p>
            </div>
          </Show>

          <Show when={showResetPassword()}>
            <div>
              <h1 class="auth-title text-3xl font-bold text-gray-900 mb-2">Reset password</h1>
              <p class="auth-subtitle text-base text-gray-600">
                Enter your email to receive a password reset link
              </p>
            </div>
          </Show>
        </div>

        {/* Error Display */}
        <Show when={auth.error()}>
          <div class="auth-error bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-red-700">{auth.error()}</p>
              </div>
            </div>
          </div>
        </Show>

        {/* Reset Password Success */}
        <Show when={resetSent()}>
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-green-700">
                  Password reset link has been sent to your email address.
                </p>
              </div>
            </div>
          </div>
        </Show>

        {/* Forms */}
        <Show when={!showResetPassword()}>
          <div>
            {/* Social Login Buttons */}
            <div class="space-y-3 mb-6">
              <For each={socialProviders}>
                {(provider) => <SocialLoginButton provider={provider} />}
              </For>
            </div>

            <Divider />

            {/* Login Form */}
            <Show when={mode() === 'login'}>
              <form onSubmit={handleLoginSubmit} class="auth-form space-y-6">
                <FormField
                  label="Email address"
                  type="email"
                  placeholder="Enter your email"
                  value={loginData().email}
                  onInput={(e) => handleLoginInput('email', (e.target as HTMLInputElement).value)}
                  error={loginErrors().email}
                  required
                  autocomplete="email"
                  leftIcon={
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  }
                />

                <PasswordInput
                  label="Password"
                  placeholder="Enter your password"
                  value={loginData().password}
                  onInput={(e) => handleLoginInput('password', (e.target as HTMLInputElement).value)}
                  error={loginErrors().password}
                  required
                  autocomplete="current-password"
                  leftIcon={
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                />

                <div class="flex items-center justify-between">
                  <Checkbox
                    label="Remember me"
                    checked={loginData().rememberMe}
                    onChange={(e) => handleLoginInput('rememberMe', (e.target as HTMLInputElement).checked)}
                  />

                  <button
                    type="button"
                    onClick={() => setShowResetPassword(true)}
                    class="auth-link text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  class="w-full"
                  loading={isSubmitting() || auth.isLoading()}
                >
                  Sign in
                </Button>
              </form>
            </Show>

            {/* Register Form */}
            <Show when={mode() === 'register'}>
              <form onSubmit={handleRegisterSubmit} class="auth-form space-y-6">
                <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <FormField
                    label="First name"
                    type="text"
                    placeholder="Enter your first name"
                    value={registerData().firstName}
                    onInput={(e) => handleRegisterInput('firstName', (e.target as HTMLInputElement).value)}
                    error={registerErrors().firstName}
                    required
                    autocomplete="given-name"
                  />

                  <FormField
                    label="Last name"
                    type="text"
                    placeholder="Enter your last name"
                    value={registerData().lastName}
                    onInput={(e) => handleRegisterInput('lastName', (e.target as HTMLInputElement).value)}
                    error={registerErrors().lastName}
                    required
                    autocomplete="family-name"
                  />
                </div>

                <FormField
                  label="Email address"
                  type="email"
                  placeholder="Enter your email"
                  value={registerData().email}
                  onInput={(e) => handleRegisterInput('email', (e.target as HTMLInputElement).value)}
                  error={registerErrors().email}
                  required
                  autocomplete="email"
                  leftIcon={
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  }
                />

                <PasswordInput
                  label="Password"
                  placeholder="Enter your password"
                  value={registerData().password}
                  onInput={(e) => handleRegisterInput('password', (e.target as HTMLInputElement).value)}
                  error={registerErrors().password}
                  required
                  autocomplete="new-password"
                  showStrength={true}
                  leftIcon={
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                />

                <PasswordInput
                  label="Confirm password"
                  placeholder="Confirm your password"
                  value={registerData().confirmPassword}
                  onInput={(e) => handleRegisterInput('confirmPassword', (e.target as HTMLInputElement).value)}
                  error={registerErrors().confirmPassword}
                  required
                  autocomplete="new-password"
                  showToggle={false}
                  leftIcon={
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />

                <Checkbox
                  label="I accept the terms and conditions"
                  description="By creating an account, you agree to our Terms of Service and Privacy Policy."
                  checked={registerData().termsAccepted}
                  onChange={(e) => handleRegisterInput('termsAccepted', (e.target as HTMLInputElement).checked)}
                  error={registerErrors().termsAccepted}
                  variant="card"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  class="w-full"
                  loading={isSubmitting() || auth.isLoading()}
                >
                  Create account
                </Button>
              </form>
            </Show>

            {/* Mode Toggle */}
            <div class="text-center mt-6">
              <p class="text-sm text-gray-600">
                {mode() === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={() => setMode(mode() === 'login' ? 'register' : 'login')}
                  class="auth-link ml-1 font-medium text-primary-600 hover:text-primary-500"
                >
                  {mode() === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </Show>

        {/* Reset Password Form */}
        <Show when={showResetPassword()}>
          <form onSubmit={handleResetPasswordSubmit} class="auth-form space-y-6">
            <FormField
              label="Email address"
              type="email"
              placeholder="Enter your email"
              value={resetEmail()}
              onInput={(e) => setResetEmail((e.target as HTMLInputElement).value)}
              error={resetError()}
              required
              autocomplete="email"
              leftIcon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              class="w-full"
              loading={isSubmitting() || auth.isLoading()}
            >
              Send reset link
            </Button>

            <div class="text-center">
              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  setResetSent(false);
                  setResetError(null);
                }}
                class="auth-link text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                ← Back to sign in
              </button>
            </div>
          </form>
        </Show>
      </div>
    </div>
  );
};

export default Auth;