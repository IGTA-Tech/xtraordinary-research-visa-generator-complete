'use client';

import { useState, useCallback } from 'react';
import { Upload, FolderOpen, Link as LinkIcon, FileText, Download, Trash2, GripVertical, ExternalLink } from 'lucide-react';

interface Exhibit {
  id: string;
  name: string;
  type: 'file' | 'url';
  source: string;
  size?: string;
  archived?: boolean;
  archiveUrl?: string;
}

export default function ExhibitsPage() {
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [urls, setUrls] = useState('');
  const [caseName, setCaseName] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [numberingStyle, setNumberingStyle] = useState<'letters' | 'numbers' | 'roman'>('letters');
  const [generating, setGenerating] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newExhibits: Exhibit[] = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      type: 'file',
      source: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
    }));

    setExhibits([...exhibits, ...newExhibits]);
  };

  const handleAddUrls = async () => {
    if (!urls.trim()) return;

    setArchiving(true);

    const urlList = urls.split('\n').filter(u => u.trim());
    const newExhibits: Exhibit[] = urlList.map(url => ({
      id: Date.now().toString() + Math.random(),
      name: new URL(url.trim()).hostname,
      type: 'url',
      source: url.trim(),
      archived: false
    }));

    // Simulate archive.org preservation
    await new Promise(resolve => setTimeout(resolve, 1500));

    const archivedExhibits = newExhibits.map(e => ({
      ...e,
      archived: true,
      archiveUrl: `https://web.archive.org/web/${new Date().toISOString().split('T')[0].replace(/-/g, '')}/${e.source}`
    }));

    setExhibits([...exhibits, ...archivedExhibits]);
    setUrls('');
    setArchiving(false);
  };

  const removeExhibit = (id: string) => {
    setExhibits(exhibits.filter(e => e.id !== id));
  };

  const getExhibitLabel = (index: number) => {
    switch (numberingStyle) {
      case 'letters':
        return String.fromCharCode(65 + index); // A, B, C...
      case 'numbers':
        return (index + 1).toString(); // 1, 2, 3...
      case 'roman':
        const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
        return romanNumerals[index] || (index + 1).toString();
      default:
        return String.fromCharCode(65 + index);
    }
  };

  const handleGenerate = async () => {
    if (!caseName || !beneficiaryName || exhibits.length === 0) {
      alert('Please fill in case name, beneficiary name, and add at least one exhibit');
      return;
    }

    setGenerating(true);
    // In production, call API to generate exhibit package
    await new Promise(resolve => setTimeout(resolve, 3000));
    setGenerating(false);
    alert('Exhibit package generated! Download will start shortly.');
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Exhibit Maker</h2>
        <p className="mt-1 text-gray-600">
          Create professional numbered exhibit packages with Table of Contents
        </p>
      </div>

      {/* Case Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Case Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Case Name</label>
            <input
              type="text"
              value={caseName}
              onChange={(e) => setCaseName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Smith_O1A_2025"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary Name</label>
            <input
              type="text"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numbering Style</label>
            <select
              value={numberingStyle}
              onChange={(e) => setNumberingStyle(e.target.value as 'letters' | 'numbers' | 'roman')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="letters">Letters (A, B, C...)</option>
              <option value="numbers">Numbers (1, 2, 3...)</option>
              <option value="roman">Roman (I, II, III...)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* File Upload */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Files</h3>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500">PDF, DOCX, JPG, PNG</p>
            </div>
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.docx,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* URL Input */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add URLs</h3>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-20"
            placeholder="Paste URLs (one per line)"
          />
          <button
            onClick={handleAddUrls}
            disabled={archiving || !urls.trim()}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {archiving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Archiving...
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4" />
                Add & Archive URLs
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2">URLs are automatically preserved on archive.org</p>
        </div>
      </div>

      {/* Exhibits List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Exhibits ({exhibits.length})</h3>
          {exhibits.length > 0 && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate Package
                </>
              )}
            </button>
          )}
        </div>

        {exhibits.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>No exhibits added yet</p>
            <p className="text-sm">Upload files or add URLs above to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {exhibits.map((exhibit, index) => (
              <div
                key={exhibit.id}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <span className="font-bold text-indigo-600">{getExhibitLabel(index)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{exhibit.name}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {exhibit.type === 'file' ? (
                      <>
                        <FileText className="w-3 h-3" />
                        {exhibit.size}
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-3 h-3" />
                        <a href={exhibit.source} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 truncate max-w-xs">
                          {exhibit.source}
                        </a>
                        {exhibit.archived && (
                          <a href={exhibit.archiveUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeExhibit(exhibit.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Exhibit Organization Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>- Name files clearly (e.g., "01_Resume_John_Smith.pdf")</li>
          <li>- Group related documents together</li>
          <li>- For O-1A/EB-1A, organize by criterion (Awards, Publications, Judging, etc.)</li>
          <li>- URLs are automatically archived to archive.org for long-term preservation</li>
        </ul>
      </div>
    </div>
  );
}
