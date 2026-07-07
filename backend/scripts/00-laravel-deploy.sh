#!/usr/bin/env bash
echo "Running composer"
composer install --no-dev --working-dir=/var/www/html

echo "Caching config, routes, and events..."
php artisan optimize

echo "Running migrations..."
php artisan migrate --force

echo "Seeding (idempotent - safe to run on every deploy)..."
php artisan db:seed --force
