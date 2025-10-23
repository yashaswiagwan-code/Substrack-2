import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, Users, Calendar, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

interface ChartData {
  month: string;
  revenue: number;
  subscribers: number;
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
  const [revenueChartData, setRevenueChartData] = useState<ChartData[]>([]);
  const [subscriberChartData, setSubscriberChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Get data for last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [
        subscribersResult,
        transactionsResult,
        allTransactions,
        currentMonthTransactions,
        lastMonthTransactions,
      ] = await Promise.all([
        // Get all subscribers
        supabase
          .from('subscribers')
          .select('*, subscription_plans(name, price)')
          .eq('merchant_id', user!.id),

        // Get recent transactions (last 5)
        supabase
          .from('payment_transactions')
          .select('*, subscribers(customer_name), subscription_plans(name)')
          .eq('merchant_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(5),

        // Get all transactions for last 6 months (for charts)
        supabase
          .from('payment_transactions')
          .select('amount, payment_date, status')
          .eq('merchant_id', user!.id)
          .eq('status', 'success')
          .gte('payment_date', sixMonthsAgo.toISOString()),

        // Get current month transactions
        supabase
          .from('payment_transactions')
          .select('amount, status')
          .eq('merchant_id', user!.id)
          .eq('status', 'success')
          .gte('payment_date', getFirstDayOfMonth(0)),

        // Get last month transactions
        supabase
          .from('payment_transactions')
          .select('amount, status')
          .eq('merchant_id', user!.id)
          .eq('status', 'success')
          .gte('payment_date', getFirstDayOfMonth(-1))
          .lt('payment_date', getFirstDayOfMonth(0)),
      ]);

      // Calculate metrics
      if (subscribersResult.data) {
        const allSubscribers = subscribersResult.data;
        const activeSubscribers = allSubscribers.filter(s => s.status === 'active');
        const cancelledSubscribers = allSubscribers.filter(s => s.status === 'cancelled');

        const activeCount = activeSubscribers.length;

        // Calculate upcoming renewals (next 7 days)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const upcomingRenewals = activeSubscribers.filter(
          s => s.next_renewal_date && new Date(s.next_renewal_date) <= nextWeek
        ).length;

        // Calculate subscriber growth
        const currentMonthStart = getFirstDayOfMonth(0);
        const lastMonthStart = getFirstDayOfMonth(-1);

        const subscribersThisMonth = allSubscribers.filter(
          s => new Date(s.start_date) >= new Date(currentMonthStart)
        ).length;

        const subscribersLastMonth = allSubscribers.filter(
          s => new Date(s.start_date) >= new Date(lastMonthStart) &&
               new Date(s.start_date) < new Date(currentMonthStart)
        ).length;

        const subscriberGrowth = subscribersLastMonth > 0
          ? ((subscribersThisMonth - subscribersLastMonth) / subscribersLastMonth) * 100
          : subscribersThisMonth > 0 ? 100 : 0;

        // Calculate churn rate
        const cancelledThisMonth = cancelledSubscribers.filter(
          s => s.updated_at && new Date(s.updated_at) >= new Date(currentMonthStart)
        ).length;

        const activeAtMonthStart = activeCount + cancelledThisMonth;
        const churnRate = activeAtMonthStart > 0
          ? (cancelledThisMonth / activeAtMonthStart) * 100
          : 0;

        // Calculate revenue
        const currentMonthRevenue = currentMonthTransactions.data?.reduce(
          (sum, t) => sum + t.amount,
          0
        ) || 0;

        const lastMonthRevenue = lastMonthTransactions.data?.reduce(
          (sum, t) => sum + t.amount,
          0
        ) || 0;

        const revenueGrowth = lastMonthRevenue > 0
          ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : currentMonthRevenue > 0 ? 100 : 0;

        const totalRevenue = allSubscribers.reduce(
          (sum, s) => sum + (s.last_payment_amount || 0),
          0
        );

        setStats({
          totalRevenue,
          revenueGrowth,
          activeSubscribers: activeCount,
          subscriberGrowth,
          upcomingRenewals,
          churnRate,
        });

        // Prepare chart data for subscriber growth
        const subscribersByMonth = prepareSubscriberChartData(allSubscribers);
        setSubscriberChartData(subscribersByMonth);
      }

      // Prepare chart data for revenue
      if (allTransactions.data) {
        const revenueByMonth = prepareRevenueChartData(allTransactions.data);
        setRevenueChartData(revenueByMonth);
      }

      // Process recent activity
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

  // Prepare revenue chart data (last 6 months)
  const prepareRevenueChartData = (transactions: any[]): ChartData[] => {
    const monthlyData: { [key: string]: number } = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData[monthKey] = 0;
    }

    // Aggregate transactions by month
    transactions.forEach(transaction => {
      const date = new Date(transaction.payment_date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthlyData.hasOwnProperty(monthKey)) {
        monthlyData[monthKey] += transaction.amount;
      }
    });

    return Object.entries(monthlyData).map(([month, revenue]) => ({
      month,
      revenue: Math.round(revenue * 100) / 100,
      subscribers: 0, // Not used in revenue chart
    }));
  };

