'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Search, Filter, FolderOpen, Eye, Trash2, Calendar } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: 'petition' | 'exhibit' | 'form' | 'letter' | 'agreement';
  caseName: string;
  beneficiary: string;
  visaType: string;
  createdAt: string;
  size: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    // In production, fetch from Supabase
    // For now, use placeholder data
    setDocuments([
      {
        id: '1',
        name: 'Comprehensive Analysis - John Smith',
        type: 'petition',
        caseName: 'Smith_O1A_2025',
        beneficiary: 'John Smith',
        visaType: 'O-1A',
        createdAt: '2025-12-10',
        size: '2.4 MB'
      },
      {
        id: '2',
        name: 'Exhibit Package - Maria Garcia',
        type: 'exhibit',
        caseName: 'Garcia_EB1A_2025',
        beneficiary: 'Maria Garcia',
        visaType: 'EB-1A',
        createdAt: '2025-12-11',
        size: '15.8 MB'
      },
      {
        id: '3',
        name: 'I-129 Form - David Chen',
        type: 'form',
        caseName: 'Chen_P1A_2025',
        beneficiary: 'David Chen',
        visaType: 'P-1A',
        createdAt: '2025-12-11',
        size: '1.2 MB'
      },
      {
        id: '4',
        name: 'Expert Letter - Dr. Williams',
        type: 'letter',
        caseName: 'Smith_O1A_2025',
        beneficiary: 'John Smith',
        visaType: 'O-1A',
        createdAt: '2025-12-09',
        size: '245 KB'
      },
      {
        id: '5',
        name: 'Deal Memo - XYZ Sports',
        type: 'agreement',
        caseName: 'Chen_P1A_2025',
        beneficiary: 'David Chen',
        visaType: 'P-1A',
        createdAt: '2025-12-08',
        size: '156 KB'
      }
    ]);
    setLoading(false);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'petition':
        return <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-indigo-600" /></div>;
      case 'exhibit':
        return <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><FolderOpen className="w-5 h-5 text-purple-600" /></div>;
      case 'form':
        return <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-emerald-600" /></div>;
      case 'letter':
        return <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-pink-600" /></div>;
      case 'agreement':
        return <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-orange-600" /></div>;
      default:
        return <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-gray-600" /></div>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      petition: 'bg-indigo-100 text-indigo-700',
      exhibit: 'bg-purple-100 text-purple-700',
      form: 'bg-emerald-100 text-emerald-700',
      letter: 'bg-pink-100 text-pink-700',
      agreement: 'bg-orange-100 text-orange-700'
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${colors[type] || 'bg-gray-100 text-gray-700'}`}>{type}</span>;
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.beneficiary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.caseName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || doc.type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
        <p className="mt-1 text-gray-600">
          View and manage all generated documents
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Search documents, cases, or beneficiaries..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="petition">Petitions</option>
              <option value="exhibit">Exhibits</option>
              <option value="form">Forms</option>
              <option value="letter">Letters</option>
              <option value="agreement">Agreements</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>No documents found</p>
            <p className="text-sm">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                {getTypeIcon(doc.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <span>{doc.caseName}</span>
                    <span>-</span>
                    <span>{doc.beneficiary}</span>
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{doc.visaType}</span>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {doc.createdAt}
                  </div>
                  <div className="mt-1">{doc.size}</div>
                </div>
                <div className="flex items-center gap-2">
                  {getTypeBadge(doc.type)}
                  <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['petition', 'exhibit', 'form', 'letter', 'agreement'].map((type) => {
          const count = documents.filter(d => d.type === type).length;
          return (
            <div key={type} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-600 capitalize">{type}s</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
