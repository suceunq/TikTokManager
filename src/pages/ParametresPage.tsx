import { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/Button';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
      <span className="toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </span>
      {label}
    </label>
  );
}

export default function ParametresPage() {
  const { settings, loading, update } = useSettings();
  const [reminderLead, setReminderLead] = useState(15);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [preReminderEnabled, setPreReminderEnabled] = useState(true);
  const [launchMinimizedToTray, setLaunchMinimizedToTray] = useState(false);
  const [startOnLogin, setStartOnLogin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setReminderLead(settings.reminderLeadMinutesDefault);
      setNotificationsEnabled(settings.notificationsEnabled);
      setPreReminderEnabled(settings.preReminderEnabled);
      setLaunchMinimizedToTray(settings.launchMinimizedToTray);
      setStartOnLogin(settings.startOnLogin);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await update({
      reminderLeadMinutesDefault: reminderLead,
      notificationsEnabled,
      preReminderEnabled,
      launchMinimizedToTray,
      startOnLogin,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return <div className="loading-state">Chargement des paramètres...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle">Personnalisez les rappels et le comportement de l'application.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="field">
          <label htmlFor="reminderLead">Délai de rappel par défaut (minutes avant la publication)</label>
          <input
            id="reminderLead"
            type="number"
            min={0}
            className="input"
            value={reminderLead}
            onChange={(e) => setReminderLead(Number(e.target.value))}
          />
          <span className="hint">Utilisé quand aucun rappel personnalisé n'est défini sur une publication.</span>
        </div>

        <Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} label="Activer les notifications" />
        <Toggle checked={preReminderEnabled} onChange={setPreReminderEnabled} label="Envoyer un rappel avant l'heure planifiée" />
        <Toggle checked={launchMinimizedToTray} onChange={setLaunchMinimizedToTray} label="Démarrer réduit dans la barre des tâches" />
        <Toggle checked={startOnLogin} onChange={setStartOnLogin} label="Démarrer avec Windows" />

        <div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement...' : saved ? 'Enregistré ✓' : 'Enregistrer les paramètres'}
          </Button>
        </div>
      </div>
    </div>
  );
}
