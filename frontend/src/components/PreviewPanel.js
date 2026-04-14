import React, { useState } from 'react';
import { Monitor, ExternalLink, RefreshCw, Globe, X } from 'lucide-react';

export default function PreviewPanel({ previewUrl, isVisible, onClose }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setIframeKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div
      data-testid="preview-panel"
      className={`flex flex-col h-full bg-zinc-900 ${isVisible ? '' : 'hidden lg:flex'}`}
    >
      {/* Browser Header */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-zinc-800 shrink-0 bg-zinc-900">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
        </div>

        {/* URL Bar */}
        <div className="flex-1 flex items-center gap-2 bg-zinc-950 rounded-md px-3 py-1.5 border border-zinc-800 max-w-md">
          <Globe size={12} className="text-zinc-600 shrink-0" />
          <span className="text-xs font-mono text-zinc-500 truncate">
            {previewUrl || 'Waiting for sandbox...'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            data-testid="preview-refresh-btn"
            onClick={handleRefresh}
            disabled={!previewUrl}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors lg:hidden"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 relative bg-zinc-950" data-testid="preview-iframe-container">
        {previewUrl ? (
          <iframe
            key={iframeKey}
            data-testid="preview-iframe"
            src={previewUrl}
            className="w-full h-full border-none bg-white"
            title="Live Preview"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 mx-auto rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <Monitor size={28} className="text-zinc-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-400">Live Preview</h3>
                <p className="text-xs text-zinc-600 mt-1">
                  Your app will appear here once Axon starts a development server in the sandbox
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-700">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse" />
                <span>Waiting for sandbox</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
