// Generated with Claude Code
import { useState } from 'react';
import { setResetCooldown, setNegotiationWindow, setJobStartWindow, setAvailabilityTimeout } from '../../api/system';

function ConfigRow({ label, description, unit, onSave }) {
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value) return;
    setSaving(true);
    try {
      await onSave(parseFloat(value));
      setMsg('Updated!');
      setValue('');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="config-row card">
      <div className="config-info">
        <h3>{label}</h3>
        <p className="muted">{description}</p>
      </div>
      <div className="config-input">
        <input
          type="number"
          step="any"
          min="1"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={`New value (${unit})`}
        />
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!value || saving}>
          {saving ? '…' : 'Update'}
        </button>
        {msg && <span className="config-msg">{msg}</span>}
      </div>
    </div>
  );
}

export default function AdminSystem() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>System Configuration</h1>
        <p className="page-subtitle">Adjust platform-wide settings</p>
      </div>

      <ConfigRow
        label="Password Reset Cooldown"
        description="Minimum time (seconds) between password reset requests from the same IP."
        unit="seconds"
        onSave={setResetCooldown}
      />
      <ConfigRow
        label="Negotiation Window"
        description="Duration (seconds) of each negotiation session before it expires."
        unit="seconds"
        onSave={setNegotiationWindow}
      />
      <ConfigRow
        label="Job Start Window"
        description="Maximum number of hours in the future a job can be posted."
        unit="hours"
        onSave={setJobStartWindow}
      />
      <ConfigRow
        label="Availability Timeout"
        description="Seconds of inactivity before a user is considered unavailable."
        unit="seconds"
        onSave={setAvailabilityTimeout}
      />
    </div>
  );
}
