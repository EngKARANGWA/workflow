<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Only the frontend origins listed below (plus FRONTEND_URLS in .env,
    | comma-separated, for extra deploys/previews) may call this API from a
    | browser. Auth is Bearer-token based, not cookie based, so credentials
    | support isn't needed here.
    |
    */

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_merge([
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://workflow-c7zp.vercel.app',
        'https://workflow-beryl-three.vercel.app',
    ], array_map('trim', explode(',', env('FRONTEND_URLS', '')))))),

    'allowed_origins_patterns' => [
        '#^https://workflow-[a-z0-9-]+\.vercel\.app$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
