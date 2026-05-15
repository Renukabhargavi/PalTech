"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function ShareLink({ shareToken }: { shareToken: string }) {
  const [copied, setCopied] = useState(false);
  const link = `/p/${shareToken}`;
  const fullLink = typeof window !== "undefined" ? `${window.location.origin}${link}` : link;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      onClick={handleCopy}
      className="p-4 bg-gray-50 rounded-lg border border-gray-100 relative group cursor-pointer hover:bg-gray-100 transition-colors"
      title="Click to copy link"
    >
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Share Link</p>
        <button className="text-gray-400 group-hover:text-blue-600 transition-colors">
          {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
        </button>
      </div>
      <p className="font-mono text-xs text-blue-600 mt-1 truncate">{link}</p>
    </div>
  );
}
