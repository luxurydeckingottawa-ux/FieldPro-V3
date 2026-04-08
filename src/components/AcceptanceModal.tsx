import React, { useState, useCallback } from 'react';
import { Job, PipelineStage, DepositStatus, SoldWorkflowStatus, CustomerLifecycle } from '../types';
import SignaturePad from './SignaturePad';
import { generateContractPDF } from '../utils/contractPdf';
import { 
  X, CheckCircle2, FileText, DollarSign, 
  Calendar, Shield, AlertCircle, Download, Loader2
} from 'lucide-react';

interface AcceptanceModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (jobId: string, updates: Partial<Job>) => void;
}

const AcceptanceModal: React.FC<AcceptanceModalProps> = ({ job, isOpen, onClose, onAccept }) => {
  const [signature, setSignature] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [clientName, setClientName] = useState(job.clientName || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = job.totalAmount || job.estimateAmount || 0;
  const deposit = Math.round(amount * 0.3);

  const handleAccept = useCallback(async () => {
    if (!signature) {
      setError('Please sign below to accept the estimate.');
      return;
    }
    if (!agreed) {
      setError('Please agree to the terms and conditions.');
      return;
    }
    if (!clientName.trim()) {
      setError('Please enter the client name.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Generate the contract PDF
      const contractPdfUrl = await generateContractPDF({
        jobNumber: job.jobNumber || '',
        clientName: clientName,
        clientEmail: job.clientEmail || '',
        clientPhone: job.clientPhone || '',
        projectAddress: job.projectAddress || '',
        totalAmount: amount,
        depositAmount: deposit,
        scopeSummary: job.scopeSummary || job.acceptedBuildSummary?.scopeSummary || '',
        signature: signature,
        acceptedDate: new Date().toISOString(),
      });

      // Update the job with acceptance data
      const now = new Date().toISOString();
      onAccept(job.id, {
        pipelineStage: PipelineStage.JOB_SOLD,
        lifecycleStage: CustomerLifecycle.WON_SOLD,
        depositStatus: DepositStatus.NOT_SENT,
        soldWorkflowStatus: SoldWorkflowStatus.ACCEPTED,
        estimateStatus: 'accepted' as any,
        acceptedDate: now,
        customerSignature: signature,
        contractPdfUrl: contractPdfUrl,
        clientName: clientName,
        updatedAt: now,
        files: [
          ...(job.files || []),
          {
            id: `contract-${Date.now()}`,
            name: `Contract-${job.jobNumber}.pdf`,
            url: contractPdfUrl,
            type: 'contract',
            uploadedAt: now,
            uploadedBy: 'system'
          }
        ]
      });

      onClose();
    } catch (err) {
      console.error('Acceptance error:', err);
      setError('Failed to process acceptance. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [signature, agreed, clientName, job, amount, deposit, onAccept, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] sticky top-0 bg-[var(--bg-primary)] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Accept Estimate</h2>
              <p className="text-xs text-[var(--text-secondary)]">{job.jobNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-all">
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {/* Project Summary */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border-color)]">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4">Project Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Client</p>
                <input 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="text-sm font-bold text-[var(--text-primary)] bg-transparent border-b border-[var(--border-color)] focus:border-emerald-500 focus:outline-none w-full pb-1"
                />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Address</p>
                <p className="text-sm text-[var(--text-primary)]">{job.projectAddress || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Total Amount</p>
                <p className="text-xl font-bold text-emerald-500">${amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Deposit (30%)</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">${deposit.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border-color)]">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5" /> Payment Schedule
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-primary)]">Deposit (30%)</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">${deposit.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-primary)]">Upon Material Delivery (30%)</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">${Math.round(amount * 0.3).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-primary)]">Final Handover (40%)</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">${Math.round(amount * 0.4).toLocaleString()}</span>
              </div>
              <div className="border-t border-[var(--border-color)] pt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--text-primary)]">Total</span>
                <span className="text-sm font-bold text-emerald-500">${amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border-color)]">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Terms & Conditions
            </h3>
            <div className="text-xs text-[var(--text-secondary)] space-y-2 max-h-40 overflow-y-auto pr-2">
              <p>By signing below, the client agrees to the project scope, pricing, and payment schedule as outlined above.</p>
              <p>The project scope includes all work described in the attached estimate. Any changes to the scope after acceptance will require a written change order with adjusted pricing.</p>
              <p>Payment is due according to the schedule above. Late payments may result in project delays. All materials remain the property of Luxury Decking until final payment is received.</p>
              <p>Luxury Decking provides a workmanship warranty on all installations. Material warranties are provided by the respective manufacturers.</p>
              <p>This agreement is governed by the laws of the Province of Ontario. The project will be completed according to applicable Ontario Building Code requirements.</p>
              <p>Cancellation after acceptance may be subject to a cancellation fee of up to 10% of the project total to cover administrative and planning costs.</p>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
              agreed ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--border-color)] group-hover:border-emerald-500/50'
            }`} onClick={() => setAgreed(!agreed)}>
              {agreed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className="text-sm text-[var(--text-primary)]" onClick={() => setAgreed(!agreed)}>
              I, <strong>{clientName || '___'}</strong>, have read and agree to the terms and conditions, project scope, and payment schedule outlined above.
            </span>
          </label>

          {/* Signature */}
          <div>
            <SignaturePad
              onSave={(sig) => setSignature(sig)}
              onClear={() => setSignature(null)}
              initialValue={signature || undefined}
            />
          </div>

          {/* Accept Button */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-bold text-sm hover:bg-[var(--bg-secondary)]/80 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              disabled={isProcessing || !signature || !agreed}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Accept & Sign</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptanceModal;
