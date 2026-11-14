import React, { useState } from 'react';
import { User, Lock, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { SystemUser, Clinic } from '../types';
import { auth } from '../firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import csmLogo from '../assets/images/csm_logo_official_1782404025347.jpg';

interface LoginProps {
  systemUsers: SystemUser[];
  onLoginSuccess: (user: SystemUser) => void;
  onRegisterUser: (user: Omit<SystemUser, 'id' | 'createdAt'>) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  clinics: Clinic[];
  externalError?: string;
}

function mapFirebaseAuthError(code?: string, fallback?: string): string {
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'O login por E-mail/Senha ainda não está ativado no Firebase Console (Authentication > Sign-in method > E-mail/senha). Ative esse provedor no console ou entre com sua conta Google abaixo.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'A janela de login do Google foi fechada antes da conclusão. Tente novamente.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou o pop-up de login. Permita pop-ups para este site e tente novamente.';
    case 'auth/unauthorized-domain':
      return 'Este domínio ainda não está autorizado em Firebase Console > Authentication > Settings > Authorized domains.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos. Verifique suas credenciais ou use "Esqueceu a senha?".';
    case 'auth/invalid-email':
      return 'Formato de e-mail inválido.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada no Firebase Authentication.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns minutos ou redefina sua senha.';
    case 'auth/network-request-failed':
      return 'Falha de conexão com o Firebase. Verifique sua internet e tente novamente.';
    default:
      return fallback || 'Não foi possível autenticar. Tente novamente.';
  }
}

