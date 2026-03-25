import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { IntegrationService } from '../integrations/services/integration.service';
import { AuditService } from '../audit/audit.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  refreshTokens: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  logout: jest.fn(),
  toggleSuperAdmin: jest.fn(),
};

const mockIntegrationService = {
  validateCNPJ: jest.fn(),
  sendEmail: jest.fn(),
};

const mockAuditService = {
  log: jest.fn(),
};

const mockReq = {
  ip: '127.0.0.1',
  headers: { 'user-agent': 'test-agent' },
} as unknown as import('express').Request;

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: IntegrationService, useValue: mockIntegrationService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // POST /auth/login
  // =========================================================================

  describe('POST /auth/login', () => {
    const loginDto = { email: 'user@example.com', password: 'StrongPass1' };

    it('should return 200 with user data and tokens on successful login', async () => {
      const loginResponse = {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          name: 'Test User',
          role: 'SUPPLIER',
          companyId: 'company-1',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.login.mockResolvedValue(loginResponse);

      const result = await controller.login(loginDto, mockReq);

      expect(result).toEqual(loginResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should propagate UnauthorizedException for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('E-mail ou senha incorretos'),
      );

      await expect(controller.login(loginDto, mockReq)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should call authService.login exactly once', async () => {
      mockAuthService.login.mockResolvedValue({
        user: {},
        accessToken: 'token',
        refreshToken: 'refresh',
      });

      await controller.login(loginDto, mockReq);

      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // POST /auth/register
  // =========================================================================

  describe('POST /auth/register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'StrongPass1',
      name: 'New User',
      role: 'SUPPLIER' as const,
      legalName: 'New Co',
      document: '12345678000100',
      city: 'Sao Paulo',
      state: 'SP',
      phone: '11999999999',
    };

    it('should return created user with tokens on successful registration', async () => {
      const registerResponse = {
        user: {
          id: 'user-2',
          email: 'new@example.com',
          name: 'New User',
          role: 'SUPPLIER',
        },
        company: { id: 'company-2' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        needsOnboarding: true,
      };

      mockAuthService.register.mockResolvedValue(registerResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual(registerResponse);
      expect(result.needsOnboarding).toBe(true);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should propagate ConflictException for duplicate email', async () => {
      mockAuthService.register.mockRejectedValue(
        new ConflictException('Este e-mail ja esta cadastrado'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should propagate ConflictException for duplicate CNPJ', async () => {
      mockAuthService.register.mockRejectedValue(
        new ConflictException('CNPJ/CPF ja cadastrado'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // =========================================================================
  // POST /auth/forgot-password
  // =========================================================================

  describe('POST /auth/forgot-password', () => {
    const forgotDto = { email: 'user@example.com' };

    it('should return 200 with success message regardless of email existence', async () => {
      const response = {
        message:
          'Se o e-mail estiver cadastrado, voce recebera um link para redefinir sua senha.',
      };

      mockAuthService.forgotPassword.mockResolvedValue(response);

      const result = await controller.forgotPassword(forgotDto, mockReq);

      expect(result.message).toContain('e-mail estiver cadastrado');
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(forgotDto);
    });

    it('should call authService.forgotPassword with the DTO', async () => {
      mockAuthService.forgotPassword.mockResolvedValue({ message: 'ok' });

      await controller.forgotPassword(forgotDto, mockReq);

      expect(mockAuthService.forgotPassword).toHaveBeenCalledTimes(1);
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(forgotDto);
    });
  });

  // =========================================================================
  // POST /auth/reset-password
  // =========================================================================

  describe('POST /auth/reset-password', () => {
    const resetDto = {
      token: 'valid-token-hex',
      password: 'NewStrongPass1',
    };

    it('should return 200 with success message on valid token', async () => {
      const response = { message: 'Senha redefinida com sucesso.' };

      mockAuthService.resetPassword.mockResolvedValue(response);

      const result = await controller.resetPassword(resetDto, mockReq);

      expect(result.message).toContain('Senha redefinida');
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(resetDto);
    });

    it('should propagate BadRequestException for invalid token', async () => {
      mockAuthService.resetPassword.mockRejectedValue(
        new BadRequestException('Token invalido ou expirado'),
      );

      await expect(controller.resetPassword(resetDto, mockReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate BadRequestException for expired token', async () => {
      mockAuthService.resetPassword.mockRejectedValue(
        new BadRequestException('Este link expirou'),
      );

      await expect(controller.resetPassword(resetDto, mockReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate BadRequestException for already-used token', async () => {
      mockAuthService.resetPassword.mockRejectedValue(
        new BadRequestException('Este link ja foi utilizado'),
      );

      await expect(controller.resetPassword(resetDto, mockReq)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // POST /auth/refresh
  // =========================================================================

  describe('POST /auth/refresh', () => {
    it('should return 200 with new tokens on valid refresh token', async () => {
      const refreshResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshTokens.mockResolvedValue(refreshResponse);

      const result = await controller.refreshTokens('old-refresh-token');

      expect(result).toEqual(refreshResponse);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        'old-refresh-token',
      );
    });

    it('should throw BadRequestException when refreshToken is missing', async () => {
      await expect(
        controller.refreshTokens(undefined as unknown as string),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when refreshToken is empty string', async () => {
      await expect(controller.refreshTokens('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should propagate UnauthorizedException for invalid/expired refresh token', async () => {
      mockAuthService.refreshTokens.mockRejectedValue(
        new UnauthorizedException('Sessao invalida'),
      );

      await expect(
        controller.refreshTokens('invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // GET /auth/me
  // =========================================================================

  describe('GET /auth/me', () => {
    it('should return 200 with user profile data', async () => {
      const profileData = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'SUPPLIER',
        companyId: 'company-1',
        companyName: 'Test Company',
        companyType: 'SUPPLIER',
        supplierId: 'company-1',
      };

      mockAuthService.getProfile.mockResolvedValue(profileData);

      const result = await controller.getProfile('user-1');

      expect(result).toEqual(profileData);
      expect(mockAuthService.getProfile).toHaveBeenCalledWith('user-1');
    });

    it('should propagate UnauthorizedException when user not found', async () => {
      mockAuthService.getProfile.mockRejectedValue(
        new UnauthorizedException('User not found'),
      );

      await expect(controller.getProfile('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // =========================================================================
  // PATCH /auth/me
  // =========================================================================

  describe('PATCH /auth/me', () => {
    it('should update user profile and return updated data', async () => {
      const updatedProfile = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Updated Name',
        role: 'SUPPLIER',
        companyId: 'company-1',
      };

      mockAuthService.updateProfile.mockResolvedValue(updatedProfile);

      const result = await controller.updateProfile('user-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(mockAuthService.updateProfile).toHaveBeenCalledWith('user-1', {
        name: 'Updated Name',
      });
    });

    it('should propagate ConflictException for duplicate email', async () => {
      mockAuthService.updateProfile.mockRejectedValue(
        new ConflictException('Este email ja esta em uso'),
      );

      await expect(
        controller.updateProfile('user-1', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // =========================================================================
  // POST /auth/logout
  // =========================================================================

  describe('POST /auth/logout', () => {
    it('should return success message on logout', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout('some-refresh-token', 'user-1', mockReq);

      expect(result.message).toBe('Logged out successfully');
      expect(mockAuthService.logout).toHaveBeenCalledWith(
        'some-refresh-token',
      );
    });

    it('should not call authService.logout when no refreshToken is provided', async () => {
      const result = await controller.logout(undefined as unknown as string, 'user-1', mockReq);

      expect(result.message).toBe('Logged out successfully');
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });
  });
});
