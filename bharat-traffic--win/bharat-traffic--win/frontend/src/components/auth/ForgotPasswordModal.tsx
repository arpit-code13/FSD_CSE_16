import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    // Simulate sending password reset email
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsSubmitting(false);
    setSuccessMsg(`Mock password reset instructions sent to ${email}`);
  };

  const handleClose = () => {
    setEmail('');
    setSuccessMsg('');
    setErrorMsg('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reset Your Password"
      size="md"
      footer={
        successMsg ? (
          <Button variant="primary" size="sm" onClick={handleClose}>
            Done
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              Send Reset Link
            </Button>
          </div>
        )
      }
    >
      {successMsg ? (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-100">Reset Email Dispatched</h4>
          <p className="text-xs text-slate-300">{successMsg}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-400">
            Enter your registered email address below. We will send you mock instructions to reset your account password.
          </p>

          {errorMsg && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5 font-mono">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              Registered Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@traffic.gov.in"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>
        </form>
      )}
    </Modal>
  );
};
