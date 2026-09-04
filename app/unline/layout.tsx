import type { Metadata } from 'next';
import './unline.css';

export const metadata: Metadata = {
  title: 'Unline — Text Cleanup & Reusable Text Library',
  description: 'Paste or drop messy text, remove line breaks, and save it as a reusable, one-click-copy tile.',
};

export default function UnlineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
