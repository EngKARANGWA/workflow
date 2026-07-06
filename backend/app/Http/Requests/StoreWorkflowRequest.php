<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesWorkflowSteps;
use Illuminate\Foundation\Http\FormRequest;

class StoreWorkflowRequest extends FormRequest
{
    use ValidatesWorkflowSteps;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            ...$this->stepRules(),
        ];
    }
}
