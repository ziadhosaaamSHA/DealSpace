<?php

return [
    'free' => [
        'name' => 'Free',
        'description' => 'Perfect for trying out DealSpace',
        'price' => 0,
        'stripe_price_id' => null,
        'features' => [
            'Up to 5 users',
            '10 deals',
            '10 contacts',
        ],
        'limits' => [
            'users' => 5,
            'deals' => 10,
            'contacts' => 10,
        ],
    ],
    
    'basic' => [
        'name' => 'Basic',
        'description' => 'Great for small teams',
        'price' => 24.99,
        'stripe_price_id' => env('STRIPE_BASIC_PRICE_ID'),
        'features' => [
            'Up to 15 users',
            'Unlimited deals',
            '50 contacts',
            'Email & chat support',
        ],
        'limits' => [
            'users' => 15,
            'deals' => null, // unlimited
            'contacts' => 50,
        ],
    ],
    
    'pro' => [
        'name' => 'Pro',
        'description' => 'For growing businesses',
        'price' => 99.99,
        'stripe_price_id' => env('STRIPE_PRO_PRICE_ID'),
        'features' => [
            'Up to 25 users',
            'Unlimited deals',
            '500 contacts',
        ],
        'limits' => [
            'users' => 25,
            'deals' => null,
            'contacts' => 500,
        ],
    ],
    
    'enterprise' => [
        'name' => 'Enterprise',
        'description' => 'For large organizations',
        'price' => 199.99,
        'stripe_price_id' => env('STRIPE_ENTERPRISE_PRICE_ID'),
        'features' => [
            'Unlimited users',
            'Unlimited everything',
            'Dedicated support',
        ],
        'limits' => [
            'users' => null,
            'deals' => null,
            'contacts' => null,
        ],
    ],
];