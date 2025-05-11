"use client";

import { AlertCircle, CheckCircle } from "lucide-react";

interface StatusIndicatorProps {
  status: "idle" | "searching" | "success" | "error";
  message?: string;
}

export default function StatusIndicator({ status, message }: StatusIndicatorProps) {
  if (status === "idle") {
    return null;
  }

  const getStatusStyles = () => {
    switch (status) {
      case "searching":
        return "bg-blue-950 text-blue-200 border-blue-800";
      case "success":
        return "bg-green-950 text-green-200 border-green-800";
      case "error":
        return "bg-red-950 text-red-200 border-red-800";
      default:
        return "bg-gray-950 text-gray-200 border-gray-800";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "searching":
        return (
          <div className="animate-spin h-5 w-5 border-2 border-current rounded-full border-t-transparent" />
        );
      case "success":
        return <CheckCircle className="h-5 w-5" />;
      case "error":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div className={`p-4 rounded-md border ${getStatusStyles()} mb-4 flex items-center`}>
      <div className="mr-3">
        {getStatusIcon()}
      </div>
      <div>
        <p className="text-sm">
          {message || 
            (status === "searching" ? "Searching for jobs..." : 
             status === "success" ? "Successfully completed search" :
             status === "error" ? "An error occurred" : "")}
        </p>
      </div>
    </div>
  );
}