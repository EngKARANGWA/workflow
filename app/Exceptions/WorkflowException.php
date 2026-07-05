<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A business-rule violation in the workflow engine (e.g. acting on a request
 * with no active step, double-voting on a step) as opposed to a validation
 * or authorization failure - rendered as 422 by default. See bootstrap/app.php.
 */
class WorkflowException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 422)
    {
        parent::__construct($message);
    }
}
