import {clearManagementMemory} from '../../management/src/managementRouting.js';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Management } from '../../management/src/Management.jsx';
const response = (status, data) => ({ ok: status < 400, status, json: async () => data });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => {window.history.replaceState({},'', '/management');window.dispatchEvent(new PopStateEvent('popstate'));clearManagementMemory();
  vi.stubGlobal('fetch', vi.fn(async url => url.endsWith('/csrf') ? response(200, { csrfToken: 'fixture-token' }) : response(401, { error: { code: 'AUTH_REQUIRED' } })));
});
describe('private management shell', () => {
  it('requires an initial password change and keeps administration navigation unavailable', async () => {
    fetch.mockImplementation(async url => url.endsWith('/csrf') ? response(200, { csrfToken: 'fixture-token' }) : response(200, { csrfToken: 'fixture-token', user: { id: '1', username: 'fixture', displayName: 'Synthetic Admin', roles: ['administrator'], permissions: ['portal.access', 'users.read', 'audit.read'], passwordChangeRequired: true } }));
    render(<Management />);
    await screen.findByRole('heading', { name: 'My profile' });
    expect(screen.getByRole('alert').textContent).toContain('temporary password');
    expect(screen.queryByRole('button', { name: 'Staff accounts' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'My profile' })).toBeTruthy());
    expect(screen.queryByRole('heading', { name: /Welcome/ })).toBeNull();
  });
  it('offers private staff login without registration or business balances', async () => {
    render(<Management />);
    await screen.findByRole('heading', { name: 'Staff sign in' });
    expect(screen.getByLabelText('Username')).toBeTruthy();
    expect(screen.getByLabelText('Password').type).toBe('password');
    expect(screen.queryByText(/register/i)).toBeNull();
    expect(screen.queryByText(/total sales/i)).toBeNull();
  });
  it('shows generic invalid credential response', async () => {
    render(<Management />); await screen.findByRole('heading', { name: 'Staff sign in' });
    fetch.mockImplementation(async () => response(401, { error: { code: 'INVALID_CREDENTIALS' } }));
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'fixture' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'synthetic-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Unable to sign in.');
  });
  it('Inventory sees own profile and upcoming modules without administration navigation', async () => {
    fetch.mockImplementation(async url => url.endsWith('/csrf') ? response(200, { csrfToken: 'fixture-token' }) : response(200, { csrfToken: 'fixture-token', user: { id: '1', username: 'fixture', displayName: 'Synthetic Staff', roles: ['inventory'], permissions: ['portal.access', 'profile.read'] } }));
    render(<Management />); await screen.findByRole('heading', { name: 'Welcome back, Synthetic' });
    expect(screen.queryByRole('button', { name: 'Staff accounts' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Identity history' })).toBeNull();
    expect(screen.getByText(/explicit owner policy/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'My profile' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'My profile' })).toBeTruthy());
  });
  it('reports unavailable identity service clearly', async () => {
    fetch.mockResolvedValue(response(503, {})); render(<Management />);
    expect((await screen.findByRole('alert')).textContent).toContain('unavailable');
  });
  it('clears authenticated UI when a protected action reports an expired session', async () => {
    fetch.mockImplementation(async url => url.endsWith('/csrf') ? response(200, { csrfToken: 'fixture-token' }) : response(200, { csrfToken: 'fixture-token', user: { id: '1', username: 'fixture', displayName: 'Synthetic Admin', roles: ['administrator'], permissions: ['portal.access', 'profile.read', 'users.read'] } }));
    render(<Management />); await screen.findByRole('heading', { name: 'Welcome back, Synthetic' });
    fetch.mockResolvedValue(response(401, { error: { code: 'SESSION_EXPIRED' } }));
    fireEvent.click(screen.getByRole('button', { name: 'Staff accounts' }));
    await screen.findByRole('heading', { name: 'Staff sign in' });
    expect(screen.queryByRole('button', { name: 'Staff accounts' })).toBeNull();
    expect((await screen.findByRole('alert')).textContent).toContain('session ended');
  });
});
