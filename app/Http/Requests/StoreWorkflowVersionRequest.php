<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesWorkflowSteps;
use Illuminate\Foundation\Http\FormRequest;

class StoreWorkflowVersionRequest extends FormRequest
{
    use ValidatesWorkflowSteps;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return $this->stepRules();
    }
}
