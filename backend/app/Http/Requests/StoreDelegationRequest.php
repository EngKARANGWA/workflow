<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreDelegationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'delegate_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->whereIn('system_role', ['approver', 'system_administrator']),
            ],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            if ((int) $this->input('delegate_id') === $this->user()->id) {
                $validator->errors()->add('delegate_id', 'You cannot delegate to yourself.');
            }
        });
    }
}
