import React, { useState, useCallback } from 'react';
import { Job, PipelineStage, DepositStatus, SoldWorkflowStatus, CustomerLifecycle, BuildDetails } from '../types';
import SignaturePad from './SignaturePad';
import { generateContractPDF } from '../utils/contractPdf';
import { generateDepositInvoice } from '../utils/depositInvoice';
import { prefillBuildDetailsFromQuote } from '../utils/prefillBuildDetails';
import { createDefaultBuildDetails } from '../constants';
import { 
  X, CheckCircle2, FileText, DollarSign, 
  Calendar, Shield, AlertCircle, Download, Loader2
} from 'lucide-react';

// Safe fallback for build details when none exist
const createSafeBuildDetails = (): BuildDetails => {
  try {
    return createDefaultBuildDetails();
  } catch {
    return {
      sitePrep: { demolitionRequired: false, permitsRequired: false, locatesRequired: false, binRequired: false, siteProtection: false, inspectionRequired: false, notes: '' },
      footings: { type: '', attachedToHouse: false, floating: false, bracketType: '', notes: '' },
      framing: { type: 'Pressure Treated', joistSize: '2x8', joistSpacing: '16" OC', joistProtection: false, joistProtectionType: '', notes: '' },
      landscaping: { prepType: '', notes: '' },
      electrical: { lightingIncluded: false, lightingType: '', roughInNotes: '', notes: '' },
      decking: { type: '', brand: '', color: '', accentNote: '', notes: '' },
      railing: { included: false, type: '', notes: '' },
      skirting: { included: false, type: '', trapDoor: false, notes: '' },
      stairs: { included: false, type: '', style: '', notes: '' },
      features: { privacyWall: false, privacyWallType: '', customNotes: '' },
    };
  }
};

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
      const now = new Date().toISOString();

      // Generate the contract PDF
      let contractPdfUrl = '';
      try {
        contractPdfUrl = await generateContractPDF({
          jobNumber: job.jobNumber || '',
          clientName: clientName,
          clientEmail: job.clientEmail || '',
          clientPhone: job.clientPhone || '',
          projectAddress: job.projectAddress || '',
          totalAmount: amount,
          depositAmount: deposit,
          scopeSummary: job.scopeSummary || job.acceptedBuildSummary?.scopeSummary || '',
          signature: signature!,
          acceptedDate: now,
        });
      } catch (pdfErr) {
        console.error('Contract PDF generation failed:', pdfErr);
        // Continue without contract PDF - don't block acceptance
      }

      // Generate deposit invoice
      let depositInvoiceUrl = '';
      try {
        depositInvoiceUrl = generateDepositInvoice({
          jobNumber: job.jobNumber || '',
          clientName: clientName,
          clientEmail: job.clientEmail || '',
          clientPhone: job.clientPhone || '',
          projectAddress: job.projectAddress || '',
          totalAmount: amount,
          depositPercent: 30,
          invoiceDate: now,
        });
      } catch (invErr) {
        console.error('Deposit invoice generation failed:', invErr);
        // Continue without invoice - don't block acceptance
      }

      // Pre-fill build details from quote selections (non-critical)
      let prefilledBuildDetails = job.buildDetails;
      try {
        const selections = job.calculatorSelections || 
          (job.acceptedBuildSummary ? { decking: job.acceptedBuildSummary.optionName } : {});
        prefilledBuildDetails = prefillBuildDetailsFromQuote(
          job.buildDetails || createSafeBuildDetails(),
          selections,
          job.acceptedBuildSummary?.scopeSummary
        );
      } catch (prefillErr) {
        console.error('Build details prefill failed:', prefillErr);
        // Use existing build details
      }

      // Build file attachments
      const newFiles = [...(job.files || [])];
      if (contractPdfUrl) {
        newFiles.push({
          id: `contract-${Date.now()}`,
          name: `Contract-${job.jobNumber}.pdf`,
          url: contractPdfUrl,
          type: 'contract',
          uploadedAt: now,
          uploadedBy: 'system'
        });
      }
      if (depositInvoiceUrl) {
        newFiles.push({
          id: `deposit-inv-${Date.now()}`,
          name: `Deposit-Invoice-${job.jobNumber}.pdf`,
          url: depositInvoiceUrl,
          type: 'other',
          uploadedAt: now,
          uploadedBy: 'system'
        });
      }

      // Call the parent accept handler
      try {
        onAccept(job.id, {
          pipelineStage: PipelineStage.JOB_SOLD,
          lifecycleStage: CustomerLifecycle.WON_SOLD,
          depositStatus: DepositStatus.REQUESTED,
          depositRequestedDate: now,
          depositAmount: deposit,
          soldWorkflowStatus: SoldWorkflowStatus.AWAITING_DEPOSIT,
          estimateStatus: 'accepted' as any,
          acceptedDate: now,
          customerSignature: signature,
          contractPdfUrl: contractPdfUrl,
          clientName: clientName,
          buildDetails: prefilledBuildDetails,
          updatedAt: now,
          files: newFiles,
        });
      } catch (acceptErr) {
        console.error('onAccept callback error:', acceptErr);
        // Don't block - the data was prepared successfully
      }

      onClose();
    } catch (err) {
      console.error('Acceptance error:', err);
      setError(`Failed to process acceptance: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`);
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
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[var(--brand-gold)]" />
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
                  className="text-sm font-bold text-[var(--text-primary)] bg-transparent border-b border-[var(--border-color)] focus:border-[var(--brand-gold)] focus:outline-none w-full pb-1"
                />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Address</p>
                <p className="text-sm text-[var(--text-primary)]">{job.projectAddress || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Total Amount</p>
                <p className="text-xl font-bold text-[var(--brand-gold)]">${amount.toLocaleString()}</p>
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
                <span className="text-sm font-bold text-[var(--brand-gold)]">${amount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border-color)]">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Project Agreement
            </h3>
            <div className="text-xs text-[var(--text-secondary)] space-y-4 max-h-64 overflow-y-auto pr-2">
              <div>
                <p className="font-bold text-[var(--text-primary)] mb-1">Scope of Work</p>
                <p>The parties agree that the project entails the construction of a new deck at the property listed above. The full scope of work is defined exclusively by the accepted Luxury Decking estimate #{job.jobNumber}, including but not limited to project dimensions, materials, foundations, framing, decking, railings, stairs, and any selected upgrades. The accepted estimate forms an integral part of this Agreement and governs all pricing, inclusions, specifications, and assumptions.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)] mb-1">Extras and Change Orders</p>
                <p>Any work, materials, or services not explicitly included in the accepted estimate shall be considered extras. All extras must be approved in writing by the Homeowner prior to commencement. Pricing for extras will be agreed upon before the additional work proceeds. Payment for approved extras is due upon completion of the extra work unless otherwise agreed in writing.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)] mb-1">Project Schedule, Site Access, and Working Hours</p>
                <p>The Contractor will provide an anticipated start window once materials are confirmed and the deposit has been received. Start dates are subject to weather, supplier lead times, site readiness, and crew availability. The Homeowner agrees to provide clear access to the work area. Normal working hours are Monday to Saturday, 8:00 a.m. to 6:00 p.m.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)] mb-1">Permits, Locates, and Inspections</p>
                <p>If permits or engineered drawings are required, responsibilities and costs will be as outlined in the accepted estimate. Where applicable, utility locates must be completed prior to ground disturbance.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)] mb-1">Site Conditions and Unforeseen Work</p>
                <p>Pricing is based on typical site conditions. If hidden conditions are discovered (including but not limited to buried debris, unexpected soil conditions, rot, structural deficiencies, or concealed utilities), the Contractor will notify the Homeowner and provide a change order for approval.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)] mb-1">Weather, Delays, and Force Majeure</p>
                <p>Outdoor construction is weather-dependent. The Contractor is not liable for delays caused by events beyond its reasonable control, including supplier backorders, labour disruptions, acts of God, or municipal delays.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)] mb-1">Payment Policy</p>
                <p>Invoices are due within five (5) calendar days of receipt. Any overdue balance is subject to a 10% late payment fee after the due date and interest at 4% per month on unpaid balances exceeding $1,000. Failure to remit payment constitutes a material breach of this Agreement.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)] mb-1">Warranty</p>
                <p>Luxury Decking provides a five (5) year workmanship warranty on labour. Manufacturer warranties on materials apply separately and are subject to the terms provided by the manufacturer.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)] mb-1">Material Ownership</p>
                <p>All materials supplied for the project remain the property of the Contractor until payment is made in full.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)] mb-1">Jobsite Conditions</p>
                <p>The Homeowner acknowledges that minor disturbance to landscaping, lawn areas, or surrounding property may occur during construction. The Contractor will maintain the jobsite in a clean, neat, and orderly condition.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)] mb-1">Insurance, Safety, and Photos</p>
                <p>The Contractor carries standard business liability coverage. The Homeowner agrees to keep children and pets away from the work area. With the Homeowner's permission, non-identifying photos may be used for portfolio and marketing purposes.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)] mb-1">Governing Law</p>
                <p>This Agreement shall be governed by the laws of the Province of Ontario. Any disputes shall be resolved within Ontario jurisdiction.</p>
              </div>
              <div>
                <p className="font-bold text-[var(--text-primary)] mb-1">Entire Agreement</p>
                <p>This Agreement, together with the accepted estimate, constitutes the entire agreement between the parties and supersedes all prior discussions. Any amendments must be made in writing and agreed upon by both parties.</p>
              </div>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
              agreed ? 'bg-[var(--brand-gold)] border-[var(--brand-gold)]' : 'border-[var(--border-color)] group-hover:border-[var(--brand-gold)]/50'
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
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--brand-gold)] text-white rounded-xl font-bold text-sm hover:bg-[var(--brand-gold)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--brand-gold)]/20"
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
