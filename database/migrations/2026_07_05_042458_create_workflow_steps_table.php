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
        Schema::create('workflow_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_version_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('step_order');
            // "single" = any one resolved approver's decision settles the step;
            // "all" = every resolved approver (across all of this step's approver
            // definitions, which may span several roles/users) must approve.
            $table->string('approval_type')->default('single');
            $table->json('conditions')->nullable();
            $table->timestamps();
            $table->unique(['workflow_version_id', 'step_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workflow_steps');
    }
};
