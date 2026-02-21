import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { HardHat, Mail, Lock, AlertCircle, ShieldCheck, Languages } from 'lucide-react';

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  async function checkEmailInPeopleList(emailToCheck: string): Promise<boolean> {
    const { data } = await supabase
      .from('people')
      .select('id')
      .eq('email', emailToCheck.toLowerCase().trim())
      .maybeSingle();
    return !!data;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const isInPeopleList = await checkEmailInPeopleList(email);
      if (!isInPeopleList) {
        setError('Your email must be in the people list to register. Please contact an administrator.');
        setLoading(false);
        return;
      }
    }

    const { error: authError } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <button
        onClick={() => setLanguage(language === 'en' ? 'et' : 'en')}
        className="absolute top-4 right-4 z-10 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg text-sm font-medium text-gray-700 hover:text-gray-900 transition-all"
        title={language === 'en' ? 'Switch to Estonian' : 'Vaheta inglise keelele'}
      >
        <Languages className="w-4 h-4" />
        <span className="font-semibold">{language.toUpperCase()}</span>
      </button>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-2 bg-amber-400" />
        <div className="absolute top-2 left-0 right-0 h-1 bg-gray-900" />
      </div>

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
        <div className="bg-gray-900 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-400 rounded-full mb-4 shadow-lg">
            <HardHat className="w-9 h-9 text-gray-900" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Tool Inventory</h1>
          <p className="text-gray-400 text-sm">
            {isSignUp ? 'Create an account to get started' : 'Sign in to manage your inventory'}
          </p>
        </div>

        {isSignUp && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800">Only people in the people list can register. Contact an admin if needed.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.email')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-stone-50"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-stone-50"
                placeholder="••••••••"
                required
              />
            </div>
            {isSignUp && (
              <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? t('auth.loading') : (isSignUp ? t('auth.signUpButton') : t('auth.signInButton'))}
          </button>
        </form>

        <div className="pb-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}
          </button>
        </div>
      </div>
    </div>
  );
}
