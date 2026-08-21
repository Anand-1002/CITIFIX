import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle, Key } from 'lucide-react';
import { twoFactorApi } from '@/lib/api.js';
import { Button } from '@/components/ui/button';

// Google Authenticator official SVG icon
const GoogleAuthIcon = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="#4285F4"/>
    <path d="M12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C16.42 20 20 16.42 20 12C20 7.58 16.42 4 12 4Z" fill="#34A853"/>
    <path d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6Z" fill="#FBBC05"/>
    <path d="M12 7.5C9.51 7.5 7.5 9.51 7.5 12C7.5 14.49 9.51 16.5 12 16.5C14.49 16.5 16.5 14.49 16.5 12C16.5 9.51 14.49 7.5 12 7.5Z" fill="#EA4335"/>
    <circle cx="12" cy="12" r="3" fill="white"/>
    <path d="M12 10.5V13.5M10.5 12H13.5" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const TwoFactorVerify = ({ tempToken, user, onVerified, onBack }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleInput = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (verifyCode) => {
    const codeToVerify = verifyCode || code.join('');
    if (codeToVerify.length !== 6 && !useBackup) return;

    setLoading(true);
    setError('');
    try {
      const tokenToSend = useBackup ? backupCode : codeToVerify;
      const data = await twoFactorApi.verifyLogin(tempToken, tokenToSend);
      onVerified(data);
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const [showQr, setShowQr] = useState(false);
  const manualKey = "JBSWY3DPEHPK3PXP";
  const otpauthUrl = `otpauth://totp/CitiFix?secret=${manualKey}&issuer=CitiFix`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl border border-white/20"
        >
          <GoogleAuthIcon className="w-10 h-10" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white">Google Authenticator</h2>
        <p className="text-white/60 mt-1 text-xs">
          Scan QR or enter 6-digit code from Google Authenticator
        </p>
      </div>

      {!useBackup ? (
        <>
          {/* QR Code Section (Always available) */}
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white rounded-2xl p-2 shadow-xl border-2 border-blue-400/50">
              <img
                src={qrUrl}
                alt="Google Authenticator QR Code"
                className="w-36 h-36 rounded-lg object-contain"
              />
            </div>
            <p className="text-[11px] text-white/50">
              Scan with Google Authenticator or use key: <span className="text-emerald-400 font-mono font-bold">{manualKey}</span>
            </p>
          </div>

          {/* TOTP Code Input */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <motion.input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInput(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-11 h-13 text-center text-xl font-bold font-mono rounded-xl border-2 outline-none transition-all duration-200 bg-white/10 text-white ${
                  digit
                    ? 'border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/20 text-blue-200'
                    : 'border-white/20 focus:border-blue-400/80 focus:bg-white/15'
                }`}
                id={`google-auth-input-${index}`}
              />
            ))}
          </div>

          {/* Quick Demo Hint */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                const demoDigits = ['1', '2', '3', '4', '5', '6'];
                setCode(demoDigits);
                handleVerify('123456');
              }}
              className="text-[11px] text-blue-300 hover:text-white bg-blue-500/20 hover:bg-blue-500/30 px-3 py-1 rounded-full border border-blue-400/30 transition-all font-medium inline-flex items-center gap-1"
            >
              <span>⚡ Quick Demo Code: <strong>123456</strong> (Click to auto-fill)</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <p className="text-rose-400 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Verify Button */}
          <Button
            onClick={() => handleVerify()}
            disabled={loading || code.join('').length !== 6}
            className="w-full py-5 bg-gradient-to-r from-blue-600 via-emerald-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-semibold rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Verifying Code...
              </span>
            ) : (
              'Verify Google Authenticator Code'
            )}
          </Button>

          {/* QR Code toggle or Backup code link */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => setUseBackup(true)}
              className="w-full text-center text-white/50 text-xs hover:text-white/80 transition-colors flex items-center justify-center gap-2"
            >
              <Key className="w-3.5 h-3.5" />
              Lost phone? Use an emergency backup code
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Backup Code Input */}
          <div>
            <p className="text-white/60 text-xs text-center mb-3">
              Enter one of your 8 emergency backup recovery codes
            </p>
            <input
              type="text"
              placeholder="e.g. A1B2C3D4"
              value={backupCode}
              onChange={(e) => {
                setBackupCode(e.target.value.toUpperCase());
                setError('');
              }}
              className="w-full px-4 py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white text-center font-mono text-lg uppercase tracking-widest placeholder:text-white/30 focus:border-emerald-400 outline-none transition-all"
              autoFocus
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <p className="text-rose-400 text-sm">{error}</p>
            </motion.div>
          )}

          <Button
            onClick={() => handleVerify()}
            disabled={loading || !backupCode.trim()}
            className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold rounded-xl disabled:opacity-50 transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Verifying Backup Code...
              </span>
            ) : (
              'Verify Backup Code'
            )}
          </Button>

          <button
            onClick={() => {
              setUseBackup(false);
              setBackupCode('');
              setError('');
            }}
            className="w-full text-center text-white/50 text-xs hover:text-white/80 transition-colors"
          >
            ← Back to Google Authenticator code
          </button>
        </>
      )}

      {/* Back button */}
      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-2 text-white/40 text-xs hover:text-white/70 transition-colors pt-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to mobile number login
      </button>
    </motion.div>
  );
};

export default TwoFactorVerify;
