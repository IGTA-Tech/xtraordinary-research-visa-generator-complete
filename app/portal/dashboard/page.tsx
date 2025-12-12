'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface CaseStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
}

interface RecentCase {
  id: string;
  beneficiaryName: string;
  visaType: string;
  status: 'completed' | 'in_progress' | 'pending';
  createdAt: string;
  documentsGenerated: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<CaseStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0
  });

  const [recentCases, setRecentCases] = useState<RecentCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, fetch from Supabase
    // For now, use placeholder data
    setStats({
      total: 47,
      completed: 38,
      inProgress: 6,
      pending: 3
    });

    setRecentCases([
      {
        id: '1',
        beneficiaryName: 'John Smith',
        visaType: 'O-1A',
        status: 'completed',
        createdAt: '2025-12-10',
        documentsGenerated: 9
      },
      {
        id: '2',
        beneficiaryName: 'Maria Garcia',
        visaType: 'EB-1A',
        status: 'in_progress',
        createdAt: '2025-12-11',
        documentsGenerated: 5
      },
      {
        id: '3',
        beneficiaryName: 'David Chen',
        visaType: 'P-1A',
        status: 'pending',
        createdAt: '2025-12-12',
        documentsGenerated: 0
      }
    ]);

    setLoading(false);
  }, []);

  const statCards = [
    { label: 'Total Cases', value: stats.total, icon: FileText, color: 'bg-blue-500' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Pending', value: stats.pending, icon: AlertCircle, color: 'bg-red-500' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Completed</span>;
      case 'in_progress':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">In Progress</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Pending</span>;
      default:
        return null;
    }
  };

  const getVisaTypeBadge = (visaType: string) => {
    const colors: Record<string, string> = {
      'O-1A': 'bg-indigo-100 text-indigo-700',
      'O-1B': 'bg-purple-100 text-purple-700',
      'EB-1A': 'bg-pink-100 text-pink-700',
      'P-1A': 'bg-emerald-100 text-emerald-700',
      'EB-2 NIW': 'bg-orange-100 text-orange-700',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[visaType] || 'bg-gray-100 text-gray-700'}`}>{visaType}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-gray-600">Overview of your visa petition cases and activity</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            href="/portal/petitions"
            className="flex items-center gap-3 p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <FileText className="w-5 h-5 text-indigo-600" />
            <span className="font-medium text-indigo-900">New Petition</span>
            <ArrowRight className="w-4 h-4 text-indigo-600 ml-auto" />
          </Link>
          <Link
            href="/portal/exhibits"
            className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <FileText className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-900">Create Exhibits</span>
            <ArrowRight className="w-4 h-4 text-purple-600 ml-auto" />
          </Link>
          <Link
            href="/portal/form-filler"
            className="flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            <FileText className="w-5 h-5 text-emerald-600" />
            <span className="font-medium text-emerald-900">Fill USCIS Forms</span>
            <ArrowRight className="w-4 h-4 text-emerald-600 ml-auto" />
          </Link>
          <Link
            href="/portal/support-letters"
            className="flex items-center gap-3 p-4 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors"
          >
            <FileText className="w-5 h-5 text-pink-600" />
            <span className="font-medium text-pink-900">Support Letter</span>
            <ArrowRight className="w-4 h-4 text-pink-600 ml-auto" />
          </Link>
        </div>
      </div>

      {/* Recent Cases */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Cases</h3>
          <Link href="/portal/documents" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Beneficiary</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Visa Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Documents</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentCases.map((caseItem) => (
                <tr key={caseItem.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{caseItem.beneficiaryName}</td>
                  <td className="py-3 px-4">{getVisaTypeBadge(caseItem.visaType)}</td>
                  <td className="py-3 px-4">{getStatusBadge(caseItem.status)}</td>
                  <td className="py-3 px-4 text-gray-600">{caseItem.documentsGenerated}/9</td>
                  <td className="py-3 px-4 text-gray-600">{caseItem.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Services Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['Claude AI', 'Perplexity', 'OpenAI', 'Mistral OCR', 'Supabase'].map((service) => (
            <div key={service} className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">{service}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
