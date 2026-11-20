import type { ReactNode } from 'react';
import { PortalShell } from '@/domains/portal/components/PortalShell';
import '@/styles/portal.css';

export default function PortalGroupLayout({ children }: { readonly children: ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
