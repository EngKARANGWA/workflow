<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function a_user_can_register_and_always_becomes_a_requester(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'New User',
            'email' => 'new@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated();
        $this->assertSame('requester', $response->json('user.system_role'));
        $this->assertDatabaseHas('users', ['email' => 'new@example.com', 'system_role' => 'requester']);
    }

    #[Test]
    public function a_user_can_log_in_with_correct_credentials_and_not_with_incorrect_ones(): void
    {
        User::factory()->create(['email' => 'jane@example.com', 'password' => 'correct-password']);

        $this->postJson('/api/auth/login', ['email' => 'jane@example.com', 'password' => 'correct-password'])
            ->assertOk()
            ->assertJsonStructure(['user', 'token']);

        $this->postJson('/api/auth/login', ['email' => 'jane@example.com', 'password' => 'wrong-password'])
            ->assertUnprocessable();
    }

    #[Test]
    public function unauthenticated_requests_are_rejected_with_401(): void
    {
        $this->getJson('/api/auth/me')->assertStatus(401);
        $this->getJson('/api/workflows')->assertStatus(401);
    }

    #[Test]
    public function non_admins_cannot_access_admin_only_endpoints(): void
    {
        $requester = User::factory()->create();

        $this->actingAs($requester, 'sanctum')
            ->postJson('/api/workflows', ['name' => 'X', 'steps' => []])
            ->assertStatus(403);

        $this->actingAs($requester, 'sanctum')
            ->getJson('/api/users')
            ->assertStatus(403);
    }

    #[Test]
    public function admins_can_access_admin_only_endpoints(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/users')
            ->assertOk();
    }
}
