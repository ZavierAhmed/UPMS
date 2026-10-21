import { useEffect, useState, useRef } from 'react';
const departments = [['inventory', 'Inventory'], ['sales_dispatch', 'Sales/Dispatch'], ['accounts', 'Accounts'], ['administrator', 'Administrator']];
export function Management() {
  const [user, setUser] = useState(null), [token, setToken] = useState(''), [ready, setReady] = useState(false);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [page, setPage] = useState('home');
  const [users, setUsers] = useState([]), [events, setEvents] = useState([]), [editing, setEditing] = useState(null);
  const active = useRef(false);
  async function api(path, method = 'GET', body, csrf = token) {
    const response = await fetch(`/api/v1/management${path}`, { method, credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(method !== 'GET' ? { 'X-CSRF-Token': csrf } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = response.status === 204 ? {} : await response.json();
    if (!response.ok) {
      if (response.status === 403 && data.error?.code === 'ACCESS_DENIED') setPage('denied');
      if (response.status === 401 && user) { setUser(null); setUsers([]); setEvents([]); setToken(''); }
      const labels = { INVALID_CREDENTIALS: 'Unable to sign in. Check your credentials.', ACCESS_DENIED: 'Access denied.',
        LAST_ADMINISTRATOR: 'Keep at least one enabled administrator.', STALE_VERSION: 'This account changed. Refresh before trying again.',
        IDENTITY_CONFLICT: 'That username is unavailable.', LOGIN_THROTTLED: 'Too many attempts. Please wait a minute.',
        CSRF_REJECTED: 'Your security token expired. Reload this page.', INVALID_INPUT: 'Check all fields. Passwords need 12–128 characters.',
        SESSION_EXPIRED: 'Your session ended. Sign in again.', AUTH_REQUIRED: 'Sign in to continue.' };
      throw new Error(labels[data.error?.code] || 'The management service is unavailable. Please try again later.');
    }
    return data;
  }
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const csrf = await fetch('/api/v1/management/session/csrf', { credentials: 'same-origin', cache: 'no-store' });
        if (!csrf.ok) throw new Error('The management service is unavailable.');
        const data = await csrf.json();
        if (mounted) setToken(data.csrfToken);
        const current = await fetch('/api/v1/management/session/current', { credentials: 'same-origin', cache: 'no-store' });
        if (current.ok && mounted) { const result = await current.json(); setUser(result.user); setToken(result.csrfToken); }
      } catch (error) { if (mounted) setMessage(error.message); }
      finally { if (mounted) setReady(true); }
    })();
    return () => { mounted = false; };
  }, []);
  async function run(action) {
    if (active.current) return;
    active.current = true; setBusy(true); setMessage('');
    try { await action(); } catch (error) { setMessage(error.message); }
    finally { active.current = false; setBusy(false); }
  }
  async function refreshUsers() { const data = await api('/users'); setUsers(data.users); }
  async function navigate(next) {
    await run(async () => {
      if (next === 'users') await refreshUsers();
      if (next === 'audit') { const data = await api('/audit'); setEvents(data.events); }
      setEditing(null); setPage(next);
    });
  }
  const can = permission => user?.permissions.includes(permission);
  return <div className="management"><header><a href="/management">UNIQUE PLASTIC <span>INDUSTRY</span></a><p>Staff management</p>
    {user && <div>{user.displayName}<button disabled={busy} onClick={() => run(async () => { await api('/session/logout', 'POST', {}); setUser(null); setUsers([]); setEvents([]); setToken(''); window.location.assign('/management'); })}>Sign out</button></div>}</header>
    <main>{message && <p className="notice" role="alert">{message}</p>}
      {!ready ? <p role="status">Connecting securely…</p> : !user ? <section className="login"><p className="eyebrow">PRIVATE WORKSPACE</p><h1>Staff sign in</h1><p>Use the account provided by your administrator.</p>
        <form onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); run(async () => {
          let csrf = token;
          if (!csrf) { const result = await api('/session/csrf'); csrf = result.csrfToken; setToken(csrf); }
          const result = await api('/session/login', 'POST', { username: data.get('username'), password: data.get('password') }, csrf);
          form.reset(); setUser(result.user); setToken(result.csrfToken); setPage('home');
        }); }}>
          <label>Username<input name="username" autoComplete="username" maxLength={64} required /></label>
          <label>Password<input type="password" name="password" autoComplete="current-password" maxLength={128} required /></label>
          <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form><p className="muted">Account access is managed locally. Contact your administrator for recovery.</p></section> : <>
        <nav aria-label="Management"><button onClick={() => navigate('home')}>Overview</button><button onClick={() => navigate('profile')}>My profile</button>{can('users.read') && <button onClick={() => navigate('users')}>Staff accounts</button>}{can('audit.read') && <button onClick={() => navigate('audit')}>Identity history</button>}</nav>
        {page === 'denied' && <section><h1>Access denied</h1><p>Your current department permissions do not allow this action.</p><button onClick={() => navigate('home')}>Return to overview</button></section>}
        {page === 'home' && <section><p className="eyebrow">UNIQUE PLASTIC INDUSTRY</p><h1>Welcome, {user.displayName}</h1><p>Your departments: {user.roles.map(code => departments.find(([key]) => key === code)?.[1]).join(', ')}</p><div className="card"><h2>Management foundation</h2><p>Your staff account and department access are active.</p><p>Inventory, sales and accounts workflows are upcoming milestones.</p></div></section>}
        {page === 'profile' && <section><h1>My profile</h1><p>{user.username} · {user.displayName}</p><h2>Change password</h2><p>This signs out all your sessions.</p><form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); run(async () => {
          await api('/profile/password', 'POST', { currentPassword: data.get('current'), newPassword: data.get('new') }); window.location.assign('/management');
        }); }}><label>Current password<input type="password" name="current" autoComplete="current-password" maxLength={128} required /></label><label>New password<input type="password" name="new" autoComplete="new-password" minLength={12} maxLength={128} required /></label><button disabled={busy}>Change password and sign out</button></form><button disabled={busy} onClick={() => run(async () => { await api(`/users/${user.id}/revoke-sessions`, 'POST', {}); window.location.assign('/management'); })}>Revoke all my sessions</button></section>}
        {page === 'users' && (!can('users.read') ? <h1>Access denied</h1> : <section><h1>Staff accounts</h1><p>Up to 100 accounts. Changes take effect immediately and are recorded.</p>
          <button disabled={busy} onClick={() => run(refreshUsers)}>Refresh accounts</button><div className="table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Departments</th><th>Status</th><th>Actions</th></tr></thead><tbody>{users.map(person => <tr key={person.id}><td>{person.displayName}</td><td>{person.username}</td><td>{person.roles.join(', ')}</td><td>{person.enabled ? 'Enabled' : 'Disabled'}</td><td><button disabled={busy} onClick={() => setEditing(person)}>Edit access</button><button disabled={busy} onClick={() => run(async () => { await api(`/users/${person.id}/revoke-sessions`, 'POST', {}); setMessage('Sessions revoked.'); })}>Revoke sessions</button></td></tr>)}</tbody></table></div>
          <AccountForm key={editing?.id || 'new'} person={editing} busy={busy} cancel={() => setEditing(null)} submit={data => run(async () => {
            if (editing) await api(`/users/${editing.id}`, 'PATCH', { ...data, version: editing.version });
            else await api('/users', 'POST', data);
            if (editing?.id === user.id) { window.location.assign('/management'); return; }
            setEditing(null); await refreshUsers(); setMessage('Account saved.');
          })} />
        </section>)}
        {page === 'audit' && (!can('audit.read') ? <h1>Access denied</h1> : <section><h1>Identity history</h1><p>Latest 100 identity events; times shown in UTC.</p><ol className="history">{events.map(event => <li key={event.id}><strong>{event.action}</strong><span>{event.created_at} UTC · Actor {event.actor_id || 'local bootstrap'} · Target {event.target_id || '—'}</span><pre>{event.details}</pre></li>)}</ol></section>)}
      </>}
    </main><footer>Unique Plastic Industry · Authorized staff only</footer></div>;
}
function AccountForm({ person, busy, submit, cancel }) {
  return <form className="card" onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const common = { roles: data.getAll('roles'), reason: data.get('reason') };
    if (person) submit({ ...common, enabled: data.get('enabled') === 'on' });
    else { submit({ ...common, username: data.get('username'), displayName: data.get('displayName'), password: data.get('password') }); form.reset(); }
  }}><h2>{person ? `Edit ${person.displayName}` : 'Create staff account'}</h2>
    {!person && <><label>Display name<input name="displayName" maxLength={100} required /></label><label>Username<input name="username" minLength={3} maxLength={64} pattern="[a-zA-Z0-9._-]+" required autoComplete="off" /></label><label>Initial password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label></>}
    <fieldset><legend>Departments</legend>{departments.map(([code, name]) => <label className="check" key={code}><input type="checkbox" name="roles" value={code} defaultChecked={person?.roles.includes(code)} />{name}</label>)}</fieldset>
    {person && <label className="check"><input type="checkbox" name="enabled" defaultChecked={person.enabled} />Account enabled</label>}
    <label>Reason for this change<input name="reason" minLength={3} maxLength={250} required /></label><button disabled={busy}>Save account</button>{person && <button type="button" onClick={cancel}>Cancel</button>}
  </form>;
}
