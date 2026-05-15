import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  X, Plus, Search, Zap, Download, Trash2, Edit3, Check, Copy,
  ChevronDown, ChevronRight, Globe, Lock, Loader2
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const COMMUNITY_SKILLS = [
  {
    name: 'Frontend Design',
    slug: 'frontend-design',
    description: 'Expert frontend developer. Creates beautiful, responsive web pages with modern CSS, animations, and clean HTML structure.',
    prompt: 'You are an expert frontend developer and UI/UX designer. When the user asks you to create a web page or interface:\n1. Use modern HTML5 semantic elements\n2. Apply beautiful CSS with gradients, shadows, smooth transitions, and responsive design\n3. Use a professional color palette\n4. Include hover effects and micro-interactions\n5. Make it fully responsive with flexbox/grid\n6. Add proper typography hierarchy\n7. Include appropriate placeholder content that looks realistic\n8. Output a complete, standalone HTML file that looks professional',
    category: 'development',
    tags: ['html', 'css', 'responsive', 'ui'],
  },
  {
    name: 'Backend API',
    slug: 'backend-api',
    description: 'Expert backend developer. Designs and implements RESTful APIs with proper error handling, validation, and documentation.',
    prompt: 'You are an expert backend developer. When the user asks you to create an API or backend service:\n1. Design clean RESTful endpoints with proper HTTP methods\n2. Include input validation and error handling\n3. Use proper status codes (200, 201, 400, 401, 404, 500)\n4. Add authentication middleware where appropriate\n5. Include CORS configuration\n6. Write clear documentation for each endpoint\n7. Use environment variables for sensitive config\n8. Follow the repository\'s existing patterns and tech stack',
    category: 'development',
    tags: ['api', 'rest', 'backend', 'node'],
  },
  {
    name: 'Landing Page',
    slug: 'landing-page',
    description: 'Creates stunning landing pages optimized for conversion with hero sections, features, testimonials, and CTAs.',
    prompt: 'You are a landing page specialist. Create a complete, beautiful landing page that includes:\n1. A compelling hero section with a headline, subheadline, and CTA button\n2. A features/benefits section with icons or illustrations\n3. Social proof or testimonials section\n4. A pricing section if applicable\n5. A final CTA section\n6. A clean footer with links\n7. Use modern design trends: gradients, glass morphism, subtle animations\n8. Make it fully responsive\n9. Use a cohesive color scheme\n10. Output a complete standalone HTML file',
    category: 'design',
    tags: ['landing', 'marketing', 'conversion'],
  },
  {
    name: 'Code Review',
    slug: 'code-review',
    description: 'Thorough code reviewer. Analyzes code for bugs, performance issues, security vulnerabilities, and best practices.',
    prompt: 'You are a senior code reviewer. When reviewing code:\n1. Check for bugs and logical errors\n2. Identify security vulnerabilities (XSS, injection, etc.)\n3. Evaluate performance (unnecessary loops, memory leaks, N+1 queries)\n4. Check error handling completeness\n5. Assess code readability and naming conventions\n6. Suggest refactoring opportunities\n7. Verify edge cases are handled\n8. Rate severity: Critical, Warning, Suggestion\n9. Provide specific fix suggestions with code examples\n10. Be constructive and educational in feedback',
    category: 'development',
    tags: ['review', 'quality', 'security'],
  },
  {
    name: 'Database Design',
    slug: 'database-design',
    description: 'Database architect. Designs efficient schemas, writes optimized queries, and implements proper indexing strategies.',
    prompt: 'You are a database architect. When designing databases:\n1. Create normalized schemas (3NF unless denormalization is justified)\n2. Use appropriate data types and constraints\n3. Define proper primary keys, foreign keys, and indexes\n4. Include created_at/updated_at timestamps\n5. Design for scalability and query performance\n6. Write efficient SQL queries with proper JOINs\n7. Consider RLS (Row Level Security) policies for multi-tenant apps\n8. Include migration scripts when applicable\n9. Document the schema with comments\n10. Suggest indexing strategies for common query patterns',
    category: 'development',
    tags: ['sql', 'schema', 'database', 'postgresql'],
  },
];

