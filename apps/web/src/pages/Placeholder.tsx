interface PlaceholderProps {
  title: string;
  icon: string;
  description: string;
}

export function PlaceholderPage({ title, icon, description }: PlaceholderProps) {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{description}</p>
      </div>
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">{icon}</div>
          <h3 className="empty-state-title">Coming Soon</h3>
          <p>This section is under development</p>
        </div>
      </div>
    </>
  );
}
