import React from 'react';
import { scheduleAutoReload, wasReloadedRecently } from '../utils/autoReload';

// Last-resort catch-all for render errors that make the page unusable -
// most commonly a stale JS chunk after a new deploy. Deliberately doesn't
// depend on react-i18next or other app internals, since whatever broke
// rendering could be adjacent to those too; this needs to work even when
// most of the app can't.
const isFrench = typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fr');

const COPY = {
  title: isFrench ? 'Un instant...' : 'One moment...',
  body: isFrench
    ? "Une nouvelle version du site est disponible. La page va se recharger automatiquement."
    : "A newer version of the site is available. The page will reload automatically.",
  manualBody: isFrench
    ? "Le rechargement automatique n'a pas fonctionné. Veuillez recharger la page manuellement."
    : "The automatic reload didn't work. Please reload the page manually.",
  reloadButton: isFrench ? 'Recharger la page' : 'Reload page',
};

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, autoReloadTried: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught render error:', error, info);
    const alreadyTried = wasReloadedRecently();
    const scheduled = scheduleAutoReload(1500);
    this.setState({ autoReloadTried: scheduled || alreadyTried });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem',
          fontFamily: 'sans-serif',
          color: '#292929',
        }}
      >
        <h2 style={{ color: '#192A88', marginBottom: '0.75rem' }}>{COPY.title}</h2>
        <p style={{ color: '#666', maxWidth: '420px', marginBottom: '1.5rem' }}>
          {this.state.autoReloadTried ? COPY.manualBody : COPY.body}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#192A88',
            color: '#fff',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          {COPY.reloadButton}
        </button>
      </div>
    );
  }
}
