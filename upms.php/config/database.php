<?php

declare(strict_types=1);

// UPMS uses the explicitly guarded PDO compatibility adapter, never Laravel's
// default schema, migrations, sessions or database-backed queues/cache.
return ['default' => 'disabled', 'connections' => []];
