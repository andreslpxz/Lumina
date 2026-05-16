import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  es: {
    translation: {
      "settings": "Ajustes",
      "models": "Modelos",
      "advanced": "Parámetros",
      "skills": "Skills",
      "interface": "Interfaz",
      "account": "Cuenta",
      "provider": "Proveedor",
      "api_key": "API Key",
      "api_key_placeholder": "Introduce tu API Key...",
      "save_changes": "Guardar Cambios",
      "saving": "Guardando...",
      "saved": "Guardado",
      "error": "Error",
      "theme": "Tema",
      "theme_dark": "Oscuro",
      "theme_light": "Claro",
      "theme_system": "Sistema",
      "language": "Idioma de Interfaz",
      "export_json": "Exportar JSON",
      "import_json": "Importar JSON",
      "clear_history": "Borrar todo el historial",
      "logout": "Cerrar Sesión",
      "enter_to_send": "Enter para enviar",
      "enter_to_send_desc": "Shift+Enter para nueva línea",
      "system_prompt": "System Prompt (Personalidad)",
      "install_skills": "Instalar Skills",
      "explore_skills": "Explorar skills en skills.sh",
      "select_chat": "Selecciona o crea un chat",
      "start_building": "Comienza a construir con Lumina",
      "new_chat": "Nuevo Chat",
      "delete_chat_confirm": "¿Estás seguro de que quieres borrar todo el historial? Esta acción no se puede deshacer."
    }
  },
  en: {
    translation: {
      "settings": "Settings",
      "models": "Models",
      "advanced": "Parameters",
      "skills": "Skills",
      "interface": "Interface",
      "account": "Account",
      "provider": "Provider",
      "api_key": "API Key",
      "api_key_placeholder": "Enter your API Key...",
      "save_changes": "Save Changes",
      "saving": "Saving...",
      "saved": "Saved",
      "error": "Error",
      "theme": "Theme",
      "theme_dark": "Dark",
      "theme_light": "Light",
      "theme_system": "System",
      "language": "Interface Language",
      "export_json": "Export JSON",
      "import_json": "Import JSON",
      "clear_history": "Clear all history",
      "logout": "Logout",
      "enter_to_send": "Enter to send",
      "enter_to_send_desc": "Shift+Enter for new line",
      "system_prompt": "System Prompt (Personality)",
      "install_skills": "Install Skills",
      "explore_skills": "Explore skills on skills.sh",
      "select_chat": "Select or create a chat",
      "start_building": "Start building with Lumina",
      "new_chat": "New Chat",
      "delete_chat_confirm": "Are you sure you want to clear all history? This action cannot be undone."
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
