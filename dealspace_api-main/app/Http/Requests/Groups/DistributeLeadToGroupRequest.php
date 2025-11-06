<?php

namespace App\Http\Requests\Groups;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DistributeLeadToGroupRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true; // Update this based on your authorization logic
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules()
    {
        return [
            'groupId' => 'required|integer|exists:groups,id',
            'personId' => 'required|integer|exists:people,id',
        ];
    }
    /**
     * Get custom messages for validator errors.
     *
     * @return array
     */
    public function messages()
    {
        return [
            'groupId.required' => 'The group ID is required.',
            'groupId.integer' => 'The group ID must be an integer.',
            'groupId.exists' => 'The specified group does not exist.',
            'personId.required' => 'The person ID is required.',
            'personId.integer' => 'The person ID must be an integer.',
            'personId.exists' => 'The specified person does not exist.',
        ];
    }

    /**
     * Prepare the data for validation.
     *
     * @return void
     */
    protected function prepareForValidation()
    {
        $this->merge([
            'groupId' => $this->route('groupId'),
            'personId' => $this->route('personId'),
        ]);
    }

}