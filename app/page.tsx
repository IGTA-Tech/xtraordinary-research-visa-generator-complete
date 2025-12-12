import Link from 'next/link';
import {
  FileText,
  FolderOpen,
  ClipboardList,
  Mail,
  Calendar,
  Handshake,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: '9-Document Petition Generator',
    description: 'Comprehensive analysis, legal brief, cover letter, and more - 190+ pages',
    href: '/portal/petitions',
    color: 'bg-indigo-500'
  },
  {
    icon: FolderOpen,
    title: 'Exhibit Package Maker',
    description: 'Auto-numbered exhibits with Table of Contents and archive.org preservation',
    href: '/portal/exhibits',
    color: 'bg-purple-500'
  },
  {
    icon: ClipboardList,
    title: 'USCIS Form Filler',
    description: 'Auto-fill I-129, G-28, I-907, and O/P Supplement forms',
    href: '/portal/form-filler',
    color: 'bg-emerald-500'
  },
  {
    icon: Mail,
    title: 'Support Letter Generator',
    description: 'Expert opinion letters with multi-step wizard and DocuSign integration',
    href: '/portal/support-letters',
    color: 'bg-pink-500'
  },
  {
    icon: Calendar,
    title: 'Itinerary Builder',
    description: 'Event-based itineraries for P-1A, O-1A, and O-1B petitions',
    href: '/portal/itineraries',
    color: 'bg-orange-500'
  },
  {
    icon: Handshake,
    title: 'Deal Memos & Agreements',
    description: 'Generate representation agreements, sponsorship docs, and more',
    href: '/portal/agreements',
    color: 'bg-cyan-500'
  }
];

const visaTypes = [
  { name: 'O-1A', desc: 'Extraordinary Ability', color: 'bg-indigo-100 text-indigo-700' },
  { name: 'O-1B', desc: 'Arts & Entertainment', color: 'bg-purple-100 text-purple-700' },
  { name: 'P-1A', desc: 'Athletes', color: 'bg-emerald-100 text-emerald-700' },
  { name: 'EB-1A', desc: 'Green Card', color: 'bg-pink-100 text-pink-700' },
  { name: 'EB-2 NIW', desc: 'National Interest', color: 'bg-orange-100 text-orange-700' }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <header className="bg-white shadow-lg border-b-4 border-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-indigo-600" />
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Xtraordinary Research Visa Generator
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl">
            The complete AI-powered platform for generating professional visa petition packages.
            9 documents, USCIS forms, exhibits, support letters - all in one place.
          </p>

          {/* Visa Type Badges */}
          <div className="mt-6 flex gap-3 flex-wrap">
            {visaTypes.map((visa) => (
              <div key={visa.name} className={`px-4 py-2 rounded-lg ${visa.color}`}>
                <span className="font-bold">{visa.name}</span>
                <span className="text-sm ml-2 opacity-75">{visa.desc}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="mt-8">
            <Link
              href="/portal/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
            >
              Enter Portal
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Complete Visa Petition Toolkit</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                href={feature.href}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-indigo-300 transition-all group"
              >
                <div className={`${feature.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mt-2">{feature.description}</p>
                <div className="mt-4 flex items-center text-indigo-600 font-medium">
                  Get started
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="mt-16 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Platform Capabilities</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-indigo-600">9</div>
              <div className="text-gray-600">Documents Generated</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600">190+</div>
              <div className="text-gray-600">Pages Per Package</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-600">4</div>
              <div className="text-gray-600">USCIS Forms Filled</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-pink-600">5</div>
              <div className="text-gray-600">AI Services</div>
            </div>
          </div>
        </div>

        {/* AI Services */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Powered By</h3>
          <div className="flex justify-center gap-6 flex-wrap">
            {['Claude AI', 'Perplexity', 'OpenAI', 'Mistral OCR', 'Supabase'].map((service) => (
              <div key={service} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">{service}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600">
              <strong>Xtraordinary Research Visa Generator</strong> - Complete AI-Powered Platform
            </p>
            <div className="flex gap-4 text-sm text-gray-500">
              <a href="https://extraordinarypetitions.team" className="hover:text-indigo-600">Live Portal</a>
              <a href="https://github.com/IGTA-Tech/xtraordinary-research-visa-generator-complete" className="hover:text-indigo-600">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
