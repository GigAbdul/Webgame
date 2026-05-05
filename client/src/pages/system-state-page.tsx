import { Link, useRouteError } from 'react-router-dom';

type SystemStatePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    to: string;
  };
  secondaryAction?: {
    label: string;
    to: string;
  };
};

export function SystemStatePage({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
}: SystemStatePageProps) {
  return (
    <main className="system-state-page">
      <div className="system-state-scene" aria-hidden="true">
        <div className="system-state-grid" />
        <div className="system-state-runner" />
      </div>

      <section className="game-home-panel game-home-panel--system-state" aria-labelledby="system-state-title">
        <div className="game-home-panel-header">
          <div>
            <p className="game-home-panel-kicker">{eyebrow}</p>
            <h1 id="system-state-title" className="game-home-panel-title">
              {title}
            </h1>
          </div>
        </div>

        <p className="system-state-copy">{description}</p>

        <div className="system-state-actions">
          {primaryAction ? (
            <Link to={primaryAction.to} className="game-home-account-button">
              {primaryAction.label}
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link to={secondaryAction.to} className="game-home-account-button game-home-account-button--help">
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <SystemStatePage
      eyebrow="Route Lost"
      title="404"
      description="That portal does not lead to a playable screen. Jump back to the arcade or pick an official level."
      primaryAction={{ label: 'Home', to: '/' }}
      secondaryAction={{ label: 'Levels', to: '/levels' }}
    />
  );
}

export function RouteErrorPage() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : 'The route crashed before the screen could finish loading.';

  return (
    <SystemStatePage
      eyebrow="Runtime Fault"
      title="Oops"
      description={message}
      primaryAction={{ label: 'Home', to: '/' }}
      secondaryAction={{ label: 'Levels', to: '/levels' }}
    />
  );
}
