import React, { useState, useMemo } from 'react';
import { FieldResource, ResourceCategory, User } from '../types';
import { 
  BookOpen, 
  Search, 
  FileText, 
  Video, 
  ExternalLink, 
  Download, 
  Clock,
  Info,
  ArrowLeft
} from 'lucide-react';

interface FieldResourcesViewProps {
  user: User;
  onBack: () => void;
}

const FieldResourcesView: React.FC<FieldResourcesViewProps> = ({ user, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | 'all'>('all');

  const filteredResources = useMemo(() => {
    return ([] as FieldResource[]).filter(resource => {
      const matchesSearch = 
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
      const matchesRole = resource.visibleToRoles.includes(user.role);

      return matchesSearch && matchesCategory && matchesRole;
    });
  }, [searchTerm, selectedCategory, user.role]);

  const categories = Object.values(ResourceCategory);

  const getFileTypeIcon = (type: FieldResource['fileType']) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-rose-500" />;
      case 'video': return <Video className="w-5 h-5 text-blue-500" />;
      case 'image': return <BookOpen className="w-5 h-5 text-emerald-500" />;
      default: return <ExternalLink className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 bg-[var(--bg-primary)] min-h-screen text-[var(--text-primary)] transition-colors duration-300">
      <button 
        onClick={onBack}
        className="mb-8 flex items-center gap-2 font-label transition-all group"
      >
        <div className="h-8 w-8 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all">
          <ArrowLeft size={14} />
        </div>
        Back to Dashboard
      </button>

      <header className="mb-10">
        <div className="flex items-center gap-4 mb-2">
          <div className="h-12 w-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <BookOpen className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-display leading-none">Field Resources Hub</h1>
            <p className="font-label mt-2">Luxury Decking • Internal Reference Library</p>
          </div>
        </div>
      </header>

      {/* Search and Filter */}
      <div className="space-y-6 mb-10">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text"
            placeholder="Search resources, SOPs, handbooks..."
            className="w-full pl-12 pr-4 py-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[2rem] shadow-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all font-bold text-sm placeholder:text-[var(--text-secondary)]/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-6 py-2.5 rounded-2xl font-label transition-all whitespace-nowrap border ${
              selectedCategory === 'all' 
                ? 'bg-emerald-600 text-black border-emerald-600 shadow-lg shadow-emerald-600/20' 
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-secondary)]/80 hover:text-[var(--text-primary)]'
            }`}
          >
            All Resources
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-2xl font-label transition-all whitespace-nowrap border ${
                selectedCategory === cat 
                  ? 'bg-emerald-600 text-black border-emerald-600 shadow-lg shadow-emerald-600/20' 
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-secondary)]/80 hover:text-[var(--text-primary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Resources List */}
      <div className="space-y-4">
        {filteredResources.length > 0 ? (
          filteredResources.map((resource) => (
            <div 
              key={resource.id}
              className="card-base p-8 group"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex gap-6">
                  <div className="h-14 w-14 rounded-2xl bg-[var(--bg-primary)]/5 border border-[var(--border-color)] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    {getFileTypeIcon(resource.fileType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        {resource.category}
                      </span>
                      <span className="font-label opacity-60 flex items-center gap-1">
                        <Clock size={10} /> Updated {resource.updatedAt}
                      </span>
                    </div>
                    <h3 className="text-xl font-display mb-2">{resource.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] font-medium leading-relaxed max-w-xl">{resource.description}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button className="p-3.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl hover:bg-emerald-500 transition-all active:scale-95 shadow-xl">
                    <Download size={20} />
                  </button>
                  <button className="p-3.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded-2xl hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/80 transition-all active:scale-95">
                    <ExternalLink size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-24 bg-[var(--bg-secondary)]/50 rounded-[3rem] border border-dashed border-[var(--border-color)]">
            <div className="h-20 w-20 bg-[var(--bg-primary)]/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="text-[var(--text-secondary)] w-10 h-10" />
            </div>
            <p className="font-label text-sm">No resources found</p>
            <p className="font-label opacity-80 mt-2">Try adjusting your search or category filter</p>
          </div>
        )}
      </div>

      {/* Field Support Note */}
      <div className="mt-16 p-8 bg-emerald-500/5 rounded-[2.5rem] border border-emerald-500/10 flex items-start gap-6">
        <div className="h-12 w-12 bg-[var(--bg-primary)]/5 border border-[var(--border-color)] rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
          <Info className="text-emerald-500 w-6 h-6" />
        </div>
        <div>
          <h4 className="font-label text-emerald-500 mb-2">Field Support</h4>
          <p className="text-xs text-[var(--text-secondary)]/80 font-medium leading-relaxed">
            These resources are for internal reference only. If you find a discrepancy between these standards and your specific job plans, contact your Project Manager immediately.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FieldResourcesView;
