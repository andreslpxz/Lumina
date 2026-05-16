import React, { useState, useEffect } from 'react';
import {
  X, Settings, Cpu, Sliders, Zap, Layout, User, Trash2,
  Download, Upload, Save, Check, AlertCircle, Globe, ChevronRight,
  ExternalLink, Moon, Sun, Monitor
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const PROVIDERS = [
  { id: 'groq', name: 'Groq', desc: 'Ultra-fast inference (LPU)' },
  { id: 'openai', name: 'OpenAI', desc: 'GPT-4o, o1, o3...' },
  { id: 'anthropic', name: 'Anthropic', desc: 'Claude Sonnet / Opus' },
  { id: 'openrouter', name: 'OpenRouter', desc: 'Multi-model gateway' },
  { id: 'deepseek', name: 'DeepSeek', desc: 'DeepSeek-V3 / R1' },
  { id: 'mistral', name: 'Mistral AI', desc: 'Mixtral, Mistral-Large' },
  { id: 'google', name: 'Gemini', desc: 'Google Gemini Pro/Flash' },
  { id: 'nvidia', name: 'NVIDIA', desc: 'NVIDIA NIMs' },
];

const LANGUAGES = [
  { id: 'es', name: 'Español' },
  { id: 'en', name: 'English' },
  { id: 'pt', name: 'Português' },
  { id: 'fr', name: 'Français' },
  { id: 'de', name: 'Deutsch' },
  { id: 'ja', name: '日本語' },
  { id: 'zh', name: '中文' },
];

export default function SettingsPanel({ isOpen, onClose }) {
  const { user, getAccessToken, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('models');
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [skillUrl, setSkillUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch(`${API}/api/auth/settings`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings = settings) => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const resp = await fetch(`${API}/api/auth/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify(newSettings)
      });
      if (resp.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    // Auto-save for some UI settings, manual for others?
    // Let's do manual for now to be safe with API calls.
  };

  const handleSkillToggle = (key) => {
    const updated = {
      ...settings,
      skills: { ...settings.skills, [key]: !settings.skills[key] }
    };
    setSettings(updated);
  };

  const handleInstallSkill = async () => {
    if (!skillUrl) return;
    setIsSaving(true);
    try {
      const resp = await fetch(`${API}/api/skills/install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ url: skillUrl })
      });
      if (resp.ok) {
        setSkillUrl('');
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("¿Estás seguro de que quieres borrar todo el historial? Esta acción no se puede deshacer.")) return;
    try {
      // Logic to clear all chats
      const chatsResp = await fetch(`${API}/api/chats`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      });
      if (chatsResp.ok) {
        const chats = await chatsResp.json();
        for (const chat of chats) {
          await fetch(`${API}/api/chats/${chat.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getAccessToken()}` }
          });
        }
        window.location.reload();
      }
    } catch (err) {
      alert("Error al borrar el historial");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-bg border-l border-zinc-800 animate-in slide-in-from-right duration-300 w-full md:w-[400px] lg:w-[450px]">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-zinc-400" />
          <h2 className="font-semibold text-zinc-200">Ajustes</h2>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-zinc-800"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tabs */}
        <div className="w-12 border-r border-zinc-800 flex flex-col items-center py-4 gap-4 shrink-0">
          <TabIcon id="models" icon={<Cpu size={20} />} active={activeTab} onClick={setActiveTab} title="Modelos" />
          <TabIcon id="advanced" icon={<Sliders size={20} />} active={activeTab} onClick={setActiveTab} title="Parámetros" />
          <TabIcon id="skills" icon={<Zap size={20} />} active={activeTab} onClick={setActiveTab} title="Skills" />
          <TabIcon id="ui" icon={<Layout size={20} />} active={activeTab} onClick={setActiveTab} title="Interfaz" />
          <TabIcon id="account" icon={<User size={20} />} active={activeTab} onClick={setActiveTab} title="Cuenta" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {activeTab === 'models' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-200 mb-4">Proveedor</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {PROVIDERS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleChange('provider', p.id)}
                          className={`flex items-center justify-between p-3 rounded-md border transition-all text-left ${
                            settings?.provider === p.id
                              ? 'bg-primary/10 border-primary text-white'
                              : 'bg-surface border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-[10px] opacity-60">{p.desc}</p>
                          </div>
                          {settings?.provider === p.id && <Check size={14} className="text-primary" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-zinc-200 mb-2">Modelo</h3>
                    <input
                      type="text"
                      value={settings?.model || ''}
                      onChange={(e) => handleChange('model', e.target.value)}
                      placeholder="gpt-4o, claude-3-5-sonnet, llama-3.3-70b..."
                      className="w-full bg-surface border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-primary/50"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1.5">Escribe el nombre técnico del modelo que deseas utilizar.</p>
                  </div>
                </div>
              )}

              {activeTab === 'advanced' && (
                <div className="space-y-8">
                  <div className="bg-amber-900/10 border border-amber-900/30 rounded-md p-3 flex gap-3">
                    <AlertCircle size={16} className="text-amber-500 shrink-0" />
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      Se recomienda alterar Temperatura o Top-P, pero no ambos al mismo tiempo para obtener resultados predecibles.
                    </p>
                  </div>

                  <SliderField
                    label="Temperatura"
                    value={settings?.temperature}
                    min={0} max={2} step={0.1}
                    onChange={(v) => handleChange('temperature', v)}
                    desc="Controla la creatividad. 0.7 es equilibrado."
                  />

                  <SliderField
                    label="Top-P"
                    value={settings?.top_p}
                    min={0} max={1} step={0.05}
                    onChange={(v) => handleChange('top_p', v)}
                    desc="Diversidad vía probabilidad acumulada. 0.9 es estándar."
                  />

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-zinc-200">Límite de Tokens</label>
                      <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{settings?.max_tokens}</span>
                    </div>
                    <input
                      type="range"
                      min="1" max="8192" step="1"
                      value={settings?.max_tokens || 4096}
                      onChange={(e) => handleChange('max_tokens', parseInt(e.target.value))}
                      className="w-full accent-primary bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-[10px] text-zinc-500">Define el tamaño máximo de la respuesta generada.</p>
                  </div>
                </div>
              )}

              {activeTab === 'skills' && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-zinc-200">Herramientas del Sistema</h3>
                    <div className="space-y-2">
                      <ToggleField
                        label="Acceso a Internet"
                        enabled={settings?.skills?.internet}
                        onToggle={() => handleSkillToggle('internet')}
                      />
                      <ToggleField
                        label="Ejecución de Código (Sandbox)"
                        enabled={settings?.skills?.sandbox}
                        onToggle={() => handleSkillToggle('sandbox')}
                      />
                      <ToggleField
                        label="Manejo de Archivos Locales"
                        enabled={settings?.skills?.files}
                        onToggle={() => handleSkillToggle('files')}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <h3 className="text-sm font-medium text-zinc-200">Instalar Skills</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={skillUrl}
                        onChange={(e) => setSkillUrl(e.target.value)}
                        placeholder="URL de GitHub o skills.sh..."
                        className="flex-1 bg-surface border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-primary/50"
                      />
                      <button
                        onClick={handleInstallSkill}
                        disabled={!skillUrl || isSaving}
                        className="bg-primary hover:bg-primary-hover text-white px-3 py-2 rounded-md disabled:opacity-50 transition-colors"
                      >
                        <PlusIcon size={16} />
                      </button>
                    </div>
                    <a
                      href="https://skills.sh"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-primary transition-colors"
                    >
                      Explorar skills en skills.sh <ExternalLink size={10} />
                    </a>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-zinc-800">
                    <h3 className="text-sm font-medium text-zinc-200">System Prompt (Personalidad)</h3>
                    <textarea
                      value={settings?.system_prompt || "Eres Lumina, una IA autónoma..."}
                      onChange={(e) => handleChange('system_prompt', e.target.value)}
                      rows={4}
                      className="w-full bg-surface border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-primary/50 resize-none font-mono"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'ui' && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-zinc-200">Tema</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <ThemeBtn icon={<Moon size={16}/>} label="Oscuro" active={settings?.theme === 'dark'} onClick={() => handleChange('theme', 'dark')} />
                      <ThemeBtn icon={<Sun size={16}/>} label="Claro" active={settings?.theme === 'light'} onClick={() => handleChange('theme', 'light')} />
                      <ThemeBtn icon={<Monitor size={16}/>} label="Sistema" active={settings?.theme === 'system'} onClick={() => handleChange('theme', 'system')} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-zinc-200">Idioma de Interfaz</h3>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map(lang => (
                        <button
                          key={lang.id}
                          onClick={() => handleChange('language', lang.id)}
                          className={`px-3 py-1.5 rounded-md text-xs border transition-all ${
                            settings?.language === lang.id
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-surface border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800">
                    <ToggleField
                      label="Enter para enviar"
                      enabled={settings?.enter_to_send}
                      onToggle={() => handleChange('enter_to_send', !settings?.enter_to_send)}
                      desc="Shift+Enter para nueva línea"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="space-y-8">
                  <div className="flex items-center gap-4 p-4 bg-surface border border-zinc-800 rounded-lg">
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-400">
                      {user?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-200 truncate">{user?.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-zinc-200">Gestión de Datos</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="flex items-center justify-center gap-2 px-3 py-2 bg-surface border border-zinc-800 rounded-md text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                        <Download size={14} /> Exportar JSON
                      </button>
                      <button className="flex items-center justify-center gap-2 px-3 py-2 bg-surface border border-zinc-800 rounded-md text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                        <Upload size={14} /> Importar JSON
                      </button>
                    </div>
                    <button
                      onClick={handleClearHistory}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-950/20 border border-red-900/30 rounded-md text-xs text-red-400 hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 size={14} /> Borrar todo el historial
                    </button>
                  </div>

                  <div className="pt-4 border-t border-zinc-800">
                    <button
                      onClick={logout}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md text-sm transition-all font-medium"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer / Save Actions */}
      <div className="p-4 border-t border-zinc-800 bg-surface/50 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-1.5 text-emerald-500 text-xs animate-fade-in">
              <Check size={14} /> Guardado
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-red-500 text-xs animate-fade-in">
              <AlertCircle size={14} /> Error
            </div>
          )}
        </div>
        <button
          onClick={() => saveSettings()}
          disabled={isSaving || isLoading}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-md text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}

function TabIcon({ id, icon, active, onClick, title }) {
  return (
    <button
      onClick={() => onClick(id)}
      title={title}
      className={`p-2 rounded-lg transition-all ${
        active === id
          ? 'bg-primary/20 text-primary shadow-lg shadow-primary/10'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
      }`}
    >
      {icon}
    </button>
  );
}

function SliderField({ label, value, min, max, step, onChange, desc }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-zinc-200">{label}</label>
        <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{value}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value || 0}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary bg-zinc-800 h-1 rounded-lg appearance-none cursor-pointer"
      />
      {desc && <p className="text-[10px] text-zinc-500">{desc}</p>}
    </div>
  );
}

function ToggleField({ label, enabled, onToggle, desc }) {
  return (
    <div className="flex items-center justify-between group">
      <div>
        <p className="text-xs font-medium text-zinc-300 group-hover:text-zinc-200 transition-colors">{label}</p>
        {desc && <p className="text-[10px] text-zinc-600">{desc}</p>}
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
          enabled ? 'bg-primary' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function ThemeBtn({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-2 rounded-md border transition-all ${
        active
          ? 'bg-primary/10 border-primary text-primary'
          : 'bg-surface border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function PlusIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
