import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="scripts-empty" role="status">
      <div className="scripts-empty__icon" aria-hidden="true">
        {icon}
      </div>
      <h3 className="scripts-empty__title">{title}</h3>
      <p className="scripts-empty__description">{description}</p>
      {action}
    </div>
  );
}
