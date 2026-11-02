export const metadata = {
  title: 'Customer Feedback | CRM Tool',
};

export default function FeedbackPage() {
  return (
    <div className="h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Customer Feedback</h1>
        <p className="text-slate-500 mt-1">Review live ratings, satisfaction metrics, and customer comments.</p>
      </header>
      
      <div className="flex-1 bg-card rounded-3xl border border-border shadow-sm p-8 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Feedback Dashboard</h2>
          <p className="text-slate-500">Awaiting live feedback survey results...</p>
        </div>
      </div>
    </div>
  );
}
