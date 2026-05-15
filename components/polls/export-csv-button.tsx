"use client";

import { Download } from "lucide-react";

export default function ExportCsvButton({ 
  pollTitle, 
  options, 
  totalRespondents 
}: { 
  pollTitle: string; 
  options: any[]; 
  totalRespondents: number; 
}) {
  const handleExport = () => {
    // Generate CSV content
    const headers = ["Option", "Votes", "Percentage"];
    const rows = options.map(opt => [
      `"${opt.label.replace(/"/g, '""')}"`,
      opt.voteCount,
      totalRespondents > 0 ? `${((opt.voteCount / totalRespondents) * 100).toFixed(1)}%` : "0%"
    ]);
    
    // Add summary row
    rows.push(["", "", ""]);
    rows.push(["Total Respondents", totalRespondents.toString(), ""]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${pollTitle.replace(/\s+/g, "_").toLowerCase()}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button 
      onClick={handleExport}
      className="inline-flex items-center space-x-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors"
    >
      <Download size={14} />
      <span>Export CSV</span>
    </button>
  );
}