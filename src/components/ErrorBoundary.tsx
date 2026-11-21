import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let displayMsg = error.message || 'Une erreur inattendue est survenue.';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        displayMsg = `Erreur Firestore (${parsed.operationType || 'opération'}) : ${parsed.error}`;
      }
    } catch {
      // plain error message
    }
    return { hasError: true, message: displayMsg };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="max-w-lg w-full border border-[#DDEBD8] bg-[#FFFFFF] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-[#B91C1C]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-lg font-semibold text-[#111111]">
                Interruption de l’application
              </h1>
            </div>
            <p className="text-sm text-[#111111]/80 leading-relaxed break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#006B35] text-white text-sm font-medium hover:bg-[#075B2E] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Recharger BUDGESTY
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