  // Prepare subscriber growth chart data (last 6 months)
  const prepareSubscriberChartData = (subscribers: any[]): ChartData[] => {
    const monthlyData: { [key: string]: number } = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData[monthKey] = 0;
    }

    // Count cumulative subscribers by month
    let cumulativeCount = 0;
    const sortedMonths = Object.keys(monthlyData);
    
    sortedMonths.forEach(monthKey => {
      const [monthName, year] = monthKey.split(' ');
      const monthDate = new Date(`${monthName} 1, ${year}`);
      const nextMonth = new Date(monthDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const subscribersUpToThisMonth = subscribers.filter(s => {
        const startDate = new Date(s.start_date);
        return startDate < nextMonth;
      }).filter(s => {
        if (s.status === 'cancelled' && s.updated_at) {
          const cancelDate = new Date(s.updated_at);
          return cancelDate >= nextMonth;
        }
        return true;
      }).length;

      monthlyData[monthKey] = subscribersUpToThisMonth;
    });

    return Object.entries(monthlyData).map(([month, subscribers]) => ({
      month,
      revenue: 0, // Not used in subscriber chart
      subscribers,
    }));
  };

  const getFirstDayOfMonth = (monthOffset: number): string => {
    const date = new Date();
    date.setMonth(date.getMonth() + monthOffset);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
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

  const getGrowthIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4" />;
    if (value < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getGrowthColor = (value: number) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label, type }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800 mb-1">{label}</p>
          {type === 'revenue' ? (
            <p className="text-blue-600">
              Revenue: ₹{payload[0].value.toFixed(2)}
            </p>
          ) : (
            <p className="text-green-600">
              Subscribers: {payload[0].value}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Revenue Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-800">
              ₹{stats.totalRevenue.toFixed(2)}
            </p>
            <div className={`text-xs flex items-center gap-1 mt-1 ${getGrowthColor(stats.revenueGrowth)}`}>
              {getGrowthIcon(stats.revenueGrowth)}
              <span>
                {stats.revenueGrowth > 0 ? '+' : ''}
                {stats.revenueGrowth.toFixed(1)}% this month
              </span>
            </div>
          </div>
          <div className="bg-blue-100 text-blue-500 rounded-full p-3">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Active Subscribers Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Active Subscribers</p>
            <p className="text-2xl font-bold text-gray-800">{stats.activeSubscribers}</p>
            <div className={`text-xs flex items-center gap-1 mt-1 ${getGrowthColor(stats.subscriberGrowth)}`}>
              {getGrowthIcon(stats.subscriberGrowth)}
              <span>
                {stats.subscriberGrowth > 0 ? '+' : ''}
                {stats.subscriberGrowth.toFixed(1)}% this month
              </span>
            </div>
          </div>
          <div className="bg-green-100 text-green-500 rounded-full p-3">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Upcoming Renewals Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Upcoming Renewals</p>
            <p className="text-2xl font-bold text-gray-800">{stats.upcomingRenewals}</p>
            <p className="text-xs text-gray-500 flex items-center mt-1">
              in next 7 days
            </p>
          </div>
          <div className="bg-yellow-100 text-yellow-500 rounded-full p-3">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Churn Rate Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Churn Rate</p>
            <p className="text-2xl font-bold text-gray-800">{stats.churnRate.toFixed(1)}%</p>
            <p className={`text-xs flex items-center mt-1 ${
              stats.churnRate < 5 ? 'text-green-500' : 'text-red-500'
            }`}>
              {stats.churnRate < 5 ? 'Healthy' : 'Needs attention'}
            </p>
          </div>
          <div className="bg-red-100 text-red-500 rounded-full p-3">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-6">
        {/* Revenue Trend Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Monthly Revenue Trend</h3>
            <span className="text-xs text-gray-500">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="month" 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip content={(props) => <CustomTooltip {...props} type="revenue" />} />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3B82F6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Subscriber Growth Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Subscriber Growth</h3>
            <span className="text-xs text-gray-500">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={subscriberChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="month" 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip content={(props) => <CustomTooltip {...props} type="subscribers" />} />
              <Line 
                type="monotone" 
                dataKey="subscribers" 
                stroke="#10B981" 
                strokeWidth={3}
                dot={{ fill: '#10B981', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="mt-6 bg-white p-6 rounded-xl shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4">Recent Activity</h3>
        <div className="overflow-x-auto">
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
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
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
                    <td className="px-6 py-4">₹{activity.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center ${getStatusColor(activity.status)}`}>
                        <div className={`h-2.5 w-2.5 rounded-full mr-2 ${
                          activity.status === 'success' ? 'bg-green-500' : 
                          activity.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></div>
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