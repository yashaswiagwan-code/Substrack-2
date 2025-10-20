import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, Users, Calendar, TrendingDown } from 'lucide-react';

interface DashboardStats {
  totalRevenue: number;
  revenueGrowth: number;
  activeSubscribers: number;
  subscriberGrowth: number;
  upcomingRenewals: number;
  churnRate: number;
}

interface RecentActivity {
  id: string;
  customer_name: string;
  plan_name: string;
  date: string;
  amount: number;
  status: string;
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    revenueGrowth: 0,
    activeSubscribers: 0,
    subscriberGrowth: 0,
    upcomingRenewals: 0,
    churnRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const [subscribersResult, transactionsResult] = await Promise.all([
        supabase
          .from('subscribers')
          .select('*, subscription_plans(name, price)')
          .eq('merchant_id', user!.id),
        supabase
          .from('payment_transactions')
          .select('*, subscribers(customer_name), subscription_plans(name)')
          .eq('merchant_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (subscribersResult.data) {
        const activeSubscribers = subscribersResult.data.filter(s => s.status === 'active').length;
        const totalRevenue = subscribersResult.data.reduce((sum, s) => sum + (s.last_payment_amount || 0), 0);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const upcomingRenewals = subscribersResult.data.filter(
          s => s.next_renewal_date && new Date(s.next_renewal_date) <= nextWeek
        ).length;

        setStats({
          totalRevenue,
          revenueGrowth: 12.5,
          activeSubscribers,
          subscriberGrowth: 32,
          upcomingRenewals,
          churnRate: 2.1,
        });
      }

      if (transactionsResult.data) {
        const activities = transactionsResult.data.map(t => ({
          id: t.id,
          customer_name: (t.subscribers as any)?.customer_name || 'Unknown',
          plan_name: (t.subscription_plans as any)?.name || 'Unknown Plan',
          date: new Date(t.payment_date).toISOString().split('T')[0],
          amount: t.amount,
          status: t.status,
        }));
        setRecentActivity(activities);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-800">${stats.totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-green-500 flex items-center mt-1">+{stats.revenueGrowth}% this month</p>
          </div>
          <div className="bg-blue-100 text-blue-500 rounded-full p-3">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Active Subscribers</p>
            <p className="text-2xl font-bold text-gray-800">{stats.activeSubscribers}</p>
            <p className="text-xs text-green-500 flex items-center mt-1">+{stats.subscriberGrowth} this month</p>
          </div>
          <div className="bg-green-100 text-green-500 rounded-full p-3">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Upcoming Renewals</p>
            <p className="text-2xl font-bold text-gray-800">{stats.upcomingRenewals}</p>
            <p className="text-xs text-gray-500 flex items-center mt-1">in next 7 days</p>
          </div>
          <div className="bg-yellow-100 text-yellow-500 rounded-full p-3">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Churn Rate</p>
            <p className="text-2xl font-bold text-gray-800">{stats.churnRate}%</p>
            <p className="text-xs text-red-500 flex items-center mt-1">-0.5% from last month</p>
          </div>
          <div className="bg-red-100 text-red-500 rounded-full p-3">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-semibold text-gray-700">Monthly Revenue Trend</h3>
          <div className="h-64 mt-4 flex items-center justify-center text-gray-400">
            <p>Revenue chart visualization</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="font-semibold text-gray-700">Subscriber Growth</h3>
          <div className="h-64 mt-4 flex items-center justify-center text-gray-400">
            <p>Subscriber growth chart visualization</p>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white p-6 rounded-xl shadow-sm">
        <h3 className="font-semibold text-gray-700">Recent Activity</h3>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">Customer</th>
                <th scope="col" className="px-6 py-3">Plan</th>
                <th scope="col" className="px-6 py-3">Date</th>
                <th scope="col" className="px-6 py-3">Amount</th>
                <th scope="col" className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-400">
                    No recent activity
                  </td>
                </tr>
              ) : (
                recentActivity.map((activity) => (
                  <tr key={activity.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {activity.customer_name}
                    </td>
                    <td className="px-6 py-4">{activity.plan_name}</td>
                    <td className="px-6 py-4">{activity.date}</td>
                    <td className="px-6 py-4">${activity.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center ${getStatusColor(activity.status)}`}>
                        <div className={`h-2.5 w-2.5 rounded-full mr-2 ${activity.status === 'success' ? 'bg-green-500' : activity.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                        {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
