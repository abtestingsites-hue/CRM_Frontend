export const metadata = {
  title: 'Care Plans | CRM Tool',
};

export default function CarePlansPage() {
  return (
    <div className="h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Care Plans</h1>
        <p className="text-slate-500 mt-1">Manage active care schedules, medication reminders, and home visits.</p>
      </header>
      
      <div className="flex-1 bg-card rounded-3xl border border-border shadow-sm p-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Care Management System</h2>
          <p className="text-slate-500">Syncing caregiver schedules...</p>
        </div>
      </div>
    </div>
  );
}
