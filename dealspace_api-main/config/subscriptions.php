<?php

return [
    'plans' => [
        'free' => [
            'name' => 'Free',
            'price_id' => null,
            'price' => 0,
            'limits' => [
                'deals_per_month' => 10,
                'contacts' => 100,
                'users' => 1,
            ],
            'features' => [
                'Up to 10 deals per month',
                'Up to 100 contacts',
                '1 user',
                'Email support',
            ],
        ],
        'basic' => [
            'name' => 'Basic Plan',
            'price_id' => env('STRIPE_BASIC_PRICE_ID'),
            'price' => 9.99,
            'features' => [
                'Up to 5 deals per month',
                'Up to 100 contacts',
            ],
        ],
        'pro' => [
            'name' => 'Pro Plan',
            'price_id' => env('STRIPE_PRO_PRICE_ID'),
            'price' => 29.99,
            'features' => [
                'Unlimited deals',
                'Unlimited contacts',
                'Advanced reporting & analytics',
                'Priority email & chat support',
                'Custom fields',
                'API access',
            ],
        ],
        'enterprise' => [
            'name' => 'Enterprise Plan',
            'price_id' => env('STRIPE_ENTERPRISE_PRICE_ID'),
            'price' => 99.99,
            'features' => [
                'Everything in Pro',
                'Advanced integrations',
                'SLA guarantee',
                'Custom training',
                '24/7 phone support',
            ],
        ],
    ],
];