import express from 'express';
import session from 'express-session';
import { csrfSync } from 'csrf-sync';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { MysqlSessionStore } from './session-store.js';
import { createIdentityService, identityIncludingDisabled, digest } from './service.js';
import { query } from './database.js';
import { IdentityError } from './passwords.js';
import { createInput, updateInput, loginInput, passwordInput, idInput } from './validation.js';
import { businessRouter } from '../business/router.js';
import { inventoryRouter } from '../inventory/router.js';

const call = (value, method) => new Promise((resolve, reject) => value[method](err => err ? reject(err) : resolve()));
export function managementRouter(db, config) {
  const router = express.Router();
  const service = createIdentityService(db);
  const base = '/api/v1/management';
  const { generateToken, csrfSynchronisedProtection } = csrfSync({ getTokenFromRequest: req => req.headers['x-csrf-token'] });
  router.use((req, res, next) => {
    if (!/^\/(management|api\/v1\/management)(\/|$)/i.test(req.path)) return next('router');
    res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Vary': 'Cookie' });
    req.correlation = randomUUID();
    if (config.secure && !req.peer?.secure) return res.status(400).json({ error: { code: 'HTTPS_REQUIRED', reference: req.correlation } });
    // Express's cookie transport check uses this verified boundary, never raw forwarded headers.
    Object.defineProperty(req, 'secure', { value: Boolean(req.peer?.secure), configurable: true });
    next();
  });
  // Static JS contains no private state. All records come from authorized no-store APIs.
  router.use('/management/assets', express.static(resolve(config.root, 'assets'), { index: false, dotfiles: 'deny', fallthrough: false }));
  router.get(/^\/management(?:\/.*)?$/, (req, res) => res.sendFile(resolve(config.root, 'index.html')));
  router.use(base, express.json({ limit: '12kb', strict: true }));
  router.use(base, (req, res, next) => {
    const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (req.headers['sec-fetch-site'] === 'cross-site' || (unsafe && req.headers.origin !== config.origin))
      return next(new IdentityError(403, 'ORIGIN_REJECTED'));
    if (unsafe && !req.is('application/json')) return next(new IdentityError(415, 'JSON_REQUIRED'));
    next();
  });
  router.use(base, session({ name: config.cookieName, secret: config.secret,
    store: new MysqlSessionStore(db, config), resave: false, saveUninitialized: false,
    rolling: true, cookie: { secure: config.secure, httpOnly: true, sameSite: 'strict', path: '/', maxAge: config.idleMs } }));
  router.use(base, (req, res, next) => {
    Object.defineProperty(req.session, 'recordHash', { value: digest(req.sessionID), enumerable: false });
    next();
  });
  router.get(`${base}/session/csrf`, async (req, res) => {
    const csrfToken = generateToken(req);
    await call(req.session, 'save');
    res.json({ csrfToken });
  });
  router.use(base, async (req, res, next) => {
    // A lost/expired session must produce 401 before CSRF checks on protected actions,
    // so browsers can clear private state and return to sign-in reliably.
    if (req.path.toLowerCase() !== '/session/login') await service.read(req.session, 'portal.access', async () => {});
    next();
  });
  router.use(base, csrfSynchronisedProtection);
  router.use(`${base}/business`,businessRouter(db));
  router.use(`${base}/inventory`,inventoryRouter(db));
  router.post(`${base}/session/login`, async (req, res) => {
    const parsed = loginInput.safeParse(req.body);
    if (!parsed.success || !parsed.data.username || !parsed.data.password) throw new IdentityError(401, 'INVALID_CREDENTIALS');
    const user = await service.login(parsed.data.username, parsed.data.password);
    if (!user) throw new IdentityError(401, 'INVALID_CREDENTIALS');
    await call(req.session, 'regenerate');
    req.session.userId = user.id; req.session.authVersion = user.version; req.session.issuedAt = Date.now();
    const csrfToken = generateToken(req);
    await call(req.session, 'save');
    res.json({ user, csrfToken });
  });
  router.post(`${base}/session/logout`, async (req, res) => {
    await service.read(req.session, 'portal.access', async () => {});
    await call(req.session, 'destroy');
    res.clearCookie(config.cookieName, { path: '/', secure: config.secure, sameSite: 'strict', httpOnly: true }).status(204).end();
  });
  router.get(`${base}/session/current`, async (req, res) => {
    const user = await service.read(req.session, 'profile.read', async (_, current) => current);
    res.json({ user, csrfToken: generateToken(req) });
  });
  router.get(`${base}/roles`, async (req, res) => {
    res.json(await service.read(req.session, 'roles.read', async () => ({ roles: service.catalog })));
  });
  router.get(`${base}/users`, async (req, res) => {
    const users = await service.read(req.session, 'users.read', async trx => {
      const ids = await query(trx('users').select('id').orderBy('id').limit(100));
      return Promise.all(ids.map(({ id }) => identityIncludingDisabled(trx, id)));
    });
    res.json({ users, limit: 100 });
  });
  router.post(`${base}/users`, async (req, res) => res.status(201).json({ user: await service.create(req.session, createInput.parse(req.body)) }));
  router.patch(`${base}/users/:id`, async (req, res) => res.json(await service.update(req.session, idInput.parse(req.params.id), updateInput.parse(req.body))));
  router.post(`${base}/profile/password`, async (req, res) => { await service.password(req.session, passwordInput.parse(req.body)); res.status(204).end(); });
  router.post(`${base}/users/:id/revoke-sessions`, async (req, res) => { await service.revoke(req.session, idInput.parse(req.params.id)); res.status(204).end(); });
  router.get(`${base}/audit`, async (req, res) => {
    const events = await service.read(req.session, 'audit.read', async trx => query(trx('identity_audit_events').select('id', 'actor_id', 'target_id', 'action', 'correlation', 'details', 'created_at').orderBy('id', 'desc').limit(100)));
    res.json({ events, limit: 100 });
  });
  router.use(base, (req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', reference: req.correlation } }));
  router.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    let status = err instanceof IdentityError ? err.status : 503;
    let code = err instanceof IdentityError ? err.code : 'IDENTITY_UNAVAILABLE';
    if (err.name === 'ZodError' || err.type === 'entity.parse.failed') { status = 400; code = 'INVALID_INPUT'; }
    if (err.type === 'entity.too.large') { status = 413; code = 'REQUEST_TOO_LARGE'; }
    if (err.code === 'EBADCSRFTOKEN') { status = 403; code = 'CSRF_REJECTED'; }
    if (err.code === 'ER_DUP_ENTRY') { status = 409; code = 'IDENTITY_CONFLICT'; }
    if (['ER_NO_REFERENCED_ROW_2','ER_ROW_IS_REFERENCED_2','ER_CHECK_CONSTRAINT_VIOLATED','ER_CONSTRAINT_FAILED'].includes(err.code)) { status=400;code='INVALID_REFERENCE_OR_CONSTRAINT'; }
    res.status(status).json({ error: { code, reference: req.correlation } });
  });
  return router;
}
