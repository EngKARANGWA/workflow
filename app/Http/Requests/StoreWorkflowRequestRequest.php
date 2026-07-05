<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreWorkflowRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'workflow_id' => ['required', 'integer', 'exists:workflows,id'],
            'title' => ['required', 'string', 'max:255'],
            'data' => ['required', 'array'],
        ];
    }
}
