import {useState} from 'react';
import logo from '../../src/assets/unique_plastic_logos_hd/unique_plastic.svg';

export function StaffLogin({busy=false,error='',onSubmit}){
 const [visible,setVisible]=useState(false);
 return <section className="staff-login" aria-labelledby="staff-login-title">
  <div className="staff-brand-panel">
   <img className="staff-logo" src={logo} alt="Unique Plastic Industry" width="230" height="100"/>
   <p className="staff-access-label"><span aria-hidden="true">◆</span> Secure staff access</p>
   <h2>One workspace.<br/>Every working day.</h2>
   <p>Manage stock, challans, payments and ledgers in one place.</p>
   <svg className="staff-packaging-art" viewBox="0 0 430 240" aria-hidden="true"><circle cx="335" cy="93" r="75" fill="#333c43"/><path d="M40 126L116 91L183 128L105 165Z" fill="#e5bd89"/><path d="M40 126L105 165V230L40 192Z" fill="#bd8e58"/><path d="M105 165L183 128V196L105 230Z" fill="#d7a971"/><path d="M80 108L147 146V170L133 177V153L66 114Z" fill="#f58220"/><path d="M201 97L289 97L278 218Q246 230 212 218Z" fill="#f58220"/><ellipse cx="245" cy="97" rx="45" ry="13" fill="#ffb36f"/><path d="M212 121Q244 109 278 121" fill="none" stroke="#ef6d0e" stroke-width="4"/><path d="M315 64H353V82L373 100V214Q343 227 313 214V101L323 84H315Z" fill="#dce7e2"/><path d="M328 121H360V174H328Z" fill="#6f9c90"/><path d="M321 57H352V70H321Z" fill="#a5c1b7"/><path d="M22 235H402" stroke="#5d666c" stroke-width="2"/></svg>
   <small>Unique Plastic Industry · UPMS</small>
  </div>
  <div className="staff-form-panel">
   <p className="staff-kicker">UPMS MANAGEMENT</p><h1 id="staff-login-title">Welcome back</h1><p className="staff-subtitle">Sign in to UPMS</p>
   {error&&<p className="staff-login-error" role="alert">{error.split(' Reference: ')[0]}</p>}
   <form onSubmit={onSubmit} aria-busy={busy}>
    <label>Username<input name="username" required autoComplete="username" autoCapitalize="none" spellCheck={false} disabled={busy}/></label>
    <label>Password<span className="staff-password-field"><input name="password" type={visible?'text':'password'} required autoComplete="current-password" disabled={busy}/><button type="button" aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?'Hide':'Show'}</button></span></label>
    <button className="staff-submit" type="submit" disabled={busy}>{busy?'Signing in…':'Sign in'}</button>
    {busy&&<p className="staff-auth-progress" role="status">Signing in…</p>}
   </form>
   <p className="staff-help">For authorized staff. Use your assigned account to continue.</p>
  </div>
 </section>;
}
