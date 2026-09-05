import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="unline-empty" role="status">
      <div className="unline-empty__icon" aria-hidden="true">
        {icon}
      </div>
      <h3 className="unline-empty__title">{title}</h3>
      <p className="unline-empty__description">{description}</p>
      {action}
    </div>
  );
}
