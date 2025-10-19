import { DashboardLayout } from '../components/DashboardLayout';

export function Notifications() {
  return (
    <DashboardLayout title="Notifications">
      <div className="bg-white p-8 rounded-xl shadow-sm text-center">
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Notification Settings</h2>
        <p className="text-gray-500">Configure email notifications and alerts.</p>
        <p className="text-sm text-gray-400 mt-4">This feature is coming soon in the full version.</p>
      </div>
    </DashboardLayout>
  );
}
