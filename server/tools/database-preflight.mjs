import { createDatabase } from '../src/identity/database.js';
import { databasePreflight,safePreflightDiagnostic } from '../src/identity/preflight.js';
let db;
try{db=createDatabase();console.info(JSON.stringify(await databasePreflight(db)));}
catch(error){console.error(`Database preflight stopped: ${safePreflightDiagnostic(error)}. Check the explicit local endpoint, normal InnoDB mode, migration state and dedicated grants. No startup, restore or migration was attempted.`);process.exitCode=1;}
finally{await db?.destroy();}
