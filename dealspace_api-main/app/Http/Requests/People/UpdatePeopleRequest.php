<?php

namespace App\Http\Requests\People;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePeopleRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'name' => 'string|max:255',
            'first_name' => 'string|max:255',
            'last_name' => 'string|max:255',
            'prequalified' => 'boolean',
            'stage_id' => 'nullable|integer',
            'source' => 'string',
            'source_url' => 'nullable|url',
            'contacted' => 'integer',
            'price' => 'nullable|numeric',
            'assigned_lender_id' => 'nullable|exists:users,id',
            'assigned_user_id' => 'nullable|exists:users,id',
            'assigned_pond_id' => 'nullable|exists:ponds,id',
            'available_for_group_id' => 'nullable|exists:groups,id',
            'background' => 'nullable|string',
            'picture' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'timeframe_id' => 'nullable|integer',

            // Emails array
            'emails' => 'nullable|array',
            'emails.*.value' => 'required|email|max:255',
            'emails.*.type' => 'required|string|in:home,work,other',
            'emails.*.is_primary' => 'boolean',
            'emails.*.status' => 'string|in:Valid,Invalid,Not Validated',

            // Phones array
            'phones' => 'nullable|array',
            'phones.*.value' => 'required|string|max:20',
            'phones.*.type' => 'required|string|in:home,mobile,work,other',
            'phones.*.is_primary' => 'boolean',
            'phones.*.status' => 'string|in:Valid,Invalid,Not Validated',

            // Collaborators array
            'collaborators' => 'nullable|array',
            'collaborators.*.name' => 'required|string|max:255',
            'collaborators.*.assigned' => 'boolean',
            'collaborators.*.role' => 'nullable|string|max:100',

            // Addresses array
            'addresses' => 'nullable|array',
            'addresses.*.street_address' => 'required|string|max:255',
            'addresses.*.city' => 'required|string|max:100',
            'addresses.*.state' => 'required|string|max:100',
            'addresses.*.postal_code' => 'required|string|max:20',
            'addresses.*.country' => 'required|string|max:100',
            'addresses.*.type' => 'nullable|string|max:50',
            'addresses.*.is_primary' => 'boolean',

            // Tags array
            'tags' => 'nullable|array',
            'tags.*.name' => 'required|string|max:255',
            'tags.*.color' => 'nullable|string|max:50',
            'tags.*.description' => 'nullable|string|max:1000'
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
            // Email custom messages
            'emails.*.value.required' => 'Email address for entry #:position is required',
            'emails.*.value.email' => 'Email address for entry #:position is invalid',
            'emails.*.value.max' => 'Email address for entry #:position cannot exceed 255 characters',
            'emails.*.type.required' => 'Email type for entry #:position is required',
            'emails.*.type.in' => 'Email type for entry #:position must be one of: home, work, or other',
            'emails.*.is_primary.boolean' => 'Is primary flag for email entry #:position must be true or false',
            'emails.*.status.in' => 'Status for email entry #:position must be Valid, Invalid, or Not Validated',

            // Phone custom messages
            'phones.*.value.required' => 'Phone number for entry #:position is required',
            'phones.*.value.max' => 'Phone number for entry #:position cannot exceed 20 characters',
            'phones.*.type.required' => 'Phone type for entry #:position is required',
            'phones.*.type.in' => 'Phone type for entry #:position must be one of: home, mobile, work, or other',
            'phones.*.is_primary.boolean' => 'Is primary flag for phone entry #:position must be true or false',
            'phones.*.status.in' => 'Status for phone entry #:position must be Valid, Invalid, or Not Validated',

            // Collaborator custom messages
            'collaborators.*.name.required' => 'Collaborator name for entry #:position is required',
            'collaborators.*.name.max' => 'Collaborator name for entry #:position cannot exceed 255 characters',
            'collaborators.*.assigned.boolean' => 'Assigned status for collaborator #:position must be true or false',
            'collaborators.*.role.max' => 'Collaborator role for entry #:position cannot exceed 100 characters',

            // Address custom messages
            'addresses.*.street_address.required' => 'Street address for entry #:position is required',
            'addresses.*.street_address.max' => 'Street address for entry #:position cannot exceed 255 characters',
            'addresses.*.city.required' => 'City for address entry #:position is required',
            'addresses.*.city.max' => 'City for address entry #:position cannot exceed 100 characters',
            'addresses.*.state.required' => 'State for address entry #:position is required',
            'addresses.*.state.max' => 'State for address entry #:position cannot exceed 100 characters',
            'addresses.*.postal_code.required' => 'Postal code for address entry #:position is required',
            'addresses.*.postal_code.max' => 'Postal code for address entry #:position cannot exceed 20 characters',
            'addresses.*.country.required' => 'Country for address entry #:position is required',
            'addresses.*.country.max' => 'Country for address entry #:position cannot exceed 100 characters',
            'addresses.*.type.max' => 'Address type for entry #:position cannot exceed 50 characters',
            'addresses.*.is_primary.boolean' => 'Is primary flag for address entry #:position must be true or false',

            // Tag custom messages
            'tags.*.name.required' => 'Tag name for entry #:position is required',
            'tags.*.name.max' => 'Tag name for entry #:position cannot exceed 255 characters',
            'tags.*.color.max' => 'Tag color for entry #:position cannot exceed 50 characters',
            'tags.*.description.max' => 'Tag description for entry #:position cannot exceed 1000 characters',
            'picture.image' => 'The uploaded file must be an image.',
            'picture.mimes' => 'The picture must be a file of type: jpeg, png, jpg, gif.',
            'picture.max' => 'The picture may not be greater than 2MB.',
        ];
    }

    /**
     * Prepare the data for validation.
     *
     * @return void
     */
    protected function prepareForValidation()
    {
        // Convert array indices to human-readable positions (1-based instead of 0-based)
        $this->replace(
            collect($this->all())->map(function ($item, $key) {
                if (is_array($item) && in_array($key, ['emails', 'phones', 'collaborators', 'addresses', 'tags'])) {
                    return array_values($item);
                }
                return $item;
            })->toArray()
        );
    }
}
