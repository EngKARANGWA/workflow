<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('system_role')->default('requester')->after('password');
            $table->string('department')->nullable()->after('system_role');
            $table->string('employee_level')->nullable()->after('department');
            $table->string('country')->nullable()->after('employee_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['system_role', 'department', 'employee_level', 'country']);
        });
    }
};
