export default function StatusBar() {
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
  });

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white text-sm font-semibold text-gray-900">
      <span>{currentTime}</span>
      <div className="flex items-center gap-1 text-xs">
        <i className="fas fa-signal"></i>
        <i className="fas fa-wifi"></i>
        <span>100%</span>
        <i className="fas fa-battery-full"></i>
      </div>
    </div>
  );
}
