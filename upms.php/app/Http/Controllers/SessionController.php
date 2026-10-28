<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Middleware\UpmsBoundary;
use App\Upms\ApiError;
use App\Upms\Database;
use App\Upms\Identity;
use Illuminate\Http\Request;

final class SessionController
{
    public function __construct(private readonly Database $db, private readonly Identity $identity)
    {
    }

    public function csrf(Request $request): mixed
    {
        $session = $request->attributes->get('upms.session');
        if ($session) {
            return response()->json(['csrfToken' => $this->identity->csrf($session)]);
        }
        $created = $this->db->transaction(fn () => $this->identity->create());
        return response()->json(['csrfToken' => $created['csrfToken']])->withCookie(UpmsBoundary::cookie($created['token']));
    }

    private function input(Request $request, array $limits, int $status = 400): array
    {
        $input = $request->json()->all();
        if (array_diff(array_keys($input), array_keys($limits)) || array_diff(array_keys($limits), array_keys($input))) {
            throw new ApiError($status, $status === 401 ? 'INVALID_CREDENTIALS' : 'INVALID_INPUT');
        }
        foreach ($limits as $key => [$min, $max]) {
            if (!is_string($input[$key]) || \App\Upms\Passwords::inputLength($input[$key]) < $min || \App\Upms\Passwords::inputLength($input[$key]) > $max) {
                throw new ApiError($status, $status === 401 ? 'INVALID_CREDENTIALS' : 'INVALID_INPUT');
            }
        }
        return $input;
    }

    public function login(Request $request): mixed
    {
        $input = $this->input($request, ['username' => [1, 64], 'password' => [1, 128]], 401);
        $user = $this->identity->login($input['username'], $input['password']);
        if (!$user) {
            throw new ApiError(401, 'INVALID_CREDENTIALS');
        }
        $created = $this->db->transaction(function () use ($request, $user): array {
            $current = $this->identity->user($user['id']);
            if ($current['version'] !== $user['version'] || !in_array('portal.access', $current['permissions'], true)) {
                throw new ApiError(401, 'SESSION_EXPIRED');
            }
            $this->identity->revoke($request->attributes->get('upms.session'));
            return $this->identity->create($current);
        });
        return response()->json(['user' => $user, 'csrfToken' => $created['csrfToken']])->withCookie(UpmsBoundary::cookie($created['token']));
    }

    public function current(Request $request): mixed
    {
        $session = $request->attributes->get('upms.session');
        $user = $this->identity->read($session, 'profile.read', fn ($user) => $user);
        return response()->json(['user' => $user, 'csrfToken' => $this->identity->csrf($session)]);
    }

    public function logout(Request $request): mixed
    {
        $this->db->transaction(function () use ($request): void {
            $session = $request->attributes->get('upms.session');
            $user = $this->identity->authorize($session, 'portal.access');
            $this->identity->revoke($session);
            $this->identity->audit($user['id'], 'session.logout');
        });
        return response()->noContent()->withCookie(UpmsBoundary::cookie('', true));
    }

    public function password(Request $request): mixed
    {
        $input = $this->input($request, ['currentPassword' => [0, 128], 'newPassword' => [12, 128]]);
        $this->identity->changePassword($request->attributes->get('upms.session'), $input['currentPassword'], $input['newPassword']);
        return response()->noContent();
    }
}
