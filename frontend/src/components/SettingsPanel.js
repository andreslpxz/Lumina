import React, { useState, useEffect, useRef } from 'react';
import {
  X, Settings, Cpu, Sliders, Zap, Layout, User, Trash2,
  Download, Upload, Check, AlertCircle,
  Moon, Sun, Monitor, Plus as PlusIcon, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';

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
];

export default function SettingsPanel({ isOpen, onClose }) {
  const { user, getAccessToken, logout } = useAuth();
  const { settings, updateSettings, loading: isLoading } = useSettings();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('models');
  const [localSettings, setLocalSettings] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [skillUrl, setSkillUrl] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (settings) {
      setLocalSettings({ ...settings });
    }
  }, [settings, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    const success = await updateSettings(localSettings);
    if (success) {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveStatus('error');
    }
    setIsSaving(false);
  };

  const handleChange = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleApiKeyChange = (providerId, value) => {
    setLocalSettings(prev => ({
      ...prev,
      api_keys: { ...prev.api_keys, [providerId]: value }
    }));
  };

  const handleSkillToggle = (key) => {
    setLocalSettings(prev => ({
      ...prev,
      skills: { ...prev.skills, [key]: !prev.skills[key] }
    }));
  };

  const handleExport = async () => {
    try {
      const token = getAccessToken();
      const [chatsResp, skillsResp] = await Promise.all([
        fetch(`${API}/api/chats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/skills`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const chatsData = await chatsResp.json();
      const fullChats = await Promise.all(chatsData.map(async (c) => {
        const r = await fetch(`${API}/api/chats/${c.id}`, { headers: { Authorization: `Bearer ${token}` } });
        return r.json();
      }));

      const exportData = {
        settings: localSettings,
        chats: fullChats,
        skills: await skillsResp.json(),
        version: "1.0",
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumina_backup_${new Date().getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error al exportar datos");
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.settings || !data.chats) {
          alert("Archivo JSON no válido");
          return;
        }

        if (!window.confirm("Esto importará la configuración y los chats. ¿Continuar?")) return;

        const token = getAccessToken();
        await updateSettings(data.settings);

        for (const chat of data.chats) {
          await fetch(`${API}/api/chats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ title: chat.title })
          });
        }

        alert("Importación completada");
        window.location.reload();
      } catch (err) {
        alert("Error al importar el archivo");
      }
    };
    reader.readAsText(file);
  };

  const handleClearHistory = async () => {
    if (!window.confirm(t('delete_chat_confirm'))) return;
    try {
      const token = getAccessToken();
      const chatsResp = await fetch(`${API}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (chatsResp.ok) {
        const chats = await chatsResp.json();
        for (const chat of chats) {
          await fetch(`${API}/api/chats/${chat.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        window.location.reload();
      }
    } catch (err) {
      alert("Error al borrar el historial");
    }
  };

  if (!isOpen || !localSettings) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg animate-in fade-in duration-200">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".json"
        className="hidden"
      />

      <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
             <Settings size={20} className="text-primary" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100">{t('settings')}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-200 transition-colors p-2 rounded-full hover:bg-zinc-800"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex items-center px-6 border-b border-zinc-800 bg-surface/30">
        <nav className="flex gap-8">
          <TabButton id="models" label={t('models')} icon={<Cpu size={18}/>} active={activeTab} onClick={setActiveTab} />
          <TabButton id="advanced" label={t('advanced')} icon={<Sliders size={18}/>} active={activeTab} onClick={setActiveTab} />
          <TabButton id="skills" label={t('skills')} icon={<Zap size={18}/>} active={activeTab} onClick={setActiveTab} />
          <TabButton id="ui" label={t('interface')} icon={<Layout size={18}/>} active={activeTab} onClick={setActiveTab} />
          <TabButton id="account" label={t('account')} icon={<User size={18}/>} active={activeTab} onClick={setActiveTab} />
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full scrollbar-hide">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-300">
            {activeTab === 'models' && (
              <div className="space-y-8">
                <section>
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">{t('provider')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {PROVIDERS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleChange('provider', p.id)}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                          localSettings.provider === p.id
                            ? 'bg-primary/5 border-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                            : 'bg-surface border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div>
                          <p className="font-bold">{p.name}</p>
                          <p className="text-[11px] opacity-60">{p.desc}</p>
                        </div>
                        {localSettings.provider === p.id && <Check size={18} className="text-primary" />}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="p-5 bg-surface border border-zinc-800 rounded-xl space-y-4">
                   <div>
                     <label className="text-sm font-medium text-zinc-300 block mb-2">{t('api_key')}</label>
                     <div className="relative">
                        <input
                          type={showApiKey ? "text" : "password"}
                          value={localSettings.api_keys?.[localSettings.provider] || ''}
                          onChange={(e) => handleApiKeyChange(localSettings.provider, e.target.value)}
                          placeholder={t('api_key_placeholder')}
                          className="w-full bg-bg border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-primary/60 transition-colors pr-12"
                        />
                        <button
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                          {showApiKey ? <EyeOff size={18}/> : <Eye size={18}/>}
                        </button>
                     </div>
                     <p className="text-[10px] text-zinc-500 mt-2 italic">Tus llaves se guardan de forma segura en tu perfil.</p>
                   </div>
                </section>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SliderField label="Temperatura" value={localSettings.temperature} min={0} max={2} step={0.1} onChange={(v) => handleChange('temperature', v)} />
                <SliderField label="Top P" value={localSettings.top_p} min={0} max={1} step={0.05} onChange={(v) => handleChange('top_p', v)} />
                <SliderField label="Max Tokens" value={localSettings.max_tokens} min={256} max={32000} step={256} onChange={(v) => handleChange('max_tokens', v)} />
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-zinc-200 mb-2">{t('system_prompt')}</h3>
                  <textarea
                    value={localSettings.system_prompt || ""}
                    onChange={(e) => handleChange('system_prompt', e.target.value)}
                    rows={6}
                    className="w-full bg-surface border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-300 focus:outline-none focus:border-primary/50 resize-none font-mono"
                  />
                </div>
              </div>
            )}

            {activeTab === 'skills' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SkillToggle label="Internet Search" enabled={localSettings.skills?.internet} onToggle={() => handleSkillToggle('internet')} />
                  <SkillToggle label="Code Sandbox" enabled={localSettings.skills?.sandbox} onToggle={() => handleSkillToggle('sandbox')} />
                  <SkillToggle label="File Management" enabled={localSettings.skills?.files} onToggle={() => handleSkillToggle('files')} />
                </div>

                <div className="pt-6 border-t border-zinc-800">
                  <h3 className="text-sm font-medium text-zinc-200 mb-4">{t('install_skills')}</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={skillUrl}
                      onChange={(e) => setSkillUrl(e.target.value)}
                      placeholder="URL de GitHub o skills.sh..."
                      className="flex-1 bg-surface border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-primary/50"
                    />
                    <button className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg disabled:opacity-50 transition-colors">
                      <PlusIcon size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ui' && (
              <div className="space-y-10">
                <section>
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase mb-4">{t('theme')}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <ThemeBtn icon={<Moon size={18}/>} label={t('theme_dark')} active={localSettings.theme === 'dark'} onClick={() => handleChange('theme', 'dark')} />
                    <ThemeBtn icon={<Sun size={18}/>} label={t('theme_light')} active={localSettings.theme === 'light'} onClick={() => handleChange('theme', 'light')} />
                    <ThemeBtn icon={<Monitor size={18}/>} label={t('theme_system')} active={localSettings.theme === 'system'} onClick={() => handleChange('theme', 'system')} />
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase mb-4">{t('language')}</h3>
                  <div className="flex flex-wrap gap-3">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.id}
                        onClick={() => handleChange('language', lang.id)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                          localSettings.language === lang.id
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-surface border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </section>

                <div className="pt-6 border-t border-zinc-800">
                  <ToggleField
                    label={t('enter_to_send')}
                    enabled={localSettings.enter_to_send}
                    onToggle={() => handleChange('enter_to_send', !localSettings.enter_to_send)}
                    desc={t('enter_to_send_desc')}
                  />
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-8">
                <div className="flex items-center gap-5 p-6 bg-surface border border-zinc-800 rounded-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-3xl font-bold text-primary ring-4 ring-primary/5">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-zinc-100 truncate">{user?.name}</p>
                    <p className="text-sm text-zinc-500 truncate">{user?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleExport}
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-surface border border-zinc-800 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-600 transition-all"
                  >
                    <Download size={18} /> {t('export_json')}
                  </button>
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-surface border border-zinc-800 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-600 transition-all"
                  >
                    <Upload size={18} /> {t('import_json')}
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="md:col-span-2 flex items-center justify-center gap-3 px-6 py-4 bg-red-950/10 border border-red-900/20 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/20 transition-all"
                  >
                    <Trash2 size={18} /> {t('clear_history')}
                  </button>
                </div>

                <div className="pt-6 border-t border-zinc-800">
                  <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-base transition-all font-bold"
                  >
                    {t('logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-zinc-800 bg-surface/80 backdrop-blur-xl flex items-center justify-center">
        <div className="max-w-4xl w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            {saveStatus === 'success' && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium animate-in zoom-in-95 duration-200">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                {t('saved')}
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-400 text-sm font-medium animate-in zoom-in-95 duration-200">
                <AlertCircle size={16} /> {t('error')}
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="bg-primary hover:bg-primary-hover text-white px-10 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-3"
          >
            {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
            {isSaving ? t('saving') : t('save_changes')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({ id, label, icon, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-1 py-4 text-sm font-medium transition-all relative ${
        active === id ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {icon}
      {label}
      {active === id && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in fade-in slide-in-from-bottom-1 duration-300"></div>
      )}
    </button>
  );
}

function ThemeBtn({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
        active ? 'bg-primary/5 border-primary text-primary' : 'bg-surface border-zinc-800 text-zinc-500 hover:border-zinc-700'
      }`}
    >
      {icon}
      <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function SkillToggle({ label, enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
        enabled ? 'bg-primary/5 border-primary text-white shadow-lg shadow-primary/5' : 'bg-surface border-zinc-800 text-zinc-500 hover:border-zinc-700'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${enabled ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-600'}`}>
         <Zap size={20} />
      </div>
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="text-[10px] opacity-60 uppercase tracking-tighter">{enabled ? 'Activado' : 'Desactivado'}</p>
      </div>
    </button>
  );
}

function SliderField({ label, value, min, max, step, onChange }) {
  return (
    <div className="p-5 bg-surface border border-zinc-800 rounded-xl space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-sm font-bold text-zinc-200">{label}</label>
        <span className="text-xs font-mono text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">{value}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value || 0}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}

function ToggleField({ label, enabled, onToggle, desc }) {
  return (
    <div className="flex items-center justify-between p-4 bg-surface border border-zinc-800 rounded-xl">
      <div>
        <p className="text-sm font-bold text-zinc-200">{label}</p>
        {desc && <p className="text-[11px] text-zinc-500 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-primary' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
