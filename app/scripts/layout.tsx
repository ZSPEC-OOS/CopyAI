import type { Metadata } from 'next';
import './scripts.css';

export const metadata: Metadata = {
  title: 'Scripts — Text Cleanup & Reusable Text Library',
  description: 'Paste or drop messy text, remove line breaks, and save it as a reusable, one-click-copy tile.',
};

export default function ScriptsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
