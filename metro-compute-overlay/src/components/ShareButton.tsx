'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { copyShareableUrl } from '@/lib/url-state';
import { Share2, Check } from 'lucide-react';

export default function ShareButton() {
  const [copied, setCopied] = useState(false);
  const { selectedNodes, pointOfUse, selectedWorkload, filters, userGridSites, compareMode, latencyRingMode, powerOverlay } = useAppStore();

  const handleShare = async () => {
    try {
      await copyShareableUrl({
        selectedNodes,
        pointOfUse,
        selectedWorkload,
        filters,
        userGridSites,
        compareMode,
        latencyRingMode,
        powerOverlay
      });
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      title="Share current view"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          <span className="text-sm">Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span className="text-sm">Share</span>
        </>
      )}
    </button>
  );
}
