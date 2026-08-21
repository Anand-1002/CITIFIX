import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle, Key, Copy, Download, CheckCircle, ExternalLink, ShieldCheck, Smartphone } from 'lucide-react';
import { twoFactorApi } from '@/lib/api.js';
import { Button } from '@/components/ui/button';

// Google Authenticator official multi-color SVG icon
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

const TwoFactorLoginSetup = ({ setupData = {}, onVerified, onBack }) => {
  const { tempToken, qrCode, manualKey, backupCodes = [] } = setupData;

  const effectiveKey = manualKey || "JBSWY3DPEHPK3PXP";
  const effectiveQr = qrCode || `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`otpauth://totp/CitiFix?secret=${effectiveKey}&issuer=CitiFix`)}`;

  const [step, setStep] = useState('scan'); // 'scan' | 'backup'
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [authResponseData, setAuthResponseData] = useState(null);

  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleCopyKey = () => {
    if (!manualKey) return;
    navigator.clipboard.writeText(manualKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

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
    if (codeToVerify.length !== 6) {
      setError('Please enter the 6-digit code from Google Authenticator');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await twoFactorApi.verifySetupLogin(tempToken, codeToVerify);
      setAuthResponseData(result);
      // Show backup codes confirmation step before entering dashboard
      if (backupCodes && backupCodes.length > 0) {
        setStep('backup');
      } else {
        onVerified(result);
      }
    } catch (err) {
      setError(err.message || 'Invalid code from Google Authenticator. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const blob = new Blob([`CitiFix 2FA Emergency Backup Codes\n${'='.repeat(36)}\n\n${backupCodes.join('\n')}\n\nKeep these codes safe. Each can only be used once.`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'citifix-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    if (authResponseData) {
      onVerified(authResponseData);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg border border-white/20"
        >
          <GoogleAuthIcon className="w-10 h-10" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white">
          {step === 'scan' ? 'Activate 2FA Security' : 'Save Backup Codes'}
        </h2>
        <p className="text-white/70 text-xs mt-1">
          {step === 'scan'
            ? 'Scan the QR code with Google Authenticator on your phone'
            : 'Store these 8 emergency single-use backup recovery codes'}
        </p>
      </div>

      {step === 'scan' ? (
        <>
          {/* QR Code Container */}
          <div className="flex flex-col items-center">
            <div className="bg-white rounded-2xl p-2.5 shadow-xl border-2 border-blue-400/40">
              <img src={effectiveQr} alt="Google Authenticator 2FA QR Code" className="w-40 h-40 rounded-lg object-contain" />
            </div>
          </div>

          {/* Manual Secret Key */}
          <div className="bg-white/10 rounded-xl p-3 border border-white/15">
            <div className="flex items-center justify-between text-xs text-white/60 mb-1">
              <span>Can't scan? Enter key manually:</span>
              <button
                type="button"
                onClick={handleCopyKey}
                className="text-blue-300 hover:text-white flex items-center gap-1 font-medium"
              >
                <Copy className="w-3 h-3" />
                {copiedKey ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <code className="block text-emerald-400 text-xs font-mono select-all break-all bg-black/40 px-2 py-1.5 rounded border border-white/10 text-center tracking-wider">
              {effectiveKey}
            </code>
          </div>

          {/* 6-digit TOTP Input */}
          <div>
            <label className="block text-white text-xs font-semibold text-center mb-2">
              Enter 6-digit code from Google Authenticator
            </label>
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInput(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-11 h-13 text-center text-xl font-bold font-mono rounded-xl border-2 outline-none transition-all bg-white/15 text-white ${
                    digit
                      ? 'border-blue-400 bg-blue-500/20 shadow-md shadow-blue-500/20 text-blue-200'
                      : 'border-white/20 focus:border-blue-400 focus:bg-white/20'
                  }`}
                  id={`setup-totp-input-${index}`}
                />
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <p className="text-rose-300 text-xs">{error}</p>
            </motion.div>
          )}

          {/* Verify & Activate Button */}
          <Button
            onClick={() => handleVerify()}
            disabled={loading || code.join('').length !== 6}
            className="w-full py-5 bg-gradient-to-r from-blue-600 via-emerald-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-semibold rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Activating 2FA...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Verify & Activate 2FA
              </span>
            )}
          </Button>

          {/* Quick links to download app */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-white/50 pt-1">
            <span>Get Google Authenticator:</span>
            <a
              href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-0.5"
            >
              Android <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href="https://apps.apple.com/app/google-authenticator/id388497605"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline flex items-center gap-0.5"
            >
              iOS <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </>
      ) : (
        /* Backup Codes Step */
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 p-3.5 bg-amber-500/15 border border-amber-500/25 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-amber-200 text-xs leading-relaxed">
              <strong>Save your emergency backup recovery codes.</strong> If you switch devices or lose access to Google Authenticator, you can use any of these single-use codes to log in.
            </p>
          </div>

          <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((c, i) => (
                <div
                  key={i}
                  className="px-2.5 py-2 bg-black/50 rounded-lg text-center font-mono text-xs text-emerald-400 border border-white/10 font-bold tracking-wider"
                >
                  {c}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleCopyBackupCodes}
              variant="outline"
              className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {copiedBackup ? <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              {copiedBackup ? 'Copied!' : 'Copy Codes'}
            </Button>
            <Button
              type="button"
              onClick={handleDownloadBackupCodes}
              variant="outline"
              className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download
            </Button>
          </div>

          <Button
            onClick={handleComplete}
            className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Continue to Dashboard
          </Button>
        </div>
      )}

      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="w-full flex items-center justify-center gap-1.5 text-white/50 text-xs hover:text-white transition-colors pt-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to mobile number
      </button>
    </motion.div>
  );
};

export default TwoFactorLoginSetup;
