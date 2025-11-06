<?php

return [
    'free' => [
        'name' => 'Free',
        'description' => 'Perfect for trying out DealSpace',
        'price' => 0,
        'stripe_price_id' => null,
        'features' => [
            'Up to 3 users',
            '10 deals per month',
            '50 contacts',
            'Basic email support',
        ],
        'limits' => [
            'users' => 5,
            'deals' => 4,
            'contacts' => 5,
            'campaigns' => 1,
            'automations' => 0,
            'storage_gb' => 1,
        ],
    ],
    
    'basic' => [
        'name' => 'Basic',
        'description' => 'Great for small teams',
        'price' => 29,
        'stripe_price_id' => env('STRIPE_BASIC_PRICE_ID'),
        'features' => [
            'Up to 10 users',
            'Unlimited deals',
            '500 contacts',
            'Email & chat support',
            '2 automations',
        ],
        'limits' => [
            'users' => 10,
            'deals' => null, // unlimited
            'contacts' => 500,
            'campaigns' => 5,
            'automations' => 2,
            'storage_gb' => 10,
        ],
    ],
    
    'pro' => [
        'name' => 'Pro',
        'description' => 'For growing businesses',
        'price' => 79,
        'stripe_price_id' => env('STRIPE_PRO_PRICE_ID'),
        'features' => [
            'Up to 25 users',
            'Unlimited deals',
            'Unlimited contacts',
            'Priority support',
            '10 automations',
            'Advanced analytics',
        ],
        'limits' => [
            'users' => 25,
            'deals' => null,
            'contacts' => null,
            'campaigns' => 20,
            'automations' => 10,
            'storage_gb' => 50,
        ],
    ],
    
    'enterprise' => [
        'name' => 'Enterprise',
        'description' => 'For large organizations',
        'price' => 199,
        'stripe_price_id' => env('STRIPE_ENTERPRISE_PRICE_ID'),
        'features' => [
            'Unlimited users',
            'Unlimited everything',
            'Dedicated support',
            'Custom integrations',
            'Unlimited automations',
            'Advanced security',
        ],
        'limits' => [
            'users' => null,
            'deals' => null,
            'contacts' => null,
            'campaigns' => null,
            'automations' => null,
            'storage_gb' => null,
        ],
    ],
];