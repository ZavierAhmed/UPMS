// Deliberately no HTTP listener and no database import. Not a hosting start hook.
process.stderr.write('CLI-only diagnostic. Use a provider-supported private terminal or private one-off job with npm run diagnose -- --run-read-only. No web server was started.\n');
process.exitCode=2;
