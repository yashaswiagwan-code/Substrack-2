import { DashboardLayout } from '../components/DashboardLayout';

export function Subscribers() {
  return (
    <DashboardLayout title="Subscribers">
      <div className="bg-white p-8 rounded-xl shadow-sm text-center">
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Subscribers Management</h2>
        <p className="text-gray-500">View and manage your subscription subscribers.</p>
        <p className="text-sm text-gray-400 mt-4">This feature is coming soon in the full version.</p>
      </div>
    </DashboardLayout>
  );
}
