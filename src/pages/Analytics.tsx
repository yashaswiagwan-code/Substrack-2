import { DashboardLayout } from '../components/DashboardLayout';

export function Analytics() {
  return (
    <DashboardLayout title="Analytics">
      <div className="bg-white p-8 rounded-xl shadow-sm text-center">
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Analytics & Reports</h2>
        <p className="text-gray-500">Detailed analytics and insights about your subscriptions.</p>
        <p className="text-sm text-gray-400 mt-4">This feature is coming soon in the full version.</p>
      </div>
    </DashboardLayout>
  );
}
