<?php

namespace Database\Seeders;

use App\Enums\SystemRole;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seeds the one thing the API cannot create on its own: the first
     * administrator account (user management endpoints require admin auth
     * already, so someone has to exist before anyone can call them).
     * Also seeds a starting set of business roles used for step routing.
     */
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@workflow.test'],
            [
                'name' => 'System Administrator',
                'password' => 'password',
                'system_role' => SystemRole::Admin,
            ]
        );

        foreach (['Finance', 'Legal', 'HR', 'Manager', 'CEO'] as $role) {
            Role::firstOrCreate(['name' => $role]);
        }
    }
}
