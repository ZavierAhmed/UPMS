let active = 0;
// Load the native implementation only when identity hashing is actually requested.
// Disabled management must not make the public website depend on native addon loading.
let implementation;
const library = () => implementation ||= import('argon2').then(module => module.default);
export const passwordOptions = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
export class IdentityError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
async function bounded(action) {
  if (active >= 2) throw new IdentityError(429, 'BUSY');
  active++;
  try { return await action(); } finally { active--; }
}
export const hashPassword = password => bounded(async () => {
  const argon2 = await library();
  return argon2.hash(password, { ...passwordOptions, type: argon2.argon2id });
});
export const verifyPassword = (hash, password) => bounded(async () => (await library()).verify(hash, password));
