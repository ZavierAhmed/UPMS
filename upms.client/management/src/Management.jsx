import {MasterWorkspace} from './MasterWorkspace.jsx';
import {CustomerLedger} from './CustomerLedger.jsx';
import {BusinessUserContext,BusinessReadContext} from './managementContext.js';
import {AuditTimeline} from './DocumentDetailLayout.jsx';
import {ActionButton} from './ActionUI.jsx';
import {RoutingContext,useManagementRoute,routePermission,routePermissions,navigatePath,workspacePath,clearManagementMemory,hasUnsavedDrafts} from './managementRouting.js';
import {BusinessTable} from './ManagementUI.jsx';
import {postingSummary,navigation} from './managementPresentation.js';
import {Sidebar,ReviewDialog,WorkspaceBoundary} from './ManagementUI.jsx';
import {Dashboard} from './Dashboard.jsx';
import {Expenses} from './Expenses.jsx';
import {Credits} from './Credits.jsx';
import {Returns} from './Returns.jsx';
import {Cheques} from './Cheques.jsx';
import {Receipts} from './Receipts.jsx';
import {Sales} from './Sales.jsx';
import {Purchases} from './Purchases.jsx';
import { useEffect, useState, useRef } from 'react';
import { BusinessMasters } from './BusinessMasters.jsx';
import { Inventory } from './Inventory.jsx';
const departments = [['inventory', 'Inventory'], ['sales_dispatch', 'Sales/Dispatch'], ['accounts', 'Accounts'], ['administrator', 'Administrator']];
export function Management() {
  const [user, setUser] = useState(null), [token, setToken] = useState(''), [ready, setReady] = useState(false);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [routeError,setRouteError]=useState('');
  const [users, setUsers] = useState([]), [events, setEvents] = useState([]), [editing, setEditing] = useState(null);
  const route=useManagementRoute();
  useEffect(()=>{if(user&&!user.passwordChangeRequired&&route.alias)navigatePath(route.alias,{replace:true});},[user,route.alias]);
  const requested=route.workspace;
  const allowed=route.workspace==='notfound'||(!routePermissions[route.workspace]||user?.permissions.includes(routePermissions[route.workspace]))&&(!routePermission(route)||user?.permissions.includes(routePermission(route)));
  const page=user?.passwordChangeRequired?'profile':routeError||(!allowed?'denied':requested);
  const active = useRef(false), reviewResolve=useRef(null),readCache=useRef(new Map());
  const [reading,setReading]=useState(0);
  const [review,setReview]=useState(null),[visited,setVisited]=useState([]);
  if(user&&!user.passwordChangeRequired&&['customers','vendors','products','customer-ledgers','masters','sales','expenses','credits','returns','cheques','receipts','purchases','inventory'].includes(page)&&!visited.includes(page))setVisited(v=>[...v,page]);
  function decideReview(accepted){setReview(null);reviewResolve.current?.(accepted);reviewResolve.current=null;}
  useEffect(()=>()=>{reviewResolve.current?.(false);},[]);
  async function api(path, method = 'GET', body, csrf = token, commandKey, reviewSource) {
    if(method==='POST'&&/\/(?:post|clear|dispatch|postDishonour)$/.test(path)){
      if(reviewResolve.current)throw new Error('Finish the current posting review first.');
      const sourcePath=path.replace(/\/(?:post|clear|dispatch|postDishonour)$/,'');
      const source=reviewSource||await api(sourcePath);
      const accepted=await new Promise(resolve=>{reviewResolve.current=resolve;setReview({summary:postingSummary(path,body||{},source,[...readCache.current.values()])});});
      if(!accepted)throw new Error('Posting cancelled. Your document remains available for review.');
    }
    if(method==='GET')setReading(n=>n+1);
    const response = await fetch(`/api/v1/management${path}`, { method, credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...(method !== 'GET' ? { 'X-CSRF-Token': csrf } : {}),...(commandKey?{'Idempotency-Key':commandKey}:{}) },
      ...(body ? { body: JSON.stringify(body) } : {}) }).finally(()=>{if(method==='GET')setReading(n=>Math.max(0,n-1));});
    const data = response.status === 204 ? {} : await response.json();
    if (!response.ok) {
      if (response.status === 403 && data.error?.code === 'ACCESS_DENIED') setRouteError('denied');
      if (response.status === 401 && user) { setUser(null); setUsers([]); setEvents([]); setToken('');setVisited([]);readCache.current.clear(); }
      const labels = { REAL_EXPENSE_ACTIVATION_PENDING:'Real expense posting remains blocked. Use the authorized synthetic demo.', EXPENSE_POLICY_PENDING:'Expense categories, thresholds and payment policy await approval.', EXPENSE_OVERPAYMENT:'This payment exceeds the remaining expense payable.', STALE_EXPENSE_PAYABLE:'Another payment changed the payable. Refresh and review a new draft version.', EXPENSE_CATEGORY_INELIGIBLE:'Choose an active category accepted by the expense policy.', STALE_EXPENSE_CATEGORY:'This category changed. Refresh and review the expense lines.', EXPENSE_CORRECTION_EFFECTS_PENDING:'The correction is reviewed; reversal and financial effects remain blocked.', EXPENSE_MONEY_POLICY_CHANGED:'Money policy changed. An administrator must reaccept expense policy.', DUPLICATE_EXPENSE_SOURCE:'This payee and source reference already have an expense request.', REAL_CREDIT_ACTIVATION_PENDING:'Real credit posting awaits owner policy.', CREDIT_POLICY_PENDING:'Credit valuation and surplus policy awaits review.', CREDIT_CAPACITY_EXCEEDED:'This credit exceeds remaining original component or line capacity.', RETURN_CREDIT_QUANTITY_EXCEEDED:'Quantity exceeds the eligible inspected remainder.', DUPLICATE_CREDIT_REFERENCE:'This challan already has a correction using that reference.', STALE_CREDIT_EVIDENCE:'Settlement or capacity changed. Refresh, revise and obtain a new approval.', REAL_RETURN_ACTIVATION_PENDING:'Real customer returns remain blocked pending owner policy.', RETURN_POLICY_PENDING:'Return acceptance, evidence and disposition policy awaits review.', RETURN_QUANTITY_EXCEEDED:'The physical quantity exceeds the requested or remaining dispatched allowance.', STALE_RETURN_QUARANTINE:'Another inspection changed this receipt quarantine balance. Review and save a new version.', INSPECTION_QUANTITY_MISMATCH:'Reusable, damaged and remaining quantities must exactly match the quantity under inspection.', RETURN_SOURCE_SCOPE_MISMATCH:'Use the original challan customer and classification.', RETURN_ITEM_SOURCE_MISMATCH:'Choose the exact active bottle variant and unit dispatched on this challan.', CHEQUE_POLICY_PENDING:'Cheque custody, evidence and numbering policy awaits review.', REAL_CHEQUE_ACTIVATION_PENDING:'Real cheque posting is not activated.', CHEQUE_CREDIT_UNAVAILABLE:'This cheque is under dishonour review or has been dishonoured. Its credit cannot fund another application.', STALE_CHEQUE_STATE:'Cheque state changed. Refresh and review before continuing.', INVALID_CHEQUE_TRANSITION:'This action is unavailable for the current cheque state.', CHEQUE_DEPENDENCY_MISMATCH:'Cheque dependencies do not reconcile. Nothing was posted; independent review is required.', CHEQUE_CORRECTION_REVIEW_REQUIRED:'A linked correction requires independent review before dishonour.', ELIGIBLE_BANK_REQUIRED:'Choose a verified bank account in the cheque currency.', RECEIPT_POLICY_PENDING:"Receipt posting awaits owner approval of numbering, currency, period and unapplied-credit treatment.", REAL_RECEIPT_ACTIVATION_PENDING:"Real receipt posting is not activated. Owner policy review is required.", RECEIPT_CATALOGUE_PENDING:"An administrator must prepare receipt document types first.", CHALLAN_OVERPAYMENT:"An allocation exceeds the challan current outstanding amount. Review and re-enter the allocations.", STALE_CHALLAN_OUTSTANDING:"Another payment changed a challan. Refresh, review and re-enter its allocation before saving a new draft version.", STALE_UNAPPLIED_CREDIT:"This receipt credit changed. Refresh and review its remaining amount before applying it.", UNAPPLIED_CREDIT_EXCEEDED:"The application exceeds the selected receipt remaining credit.", UNAPPLIED_POLICY_PENDING:"Unapplied receipts are not enabled by the accepted policy. Allocate the full amount explicitly.", CROSS_CUSTOMER_OR_LEDGER_ALLOCATION:"Choose challans for this customer, classification and currency only.", CROSS_CUSTOMER_OR_LEDGER_CREDIT:"Choose an existing receipt in this customer ledger and currency.", RECEIPT_METHOD_ACCOUNT_MISMATCH:"Choose a receiving account with an accepted, compatible settled payment method.", STALE_ACCOUNT_VERSION:"The receiving account changed. Refresh and select it again for review.", RECEIPT_CORRECTION_EFFECTS_PENDING:"Correction review is recorded; reversal and refund effects await an approved policy.", SALES_POLICY_PENDING:"Owner sales currency, rounding, cutoff, period and numbering decisions are pending.", SALES_CATALOGUE_NOT_PREPARED:"An administrator must prepare sales document types first.", CUSTOMER_OPENING_PENDING:"This customer starting balance is unverified. No receivable was posted.", FINISHED_GOODS_REQUIRED:"Choose an active finished-bottle item for dispatch.", SALES_CORRECTION_EFFECTS_PENDING:"Correction evidence is approved, but stock/credit effects remain blocked pending owner policy.", DUPLICATE_CORRECTION_REQUEST:"This exact correction proposal already has a linked request.", STALE_CUSTOMER_VERSION:"Customer details changed. Review and save a new draft version.", OPERATIONAL_MONEY_POLICY_MISMATCH:"Sales and purchasing currency/precision policies must agree.", PURCHASE_POLICY_PENDING:"Owner purchasing policy is pending. Nothing was posted.", VENDOR_OPENING_PENDING:"The vendor starting balance is unverified. Historical openings remain pending.", MONEY_OPENING_PENDING:"This money account has no authorized starting state. Its balance is unverified.", INSUFFICIENT_MONEY_APPROVAL_REQUIRED:"Insufficient funds. An administrator must approve this exact payment and current balance.", DEFICIT_ACCOUNT_POLICY_PENDING:"Deficit exceptions are not approved for this account type.", PAYMENT_INSTRUMENT_POLICY_PENDING:"This payment account type has no approved settlement mechanics.", INVOICE_OVERPAYMENT:"The allocation exceeds the invoice outstanding balance.", CROSS_VENDOR_ALLOCATION:"Every allocated invoice must belong to this vendor.", DUPLICATE_SUPPLIER_INVOICE:"That supplier invoice reference is already recognized for this vendor.", PURCHASE_CORRECTION_POLICY_PENDING:"Correction evidence is retained; stock and financial effects await owner policy.", INSUFFICIENT_AVAILABLE_STOCK:'There is insufficient available stock. No quantities were posted.', INVALID_ITEM_CATEGORY:'Choose a finished bottle for production or a material/component for consumption.', INVALID_UNIT_PRECISION:'Quantity exceeds the allowed decimal places for this unit.', INVALID_QUANTITY:'Enter an exact quantity using digits and an optional decimal point.', POSITIVE_QUANTITY_REQUIRED:'Enter a quantity greater than zero.', QUANTITY_OVERFLOW:'That quantity exceeds the supported stock range.', INACTIVE_ITEM:'This item or its unit is inactive.', INITIAL_STATE_UNVERIFIED:'An administrator must authorize the item starting state first. Historical openings remain pending.', STALE_STOCK_COUNT:'Stock changed after this count. Recount and submit a new version.', APPROVAL_REQUIRED:'A valid administrator approval of this exact version is required.', STALE_APPROVAL:'This approval is no longer valid. Submit the current version for review.', DUPLICATE_POSTING:'This document has already been posted.', INVENTORY_POLICY_PENDING:'The owner must accept inventory cutoff, period and numbering configuration first.', INVENTORY_CATALOGUE_NOT_PREPARED:'An administrator must prepare the inventory document catalogue first.', PERIOD_NOT_OPEN:'The business period is not open.', CUTOFF_NOT_APPROVED:'The inventory cutoff is not approved.', PREFIX_NOT_APPROVED:'The document prefix is not approved.', PREFIX_UNAPPROVED:'The document prefix is not approved.', CUTOVER_UNCONFIGURED:'The owner must approve the inventory cutoff before posting.', PRE_CUTOFF_FORBIDDEN:'This document date precedes the approved cutoff.', BACKDATING_POLICY_UNRESOLVED:'Only the current Pakistan business date is allowed until backdating policy is approved.', POSTED_DOCUMENT_IMMUTABLE:'Posted quantities cannot be edited. Create a linked correction request.', COUNT_ALREADY_VERIFIED:'This matching count is already verified and has no stock movement.', INITIAL_STATE_ALREADY_AUTHORIZED:'This item already has an authorized starting state.', ADMINISTRATOR_REQUIRED:'This stock adjustment or correction requires an administrator.', CORRECTION_LIMIT_EXCEEDED:'Cumulative corrections cannot exceed the original posted quantity.', CONDITION_ACTION_DISABLED:'This action is disabled for quarantined or damaged stock.', COMMAND_OUTCOME_UNKNOWN:'The posting result is uncertain. Keep these inputs and retry the same action to retrieve its recorded outcome.', INVALID_CREDENTIALS: 'Unable to sign in. Check your credentials.', ACCESS_DENIED: 'Access denied.',
        LAST_ADMINISTRATOR: 'Keep at least one enabled administrator.', STALE_VERSION: 'This record changed. Refresh before trying again.',
        IDENTITY_CONFLICT: 'That code or canonical variant already exists.', LOGIN_THROTTLED: 'Too many attempts. Please wait a minute.',
        INVALID_VARIANT_DIMENSIONS:'Finished bottles require all four dimensions; other categories use none.', ITEM_IDENTITY_IMMUTABLE:'Create a replacement item to change its stock identity.', REFERENCED_UNIT_IMMUTABLE:'A referenced unit cannot change its meaning or precision.',
        CODE_IMMUTABLE:'Codes stay fixed. Edit the name or status instead.',INACTIVE_OR_INVALID_REFERENCE:'Choose active, valid reference records.',IDEMPOTENCY_CONFLICT:'This command key belongs to different inputs. Refresh before retrying.',
        DUPLICATE_CANONICAL_VALUE:'That canonical bottle value already exists under another code.',PREFIX_ALREADY_ASSIGNED:'That prefix is already assigned to another document type.',
        OVERLAPPING_PERIOD:'Business periods cannot overlap.',REOPENING_POLICY_UNRESOLVED:'Period reopening is not approved.',ISSUED_PREFIX_IMMUTABLE:'An issued numbering prefix cannot be changed.',
        CSRF_REJECTED: 'Your security token expired. Reload this page.', INVALID_INPUT: 'Check all fields. Passwords need 12–128 characters.',
        PASSWORD_CHANGE_REQUIRED: 'Change your initial password to continue.', PASSWORD_MUST_DIFFER: 'Choose a different new password.', SESSION_EXPIRED: 'Your session ended. Sign in again.', AUTH_REQUIRED: 'Sign in to continue.' };
      throw new Error(labels[data.error?.code] || 'The management service is unavailable. Please try again later.');
    }
    if(method==='GET')readCache.current.set(path,data);
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
        if (current.ok && mounted) { const result = await current.json(); setUser(result.user); setToken(result.csrfToken); if(result.user.passwordChangeRequired)navigatePath('/management/profile',{replace:true}); }
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
  async function navigate(next){if(user?.passwordChangeRequired){navigatePath('/management/profile');return;}setRouteError('');setEditing(null);navigatePath(workspacePath(next));}
  useEffect(()=>{let live=true;if(!user||user.passwordChangeRequired||!allowed)return;
    Promise.resolve().then(async()=>{setRouteError('');if(route.workspace==='users'){const data=await api('/users');if(live)setUsers(data.users);}if(route.workspace==='audit'){const data=await api('/audit');if(live)setEvents(data.events);}}).catch(error=>{if(live)setMessage(error.message);});return()=>{live=false;};
  // The route and authenticated identity trigger the read; API closure changes must not refetch the same page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[route.path,user?.id]);
  const can = permission => !user?.passwordChangeRequired && user?.permissions.includes(permission);
  const activePage=route.view==='customers'?'customer-ledgers':page;
  const pageLabel=navigation.flatMap(g=>g.items).find(i=>i[0]===activePage)?.[1]||'Workspace';
  const logout=()=>run(async()=>{if(hasUnsavedDrafts()&&!window.confirm('Sign out and discard your unsaved drafts? Cancel keeps your work open.'))return;await api('/session/logout','POST',{});setUser(null);setUsers([]);setEvents([]);setVisited([]);readCache.current.clear();setToken('');clearManagementMemory();decideReview(false);navigatePath('/management',{replace:true});});
  return <div className={'management '+(user?'authenticated':'signed-out')}><a className="skip-link" href="#workspace-main">Skip to workspace</a>
    {user?<Sidebar user={user} page={activePage} can={can} navigate={navigate} signOut={logout} busy={busy}/>:<header className="login-brand"><a className="brand" href="/management"><span className="brand-mark">U</span><span>Unique Plastic<small>INDUSTRY · MANAGEMENT</small></span></a></header>}
    <BusinessUserContext.Provider value={user}><BusinessReadContext.Provider value={reading>0}><RoutingContext.Provider value={allowed&&!user?.passwordChangeRequired}><main id="workspace-main">{user&&<div className="workspace-topbar"><span>Workspace <span aria-hidden="true">/</span> <strong>{pageLabel}</strong>{route.documentId&&<span> / Document {route.documentId}</span>}{(route.view==='new'||route.draftId)&&<span> / Draft {route.draftId||''}</span>}</span><span className="staff-chip">{user.displayName}</span></div>}{reading>0&&<div className="read-progress" role="status">Loading records…</div>}{message && <p className="notice" role="alert">{message}</p>}
      {!ready ? <p role="status">Connecting securely…</p> : !user ? <section className="login"><p className="eyebrow">PRIVATE WORKSPACE</p><h1>Staff sign in</h1><p>Use the account provided by your administrator.</p>
        <form onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); run(async () => {
          let csrf = token;
          if (!csrf) { const result = await api('/session/csrf'); csrf = result.csrfToken; setToken(csrf); }
          const result = await api('/session/login', 'POST', { username: data.get('username'), password: data.get('password') }, csrf);
          form.reset(); setUser(result.user); setToken(result.csrfToken); setVisited([]);readCache.current.clear();clearManagementMemory();if(result.user.passwordChangeRequired)navigatePath('/management/profile',{replace:true});
        }); }}>
          <label>Username<input name="username" autoComplete="username" maxLength={64} required /></label>
          <label>Password<input type="password" name="password" autoComplete="current-password" maxLength={128} required /></label>
          <ActionButton disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</ActionButton>
        </form><p className="muted">Account access is managed locally. Contact your administrator for recovery.</p></section> : <>
        {['customers','vendors','products'].map(workspace=>(page===workspace||visited.includes(workspace))&&<div key={workspace} hidden={page!==workspace} className="module-view"><WorkspaceBoundary><MasterWorkspace workspace={workspace} api={api} user={user}/></WorkspaceBoundary></div>)}
        {(page==='customer-ledgers'||visited.includes('customer-ledgers'))&&<div hidden={page!=='customer-ledgers'} className="module-view"><WorkspaceBoundary><CustomerLedger api={api} user={user}/></WorkspaceBoundary></div>}
        {(page==='masters'||visited.includes('masters'))&&<div hidden={page!=='masters'} className="module-view"><WorkspaceBoundary><BusinessMasters api={api} user={user}/></WorkspaceBoundary></div>}
        {(page==='sales'||visited.includes('sales'))&&<div hidden={page!=='sales'} className="module-view"><WorkspaceBoundary><Sales api={api} user={user}/></WorkspaceBoundary></div>}
        {(page==='expenses'||visited.includes('expenses'))&&<div hidden={page!=='expenses'} className="module-view"><WorkspaceBoundary><Expenses api={api} user={user}/></WorkspaceBoundary></div>}
        {(page==='credits'||visited.includes('credits'))&&<div hidden={page!=='credits'} className="module-view"><WorkspaceBoundary><Credits api={api} user={user}/></WorkspaceBoundary></div>}
        {(page==='returns'||visited.includes('returns'))&&<div hidden={page!=='returns'} className="module-view"><WorkspaceBoundary><Returns api={api} user={user}/></WorkspaceBoundary></div>}
        {(page==='cheques'||visited.includes('cheques'))&&<div hidden={page!=='cheques'} className="module-view"><WorkspaceBoundary><Cheques api={api} user={user}/></WorkspaceBoundary></div>}
        {(page==='receipts'||visited.includes('receipts'))&&<div hidden={page!=='receipts'} className="module-view"><WorkspaceBoundary><Receipts api={api} user={user}/></WorkspaceBoundary></div>}
        {(page==='purchases'||visited.includes('purchases'))&&<div hidden={page!=='purchases'} className="module-view"><WorkspaceBoundary><Purchases api={api} user={user}/></WorkspaceBoundary></div>}
        {(page==='inventory'||visited.includes('inventory'))&&<div hidden={page!=='inventory'} className="module-view"><WorkspaceBoundary><Inventory api={api} user={user}/></WorkspaceBoundary></div>}
        {page === 'notfound'&&<section><h1>Page not found</h1><p>This management address does not match a supported workspace or document view.</p><ActionButton onClick={()=>navigate('home')}>Open dashboard</ActionButton></section>}
        {page === 'denied' && <section><h1>Access denied</h1><p>Your current department permissions do not allow this action.</p><ActionButton onClick={() => navigate('home')}>Return to overview</ActionButton></section>}
        {page === 'home' && <Dashboard user={user} api={api} navigate={navigate}/>}
        {page === 'profile' && <section><h1>My profile</h1><p>{user.username} · {user.displayName}</p><h2>Change password</h2>{user.passwordChangeRequired && <p role="alert">Change your temporary password before using staff management.</p>}<p>This signs out all your sessions.</p><form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); run(async () => {
          await api('/profile/password', 'POST', { currentPassword: data.get('current'), newPassword: data.get('new') }); window.location.assign('/management');
        }); }}><label>Current password<input type="password" name="current" autoComplete="current-password" maxLength={128} required /></label><label>New password<input type="password" name="new" autoComplete="new-password" minLength={12} maxLength={128} required /></label><ActionButton disabled={busy}>Change password and sign out</ActionButton></form><ActionButton disabled={busy} onClick={() => run(async () => { await api(`/users/${user.id}/revoke-sessions`, 'POST', {}); window.location.assign('/management'); })}>Revoke all my sessions</ActionButton></section>}
        {page === 'users' && (!can('users.read') ? <h1>Access denied</h1> : <section><h1>Staff accounts</h1><p>Up to 100 accounts. Changes take effect immediately and are recorded.</p>
          <ActionButton disabled={busy} onClick={() => run(refreshUsers)}>Refresh accounts</ActionButton><div className="table-wrap"><BusinessTable><thead><tr><th>Name</th><th>Username</th><th>Departments</th><th>Status</th><th>Actions</th></tr></thead><tbody>{users.map(person => <tr key={person.id}><td>{person.displayName}</td><td>{person.username}</td><td>{person.roles.join(', ')}</td><td>{person.enabled ? 'Enabled' : 'Disabled'}</td><td><ActionButton disabled={busy} onClick={() => setEditing(person)}>Edit access</ActionButton><ActionButton disabled={busy} onClick={() => run(async () => { await api(`/users/${person.id}/revoke-sessions`, 'POST', {}); setMessage('Sessions revoked.'); })}>Revoke sessions</ActionButton></td></tr>)}</tbody></BusinessTable></div>
          <AccountForm key={editing?.id || 'new'} person={editing} busy={busy} cancel={() => setEditing(null)} submit={data => run(async () => {
            if (editing) await api(`/users/${editing.id}`, 'PATCH', { ...data, version: editing.version });
            else await api('/users', 'POST', data);
            if (editing?.id === user.id) { window.location.assign('/management'); return; }
            setEditing(null); await refreshUsers(); setMessage('Account saved.');
          })} />
        </section>)}
        {page === 'audit' && (!can('audit.read') ? <h1>Access denied</h1> : <section><h1>Identity history</h1><p>Latest 100 identity events; times shown in UTC.</p><AuditTimeline events={events}/></section>)}
      </>}
    </main></RoutingContext.Provider></BusinessReadContext.Provider></BusinessUserContext.Provider><ReviewDialog review={review} onDecision={decideReview}/><footer>Unique Plastic Industry · Authorized staff only</footer></div>;
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
    <label>Reason for this change<input name="reason" minLength={3} maxLength={250} required /></label><ActionButton disabled={busy}>Save account</ActionButton>{person && <ActionButton type="button" onClick={cancel}>Cancel</ActionButton>}
  </form>;
}
