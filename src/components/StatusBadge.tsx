import { STATUS_LABEL } from '@/lib/config';
import type { VerificationStatus } from '@/lib/types';

const STYLE: Record<VerificationStatus, string> = {
  OFFICIAL_2027_VERIFIED: 'bg-emerald-100 text-emerald-800',
  PREVIOUS_YEAR_REFERENCE: 'bg-slate-200 text-slate-800',
  UNVERIFIED_PRACTICE: 'bg-amber-100 text-amber-800',
};

export default function StatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <span className={`badge ${STYLE[status]}`} title={status}>
      {STATUS_LABEL[status]}
    </span>
  );
}