export function Login({ darkMode, setDarkMode, externalError }: LoginProps) {
  // Login form states
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // General feedback states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Recovery form states
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsGoogleSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      setSuccessMsg('Autenticação Google realizada! Carregando painel...');
    } catch (authError: any) {
      console.error('Google auth error:', authError);
      setErrorMsg(mapFirebaseAuthError(authError?.code, authError?.message));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryMessage('');

    const cleanEmail = recoveryEmail.toLowerCase().trim();
    if (!cleanEmail) {
      setRecoveryError('Por favor, digite seu e-mail.');
      return;
    }

    setIsSendingRecovery(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setRecoveryMessage(
        `Se o endereço ${cleanEmail} estiver cadastrado, enviamos as instruções de redefinição de senha para a sua caixa de entrada (verifique também o spam).`
      );
    } catch (authErr: any) {
      setRecoveryError(mapFirebaseAuthError(authErr?.code, authErr?.message));
    } finally {
      setIsSendingRecovery(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const cleanEmail = emailInput.toLowerCase().trim();
      if (!cleanEmail || !password) {
        setErrorMsg('Por favor, digite seu e-mail e senha.');
        setIsSubmitting(false);
        return;
      }

      await signInWithEmailAndPassword(auth, cleanEmail, password);
      setSuccessMsg('Login realizado com sucesso! Carregando painel...');
    } catch (authError: any) {
      console.error('Auth error:', authError);
      setErrorMsg(mapFirebaseAuthError(authError?.code, authError?.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedError = errorMsg || externalError || '';

  return (
    <div
      id="login-container"
      className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300 ${
        darkMode ? 'bg-[#121614] text-white' : 'bg-[#FAF9F5] text-slate-800'
      }`}
    >
      {/* Dark mode switcher */}
      <div className="absolute top-4 right-4">
        <button
          id="theme-toggle-btn"
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2.5 rounded-2xl border transition-all cursor-pointer text-xs font-bold ${
            darkMode
              ? 'bg-[#242D28] border-[#2E3832] text-[#9BB0A5] hover:bg-[#2E3832]'
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'
          }`}
          title="Alternar Tema"
        >
          {darkMode ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
        </button>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* App Logo/Header */}
        <div id="login-brand" className="text-center space-y-3 select-none flex flex-col items-center animate-fade-in">
          <img
            src={csmLogo}
            alt="CSM Clinical Logo"
            referrerPolicy="no-referrer"
            className="w-48 h-48 object-contain rounded-3xl bg-white p-3 border border-slate-200/80 dark:border-[#2E3832]/80 shadow-md transition-transform hover:scale-105 duration-300"
          />
        </div>

        {/* Outer Form Frame */}
        <div
          id="login-form-box"
          className={`p-8 rounded-3xl border transition-all duration-300 ${
            darkMode
              ? 'bg-[#1B221E] border-[#2E3832] shadow-xl shadow-[#000000]/40'
              : 'bg-white border-slate-150 shadow-2xl shadow-slate-200/50'
          }`}
        >
          {showRecovery ? (
            /* --- RECOVERY FORM --- */
            <div className="space-y-4 font-sans">
              <div className="space-y-1 mb-5 text-center">
                <h2 className="text-base font-black text-slate-800 dark:text-white">
                  Recuperar sua Senha
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Informe o seu e-mail cadastrado no Firebase Authentication para receber o link de redefinição.
                </p>
              </div>

              {recoveryError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-500/10 border border-rose-500/15 rounded-xl text-[11px] font-semibold text-rose-500 text-center leading-tight"
                >
                  ⚠️ {recoveryError}
                </div>
              )}
              {recoveryMessage && (
                <div
                  role="alert"
                  className="p-4 bg-emerald-500/13 border border-emerald-500/20 rounded-xl text-teal-700 dark:text-emerald-400 text-center leading-relaxed"
                >
                  <p className="font-bold text-xs uppercase tracking-wider">✅ Solicitação Enviada</p>
                  <p className="mt-2 text-xs font-semibold">{recoveryMessage}</p>
                </div>
              )}

              <form onSubmit={handleRecoverPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="recovery-email"
                    className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block"
                  >
                    E-mail Cadastrado
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                    <input
                      id="recovery-email"
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="seu.email@consultorio.com"
                      className={`w-full text-xs font-semibold rounded-xl px-10 py-2.5 outline-none border transition-all ${
                        darkMode
                          ? 'bg-[#242D28] border-[#2E3832] text-white focus:border-[#9BB0A5]'
                          : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecovery(false);
                      setRecoveryEmail('');
                      setRecoveryMessage('');
                      setRecoveryError('');
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer text-center ${
                      darkMode
                        ? 'bg-[#242D28] border-[#2E3832] text-slate-300 hover:bg-[#2E3832]'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingRecovery}
                    className="flex-1 py-2.5 bg-[#FA8F3B] hover:bg-[#E07925] disabled:opacity-70 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSendingRecovery ? 'Enviando...' : 'Recuperar'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <div className="space-y-1 mb-5 text-center">
                <h2 className="text-base font-black text-slate-800 dark:text-white">
                  Acesse o Sistema
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Entre com sua conta Google autorizada ou com e-mail e senha
                </p>
              </div>

              {displayedError && (
                <div
                  role="alert"
                  className="mb-4 p-3 bg-rose-500/10 border border-rose-500/15 rounded-xl text-[11px] font-semibold text-rose-500 text-center leading-relaxed"
                >
                  ⚠️ {displayedError}
                </div>
              )}
              {successMsg && (
                <div
                  role="alert"
                  className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/15 rounded-xl text-[11px] font-semibold text-emerald-500 text-center leading-tight"
                >
                  ✅ {successMsg}
                </div>
              )}

              {/* Google Sign-In Button */}
              <button
                id="btn-google-login"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleSubmitting || isSubmitting}
                className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer mb-4 ${
                  darkMode
                    ? 'bg-[#242D28] border-[#2E3832] text-white hover:bg-[#2E3832]'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                } ${isGoogleSubmitting ? 'opacity-75 cursor-wait' : ''}`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                {isGoogleSubmitting ? 'Conectando ao Google...' : 'Entrar com Google'}
              </button>

              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-slate-200 dark:border-[#2E3832] w-full"></div>
                <span
                  className={`px-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                    darkMode ? 'bg-[#1B221E] text-slate-400' : 'bg-white text-slate-400'
                  }`}
                >
                  ou e-mail e senha
                </span>
                <div className="border-t border-slate-200 dark:border-[#2E3832] w-full"></div>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-username"
                    className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 tracking-wider block"
                  >
                    E-mail Profissional
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400 dark:text-slate-300" />
                    <input
                      id="login-username"
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="seu.email@clinica.com.br"
                      className={`w-full text-xs font-semibold rounded-xl px-10 py-2.5 outline-none border transition-all ${
                        darkMode
                          ? 'bg-[#242D28] border-[#2E3832] text-white focus:border-[#9BB0A5]'
                          : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="login-password"
                    className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 tracking-wider block"
                  >
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400 dark:text-slate-300" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha de acesso"
                      className={`w-full text-xs font-semibold rounded-xl px-10 py-2.5 outline-none border transition-all ${
                        darkMode
                          ? 'bg-[#242D28] border-[#2E3832] text-white focus:border-[#9BB0A5]'
                          : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-slate-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-white cursor-pointer"
                      title={showPassword ? 'Ocultar Senha' : 'Exibir Senha'}
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecovery(true);
                      setRecoveryEmail(emailInput);
                      setRecoveryError('');
                      setRecoveryMessage('');
                    }}
                    className="text-[10px] font-extrabold text-[#FA8F3B] dark:text-[#FFA05A] hover:underline cursor-pointer"
                  >
                    Recuperar senha / Esqueceu a senha?
                  </button>
                </div>

                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={isSubmitting || isGoogleSubmitting}
                  className={`w-full py-2.5 bg-[#FA8F3B] hover:bg-[#E07925] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSubmitting ? 'opacity-80 cursor-wait' : ''
                  }`}
                >
                  {isSubmitting ? 'Verificando credenciais...' : 'Acessar Consultório'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>

        {/* Security watermark footer */}
        <div className="text-center">
          <p className="text-[10px] text-slate-500 font-semibold flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Autenticação Firebase com isolamento multi-clínica ativo
          </p>
        </div>
      </div>
    </div>
  );
}
