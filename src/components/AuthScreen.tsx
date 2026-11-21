import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { AlertCircle, ArrowRight, Lock, Mail, User as UserIcon, X } from 'lucide-react';
import { auth } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const mapAuthError = (err: unknown): string => {
    const code = (err as { code?: string })?.code || '';
    switch (code) {
      case 'auth/operation-not-allowed':
        return "La connexion par e-mail/mot de passe doit être activée dans la console Firebase (Authentication > Sign-in method > E-mail/Mot de passe). Vous pouvez aussi utiliser Google ci-dessous.";
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Adresse e-mail ou mot de passe incorrect.';
      case 'auth/email-already-in-use':
        return 'Un compte existe déjà avec cette adresse e-mail.';
      case 'auth/weak-password':
        return 'Le mot de passe doit contenir au moins 6 caractères.';
      case 'auth/invalid-email':
        return 'Veuillez saisir une adresse e-mail valide.';
      case 'auth/popup-closed-by-user':
        return 'La fenêtre de connexion Google a été fermée avant la validation.';
      default:
        return err instanceof Error ? err.message : 'Erreur d’authentification.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim().slice(0, 80) });
        }
      }
      onClose();
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white border border-[#DDEBD8] rounded-xl max-w-md w-full overflow-hidden">
        <div className="bg-[#075B2E] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 id="auth-modal-title" className="text-base font-bold">
              Sauvegarde & Synchronisation Cloud
            </h2>
            <p className="text-xs text-[#DDEBD8] mt-0.5">
              Optionnel — synchronisez vos données BUDGESTY sur Firestore
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#DDEBD8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-5 flex items-center gap-1 p-1 bg-[#DDEBD8]/50 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-[#075B2E] text-white'
                  : 'text-[#075B2E] hover:bg-[#DDEBD8]/60'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-[#075B2E] text-white'
                  : 'text-[#075B2E] hover:bg-[#DDEBD8]/60'
              }`}
            >
              Créer un compte
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  Nom complet
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#075B2E]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex. Ange Koffi"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#075B2E]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemple@domaine.com"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111111] mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#075B2E]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#DDEBD8] rounded-lg focus:outline-none focus:border-[#006B35]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#006B35] hover:bg-[#075B2E] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <span>
                {loading
                  ? 'Traitement en cours...'
                  : mode === 'login'
                    ? 'Se connecter'
                    : 'Créer mon compte'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#DDEBD8]" />
            <span className="text-xs text-[#111111]/55">ou</span>
            <div className="h-px flex-1 bg-[#DDEBD8]" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg border border-[#075B2E]/30 bg-white hover:bg-[#DDEBD8]/35 text-[#075B2E] text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer"
          >
            Continuer avec Google
          </button>

          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full py-2 text-xs font-medium text-[#111111]/65 hover:text-[#111111] cursor-pointer"
          >
            Continuer sans me connecter
          </button>
        </div>
      </div>
    </div>
  );
};
