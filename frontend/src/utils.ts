export const formatTime = (seconds: number) => {
    if (!seconds) return '0h 0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };
  
export const formatPct = (pct: number) => {
    return `${(pct || 0).toFixed(1)}%`;
};
