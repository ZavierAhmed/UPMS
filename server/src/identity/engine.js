// MariaDB local-development acceptance is explicit and independent of Oracle MySQL.
export function validateEngine(version, env = process.env) {
  const match = /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:[-+].*)?$/.exec(version || '');
  if (!match) throw new Error('Unrecognized database version.');
  const parts = match.slice(1, 4).map(Number);
  const atLeast = minimum => parts[0] > minimum[0] || (parts[0] === minimum[0] &&
    (parts[1] > minimum[1] || (parts[1] === minimum[1] && parts[2] >= minimum[2])));
  if (/MariaDB/i.test(version)) {
    if (env.DB_ALLOW_MARIADB_COMPATIBILITY !== 'true') throw new Error('Explicit MariaDB opt-in required.');
    if (!atLeast([10, 4, 32])) throw new Error('MariaDB below the reviewed 10.4.32 baseline is unsupported.');
    if (env.NODE_ENV === 'production') throw new Error('This MariaDB acceptance is limited to local development.');
    return { product: 'MariaDB', localDevelopmentOnly: true, legacy104: parts[0] === 10 && parts[1] === 4 };
  }
  if (!atLeast([8, 0, 16])) throw new Error('Oracle MySQL 8.0.16 or newer required.');
  return { product: 'Oracle MySQL', localDevelopmentOnly: false };
}
