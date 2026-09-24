import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const database = {
    configured: false,
    findUser: jest.fn().mockResolvedValue(null),
    saveSession: jest.fn().mockResolvedValue(undefined),
    findSession: jest.fn().mockResolvedValue(null),
    revokeSession: jest.fn().mockResolvedValue(undefined),
  } as any;

  it('logs in the prototype super admin and resolves the session', async () => {
    const auth = new AuthService(database);
    const result = await auth.login('admin', 'admin');
    expect(result.user.role).toBe('super_admin');
    expect((await auth.me(result.accessToken)).role).toBe('super_admin');
  });

  it('rejects invalid credentials', async () => {
    const auth = new AuthService(database);
    await expect(auth.login('admin', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes a logged-in session', async () => {
    const auth = new AuthService(database);
    const result = await auth.login('merchant', 'merchant');
    await auth.logout(result.accessToken);
    await expect(auth.me(result.accessToken)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(database.revokeSession).toHaveBeenCalledWith(result.accessToken);
  });
});
