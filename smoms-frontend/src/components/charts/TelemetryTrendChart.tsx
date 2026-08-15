import React from 'react';

interface TelemetryTrendChartProps {
  readings?: any[];
}

export const TelemetryTrendChart: React.FC<TelemetryTrendChartProps> = () => {
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-500 text-center">
      Telemetry analysis active.
    </div>
  );
};
