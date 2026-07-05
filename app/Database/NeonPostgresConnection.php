<?php

namespace App\Database;

use DateTimeInterface;
use Illuminate\Database\PostgresConnection;

/**
 * Neon's pooled endpoint (PgBouncer-style, transaction-pooling mode) doesn't
 * reliably support server-side prepared statements reused across statements
 * within one transaction - a second bound query in the same transaction gets
 * silently corrupted server-side ("current transaction is aborted") even
 * though the first one succeeds. The fix is forcing PDO's emulated prepares
 * (config/database.php), which sends fully-inlined SQL instead.
 *
 * That flips a second, independent issue: emulated prepares substitute a PHP
 * bool as a bare integer literal (1/0), and Postgres - unlike MySQL/SQLite -
 * has a real boolean column type that won't implicitly cast from an integer
 * literal. Laravel's base Connection::prepareBindings() always does that
 * integer cast regardless of driver, so it has to be overridden here to emit
 * the string literals 'true'/'false' that a real boolean column accepts.
 */
class NeonPostgresConnection extends PostgresConnection
{
    public function prepareBindings(array $bindings)
    {
        $grammar = $this->getQueryGrammar();

        foreach ($bindings as $key => $value) {
            if ($value instanceof DateTimeInterface) {
                $bindings[$key] = $value->format($grammar->getDateFormat());
            } elseif (is_bool($value)) {
                $bindings[$key] = $value ? 'true' : 'false';
            }
        }

        return $bindings;
    }
}
