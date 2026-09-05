"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/admin";
import { StatCard } from "@/components/admin";
import { FaUsers, FaDollarSign, FaCalendarCheck, FaUserPlus } from "react-icons/fa";

interface AnalyticsData {
  totalMembers: number;
  activeMembers: number;
  trialUsers: number;
  mrr: number;
  mrrGrowth: number;
  newMembersThisMonth: number;
  newMembersGrowth: number;
  classAttendanceRate: number;
  attendanceChange: number;
  conversionRate: number;
  conversionChange: number;
  revenueByMonth: { month: string; revenue: number }[];
  membersByPlan: { plan: string; count: number }[];
  membersByCountry: { country: string; count: number }[];
  topPerformingContent: { title: string; views: number }[];
}

interface ApiError {
  error: string;
  details?: string;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30d");
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/analytics?range=${dateRange}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        const errorData: ApiError = await response.json();
        setError(errorData.error || 'Failed to fetch analytics');
        setData(null);
      }
    } catch (_err) {
      setError('Network error - unable to connect to analytics API');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const maxRevenue = data?.revenueByMonth?.reduce((max, item) => Math.max(max, item.revenue), 0) || 1;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Monitor your business performance and growth metrics"
        actions={
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="12m">Last 12 months</option>
          </select>
        }
      />

      {/* Error Display */}
      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">Error loading analytics</p>
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-2 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Monthly Revenue"
          value={`$${data?.mrr?.toLocaleString() || 0}`}
          change={`${(data?.mrrGrowth ?? 0) >= 0 ? '+' : ''}${data?.mrrGrowth ?? 0}%`}
          changeType={(data?.mrrGrowth ?? 0) >= 0 ? "positive" : "negative"}
          trend={(data?.mrrGrowth ?? 0) >= 0 ? "up" : "down"}
          icon={<FaDollarSign className="w-5 h-5" />}
        />
        <StatCard
          title="Active Members"
          value={data?.activeMembers || 0}
          change={`+${data?.newMembersThisMonth || 0} this month`}
          changeType="positive"
          trend="up"
          icon={<FaUsers className="w-5 h-5" />}
        />
        <StatCard
          title="Trial Users"
          value={data?.trialUsers || 0}
          change={`${data?.trialUsers || 0} in trial period`}
          changeType="neutral"
          icon={<FaUserPlus className="w-5 h-5" />}
        />
        <StatCard
          title="Class Attendance"
          value={`${data?.classAttendanceRate || 0}%`}
          change={`${data?.attendanceChange ?? 0}%`}
          changeType={(data?.attendanceChange ?? 0) >= 0 ? "positive" : "negative"}
          trend={(data?.attendanceChange ?? 0) >= 0 ? "up" : "down"}
          icon={<FaCalendarCheck className="w-5 h-5" />}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Revenue Overview</h3>
            <p className="text-sm text-gray-500">Monthly recurring revenue trend</p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="animate-pulse h-48 bg-gray-100 rounded" />
            ) : error || !data ? (
              <div className="h-48 flex items-center justify-center text-gray-400">
                {error ? 'Unable to load revenue data' : 'No data available'}
              </div>
            ) : (
              <div className="flex items-end justify-between gap-2 h-48">
                {data.revenueByMonth && data.revenueByMonth.length > 0 ? (
                  data.revenueByMonth.map((item, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-primary/10 rounded-t-lg relative group">
                        <div
                          className="absolute inset-0 bg-gradient-to-t from-primary/30 to-primary/10 rounded-t-lg transition-all group-hover:from-primary/40 group-hover:to-primary/20"
                          style={{ height: `${(item.revenue / maxRevenue) * 100}%` }}
                        />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          ${item.revenue.toLocaleString()}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{item.month}</span>
                    </div>
                  ))
                ) : (
                  <div className="w-full flex items-center justify-center text-gray-400 h-48">
                    No revenue data yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Members by Plan */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Members by Plan</h3>
            <p className="text-sm text-gray-500">Distribution across plans</p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-12 bg-gray-100 rounded" />
                <div className="h-12 bg-gray-100 rounded" />
              </div>
            ) : error || !data ? (
              <div className="text-gray-400 text-center py-8">
                {error ? 'Unable to load data' : 'No data available'}
              </div>
            ) : (
              <div className="space-y-4">
                {data.membersByPlan && data.membersByPlan.length > 0 ? data.membersByPlan.map((item, index) => {
                  const percentage = ((item.count / (data.activeMembers || 1)) * 100).toFixed(1);
                  const colors = ["bg-primary", "bg-secondary", "bg-orange-500", "bg-teal-500"];
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">{item.plan}</span>
                        <span className="text-gray-500">{item.count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[index % colors.length]} rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-gray-400 text-center py-4">No plan data yet</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Top Performing Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Top Performing Content</h3>
            <p className="text-sm text-gray-500">Most viewed blog posts and pages</p>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-6 animate-pulse space-y-4">
                <div className="h-12 bg-gray-100 rounded" />
                <div className="h-12 bg-gray-100 rounded" />
                <div className="h-12 bg-gray-100 rounded" />
              </div>
            ) : error || !data ? (
              <div className="p-6 text-center text-gray-400">
                {error ? 'Unable to load content data' : 'No data available'}
              </div>
            ) : data.topPerformingContent && data.topPerformingContent.length > 0 ? (
              data.topPerformingContent.map((content, index) => (
                <div key={index} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-300">{(index + 1).toString().padStart(2, '0')}</span>
                    <span className="font-medium text-gray-700">{content.title}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-primary">{content.views.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 ml-1">views</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-400">No content data yet</div>
            )}
          </div>
        </div>

        {/* Members by Country */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Members by Location</h3>
            <p className="text-sm text-gray-500">Geographic distribution of members</p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-100 rounded" />
                <div className="h-6 bg-gray-100 rounded" />
                <div className="h-6 bg-gray-100 rounded" />
                <div className="h-6 bg-gray-100 rounded" />
                <div className="h-6 bg-gray-100 rounded" />
              </div>
            ) : error || !data ? (
              <div className="text-center text-gray-400 py-8">
                {error ? 'Unable to load location data' : 'No data available'}
              </div>
            ) : data.membersByCountry && data.membersByCountry.length > 0 ? (
              <div className="space-y-3">
                {data.membersByCountry.map((item, index) => {
                  const maxCount = data.membersByCountry[0]?.count || 1;
                  return (
                    <div key={index} className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-700 w-20">{item.country}</span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                          style={{ width: `${(item.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-10 text-right">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-4">No location data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
