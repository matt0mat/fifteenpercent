import React from "react";
import tokens from "../theme/tokens";

export default function HealthIndicator({ isHealthy }) {
  let color = 'bg-gray-500';
  let tooltip = 'API status: Unknown';

  if (isHealthy === true) {
    color = 'bg-green-500';
    tooltip = 'API status: Healthy';
  } else if (isHealthy === false) {
    color = 'bg-red-500';
    tooltip = 'API status: Unhealthy';
  }

  return (
    <div className="relative flex items-center">
      <div className={`w-3 h-3 rounded-full ${color}`} title={tooltip} />
      <span className="ml-2 text-xs" style={{ color: tokens.muted }}>
        {tooltip}
      </span>
    </div>
  );
}
