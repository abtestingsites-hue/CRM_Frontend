export const metadata = {
  title: 'Emergency Alerts | CRM Tool',
};

export default function EmergencyAlertsPage() {
  return (
    <div className="h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-rose-500">Emergency & Panic Alerts</h1>
        <p className="text-slate-500 mt-1">Monitor high-priority escalated events requiring immediate dispatch.</p>
      </header>
      
      <div className="flex-1 bg-rose-50 dark:bg-rose-950/20 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-sm p-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2 text-rose-600 dark:text-rose-400">Emergency Dispatch Center</h2>
          <p className="text-slate-500">Awaiting critical events via WebSockets...</p>
        </div>
      </div>
    </div>
  );
}