function SkillCard({ skill, onUse, onDelete, onEdit, isOwn, onInstall, isInstalled }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);

  const handleCopySlug = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`@${skill.slug}`);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 1500);
  };

  return (
    <div className="border border-zinc-800 rounded-lg bg-surface hover:border-zinc-700 transition-all">
      <div
        className="flex items-start gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-9 h-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Zap size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200 truncate">{skill.name}</span>
            {skill.is_public ? (
              <Globe size={11} className="text-zinc-500 shrink-0" title="Public" />
            ) : (
              <Lock size={11} className="text-zinc-500 shrink-0" title="Private" />
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{skill.description || 'No description'}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={handleCopySlug}
              className="inline-flex items-center gap-1 text-[10px] font-mono bg-zinc-800 text-primary px-1.5 py-0.5 rounded hover:bg-zinc-700 transition-colors"
              title="Copy @slug"
            >
              {copiedSlug ? <Check size={9} /> : <Copy size={9} />}
              @{skill.slug}
            </button>
            {(skill.tags || []).slice(0, 3).map((t, i) => (
              <span key={i} className="text-[10px] text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded">{t}</span>
            ))}
            {skill.usage_count > 0 && (
              <span className="text-[10px] text-zinc-600">{skill.usage_count} uses</span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-zinc-500">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-zinc-800 p-3 space-y-3 animate-fade-in-up">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Prompt</p>
            <pre className="text-xs text-zinc-400 bg-black/30 rounded-md p-2.5 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono leading-relaxed">
              {skill.prompt}
            </pre>
          </div>
          <div className="flex items-center gap-2">
            {onUse && (
              <button
                onClick={() => onUse(skill)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary-hover transition-colors"
              >
                <Zap size={12} />
                Use in Chat
              </button>
            )}
            {onInstall && !isInstalled && (
              <button
                onClick={() => onInstall(skill)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-500 transition-colors"
              >
                <Download size={12} />
                Install
              </button>
            )}
            {isOwn && onEdit && (
              <button
                onClick={() => onEdit(skill)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-zinc-700 text-zinc-400 text-xs rounded-md hover:text-zinc-200 hover:border-zinc-600 transition-colors"
              >
                <Edit3 size={12} />
                Edit
              </button>
            )}
            {isOwn && onDelete && (
              <button
                onClick={() => onDelete(skill.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-zinc-700 text-zinc-400 text-xs rounded-md hover:text-red-400 hover:border-red-800 transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateSkillForm({ onSubmit, onCancel, initialData }) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [prompt, setPrompt] = useState(initialData?.prompt || '');
  const [category, setCategory] = useState(initialData?.category || 'custom');
  const [tags, setTags] = useState((initialData?.tags || []).join(', '));
  const [isPublic, setIsPublic] = useState(initialData?.is_public || false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !prompt.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      prompt: prompt.trim(),
      category,
      is_public: isPublic,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Name *</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Frontend Design"
          className="w-full bg-black/30 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-primary/50 placeholder-zinc-600"
          required
        />
        {name && (
          <p className="text-[10px] text-zinc-600 mt-1 font-mono">Slug: @{name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}</p>
        )}
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Description</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Brief description of what this skill does"
          className="w-full bg-black/30 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-primary/50 placeholder-zinc-600"
        />
      </div>
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Prompt Instructions *</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="The instructions that will be injected when @skill-name is used..."
          rows={6}
          className="w-full bg-black/30 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-primary/50 placeholder-zinc-600 resize-none font-mono"
          required
          style={{ fontSize: '13px' }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-black/30 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-primary/50"
          >
            <option value="custom">Custom</option>
            <option value="development">Development</option>
            <option value="design">Design</option>
            <option value="writing">Writing</option>
            <option value="analysis">Analysis</option>
            <option value="devops">DevOps</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Tags (comma separated)</label>
          <input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="html, css, react"
            className="w-full bg-black/30 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-primary/50 placeholder-zinc-600"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={e => setIsPublic(e.target.checked)}
          className="w-4 h-4 rounded border-zinc-700 bg-black/30 text-primary focus:ring-primary/30"
        />
        <span className="text-xs text-zinc-400">Make this skill public (visible to all users)</span>
      </label>
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-hover transition-colors"
        >
          {initialData ? 'Update Skill' : 'Create Skill'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-zinc-700 text-zinc-400 text-sm rounded-md hover:text-zinc-200 hover:border-zinc-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function SkillsPanel({ isOpen, onClose, onUseSkill }) {
  const { getAccessToken } = useAuth();
  const [ownSkills, setOwnSkills] = useState([]);
  const [publicSkills, setPublicSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('my');
  const [showCreate, setShowCreate] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);

  const authHeaders = useCallback(() => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API}/api/skills`, { headers: authHeaders() });
      if (resp.ok) {
        const data = await resp.json();
        setOwnSkills(data.own || []);
        setPublicSkills(data.public || []);
      }
    } catch {}
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => {
    if (isOpen) loadSkills();
  }, [isOpen, loadSkills]);

  const createSkill = async (data) => {
    try {
      const resp = await fetch(`${API}/api/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
      });
      if (resp.ok) {
        setShowCreate(false);
        loadSkills();
      } else {
        const err = await resp.json();
        alert(err.detail || 'Failed to create skill');
      }
    } catch {}
  };

  const updateSkill = async (data) => {
    if (!editingSkill) return;
    try {
      const resp = await fetch(`${API}/api/skills/${editingSkill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
      });
      if (resp.ok) {
        setEditingSkill(null);
        loadSkills();
      }
    } catch {}
  };

  const deleteSkill = async (skillId) => {
    if (!window.confirm('Delete this skill?')) return;
    try {
      await fetch(`${API}/api/skills/${skillId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      loadSkills();
    } catch {}
  };

  const installCommunitySkill = async (skill) => {
    await createSkill({
      name: skill.name,
      description: skill.description,
      prompt: skill.prompt,
      category: skill.category,
      tags: skill.tags,
      is_public: false,
    });
  };

  const ownSlugs = new Set(ownSkills.map(s => s.slug));

  const filteredOwn = searchQuery
    ? ownSkills.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.slug.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ownSkills;

  const filteredPublic = searchQuery
    ? publicSkills.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.slug.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : publicSkills;

  const filteredCommunity = searchQuery
    ? COMMUNITY_SKILLS.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : COMMUNITY_SKILLS;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-2xl max-h-[85vh] bg-bg border border-zinc-800 rounded-xl shadow-2xl flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <Zap size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-zinc-200">Skills</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Search + Actions */}
        <div className="px-5 py-3 border-b border-zinc-800 shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-surface border border-zinc-800 rounded-md px-3 py-2">
              <Search size={14} className="text-zinc-500 shrink-0" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search skills..."
                className="flex-1 bg-transparent text-sm text-zinc-200 focus:outline-none placeholder-zinc-600"
              />
            </div>
            <button
              onClick={() => { setShowCreate(true); setEditingSkill(null); setTab('my'); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary-hover transition-colors shrink-0"
            >
              <Plus size={14} />
              Create
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-surface rounded-md p-0.5">
            {[
              { key: 'my', label: `My Skills (${ownSkills.length})` },
              { key: 'community', label: 'Community' },
              { key: 'public', label: `Public (${publicSkills.length})` },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  tab === t.key
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-hide">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          ) : showCreate || editingSkill ? (
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-3">
                {editingSkill ? 'Edit Skill' : 'Create New Skill'}
              </h3>
              <CreateSkillForm
                initialData={editingSkill}
                onSubmit={editingSkill ? updateSkill : createSkill}
                onCancel={() => { setShowCreate(false); setEditingSkill(null); }}
              />
            </div>
          ) : tab === 'my' ? (
            filteredOwn.length > 0 ? (
              filteredOwn.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  isOwn
                  onUse={onUseSkill}
                  onDelete={deleteSkill}
                  onEdit={s => { setEditingSkill(s); setShowCreate(false); }}
                />
              ))
            ) : (
              <div className="text-center py-10 space-y-3">
                <Zap size={32} className="text-zinc-700 mx-auto" />
                <p className="text-sm text-zinc-500">No skills yet</p>
                <p className="text-xs text-zinc-600">Create your own or install from the Community tab</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary-hover transition-colors"
                >
                  <Plus size={14} />
                  Create Your First Skill
                </button>
              </div>
            )
          ) : tab === 'community' ? (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">Pre-built skills you can install. Click Install to add to your collection.</p>
              {filteredCommunity.map(skill => (
                <SkillCard
                  key={skill.slug}
                  skill={skill}
                  isOwn={false}
                  isInstalled={ownSlugs.has(skill.slug)}
                  onInstall={installCommunitySkill}
                  onUse={ownSlugs.has(skill.slug) ? onUseSkill : null}
                />
              ))}
            </div>
          ) : (
            filteredPublic.length > 0 ? (
              filteredPublic.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  isOwn={false}
                  onUse={onUseSkill}
                />
              ))
            ) : (
              <div className="text-center py-10 space-y-2">
                <Globe size={32} className="text-zinc-700 mx-auto" />
                <p className="text-sm text-zinc-500">No public skills from other users yet</p>
              </div>
            )
          )}
        </div>

        {/* Footer help */}
        <div className="px-5 py-3 border-t border-zinc-800 shrink-0">
          <p className="text-[11px] text-zinc-600">
            Use <code className="text-primary bg-zinc-800 px-1 py-0.5 rounded font-mono">@skill-name</code> in chat to apply a skill.
            Type <code className="text-primary bg-zinc-800 px-1 py-0.5 rounded font-mono">/skills</code> to open this panel or
            <code className="text-primary bg-zinc-800 px-1 py-0.5 rounded font-mono">/createskill</code> to create a new one.
          </p>
        </div>
      </div>
    </div>
  );
}
