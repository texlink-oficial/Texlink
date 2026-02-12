jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { STORAGE_PROVIDER } from '../upload/storage.provider';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  companyUser: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  supplierProfile: {
    create: jest.fn(),
  },
  brandProfile: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockStorage = {
  resolveUrl: jest.fn((url: string | null | undefined) => Promise.resolve(url ?? null)),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupConfigDefaults() {
  mockConfigService.get.mockImplementation((key: string) => {
    const config: Record<string, string> = {
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.secret': 'test-secret',
      'jwt.refreshExpiresIn': '7d',
    };
    return config[key];
  });
}

const baseSupplierDto = {
  email: 'supplier@example.com',
  password: 'StrongPass1',
  name: 'Supplier User',
  role: 'SUPPLIER' as const,
  companyName: 'Supplier Co',
  document: '12345678000100',
  city: 'Sao Paulo',
  state: 'SP',
  phone: '11999999999',
};

const baseBrandDto = {
  email: 'brand@example.com',
  password: 'StrongPass1',
  name: 'Brand User',
  role: 'BRAND' as const,
  companyName: 'Brand Co',
  document: '98765432000100',
  city: 'Rio de Janeiro',
  state: 'RJ',
  phone: '21999999999',
};

const mockCreatedUser = {
  id: 'user-1',
  email: 'supplier@example.com',
  name: 'Supplier User',
  role: 'SUPPLIER',
  createdAt: new Date('2025-01-01'),
};

const mockCreatedCompany = {
  id: 'company-1',
};

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // ConfigService must return values before module compilation because
    // the AuthService constructor reads config in its initialiser block.
    setupConfigDefaults();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: STORAGE_PROVIDER, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // register()
  // =========================================================================

  describe('register()', () => {
    beforeEach(() => {
      // $transaction passes the prisma mock as the transaction client (tx)
      mockPrisma.$transaction.mockImplementation(async (callback) =>
        callback(mockPrisma),
      );
      mockJwtService.sign.mockReturnValue('mock-token');
    });

    it('should register a SUPPLIER user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.company.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);
      mockPrisma.company.create.mockResolvedValue(mockCreatedCompany);
      mockPrisma.companyUser.create.mockResolvedValue({});
      mockPrisma.supplierProfile.create.mockResolvedValue({});

      const result = await service.register(baseSupplierDto);

      expect(result.user).toEqual(mockCreatedUser);
      expect(result.company).toEqual(mockCreatedCompany);
      expect(result.needsOnboarding).toBe(true);

      // Verify company was created with SUPPLIER type
      expect(mockPrisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'SUPPLIER' }),
        }),
      );

      // Verify companyUser link was created
      expect(mockPrisma.companyUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            companyId: 'company-1',
            role: 'OWNER',
          }),
        }),
      );

      // Verify supplierProfile was created
      expect(mockPrisma.supplierProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            onboardingPhase: 1,
            onboardingComplete: false,
          }),
        }),
      );
    });

    it('should register a BRAND user successfully', async () => {
      const brandUser = {
        ...mockCreatedUser,
        id: 'user-2',
        email: baseBrandDto.email,
        name: baseBrandDto.name,
        role: 'BRAND',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.company.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(brandUser);
      mockPrisma.company.create.mockResolvedValue({ id: 'company-2' });
      mockPrisma.companyUser.create.mockResolvedValue({});
      mockPrisma.brandProfile.create.mockResolvedValue({});

      const result = await service.register(baseBrandDto);

      expect(result.user).toEqual(brandUser);
      expect(result.needsOnboarding).toBe(true);

      // Verify company was created with BRAND type
      expect(mockPrisma.company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'BRAND' }),
        }),
      );

      // Verify brandProfile was created (not supplierProfile)
      expect(mockPrisma.brandProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-2',
            onboardingPhase: 1,
            onboardingComplete: false,
          }),
        }),
      );
      expect(mockPrisma.supplierProfile.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(baseSupplierDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(baseSupplierDto)).rejects.toThrow(
        'Email already registered',
      );
    });

    it('should throw ConflictException when document (CNPJ) already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.company.findUnique.mockResolvedValue({
        id: 'existing-company',
      });

      await expect(service.register(baseSupplierDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(baseSupplierDto)).rejects.toThrow(
        'CNPJ/CPF já cadastrado',
      );
    });

    it('should return accessToken and refreshToken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.company.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);
      mockPrisma.company.create.mockResolvedValue(mockCreatedCompany);
      mockPrisma.companyUser.create.mockResolvedValue({});
      mockPrisma.supplierProfile.create.mockResolvedValue({});

      mockJwtService.sign
        .mockReturnValueOnce('access-token-value')
        .mockReturnValueOnce('refresh-token-value');

      const result = await service.register(baseSupplierDto);

      expect(result.accessToken).toBe('access-token-value');
      expect(result.refreshToken).toBe('refresh-token-value');
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('should hash the password with bcrypt using 12 rounds', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.company.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);
      mockPrisma.company.create.mockResolvedValue(mockCreatedCompany);
      mockPrisma.companyUser.create.mockResolvedValue({});
      mockPrisma.supplierProfile.create.mockResolvedValue({});

      await service.register(baseSupplierDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(baseSupplierDto.password, 12);

      // Verify the hashed password was passed to user.create
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: '$2b$12$hashedpassword',
          }),
        }),
      );
    });
  });

  // =========================================================================
  // login()
  // =========================================================================

  describe('login()', () => {
    const loginDto = { email: 'user@example.com', password: 'MyPassword1' };

    const mockUserWithCompany = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      role: 'SUPPLIER',
      passwordHash: '$2b$12$hashedpassword',
      isActive: true,
      companyUsers: [
        {
          company: {
            id: 'company-1',
            tradeName: 'Test Company',
            legalName: 'Test Company Ltda',
            type: 'SUPPLIER',
            status: 'ACTIVE',
            logoUrl: null,
          },
          createdAt: new Date('2025-01-01'),
        },
      ],
    };

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null); // no lockout, no attempts
      mockJwtService.sign.mockReturnValue('mock-token');
    });

    it('should login successfully with valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithCompany);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('user@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should return user data with company info', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithCompany);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.user.companyId).toBe('company-1');
      expect(result.user.companyName).toBe('Test Company');
      expect(result.user.companyType).toBe('SUPPLIER');
      expect(result.user.supplierId).toBe('company-1');
    });

    it('should throw UnauthorizedException for wrong email (user not found)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithCompany);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUserWithCompany, isActive: false };
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Account is inactive',
      );
    });

    it('should increment failed attempts on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithCompany);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockCacheService.get.mockResolvedValue(null); // 0 current attempts

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );

      // Should set attempts to 1 with TTL of 900 seconds
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `auth:attempts:${loginDto.email}`,
        1,
        900,
      );
    });

    it('should lockout after 5 failed attempts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithCompany);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Simulate 4 previous failed attempts
      mockCacheService.get.mockImplementation(async (key: string) => {
        if (key === `auth:attempts:${loginDto.email}`) return 4;
        return null;
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );

      // Should set lockout key
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `auth:lockout:${loginDto.email}`,
        'locked',
        900,
      );

      // Should clear the attempts counter
      expect(mockCacheService.del).toHaveBeenCalledWith(
        `auth:attempts:${loginDto.email}`,
      );
    });

    it('should throw UnauthorizedException when account is locked out', async () => {
      // Lockout key exists
      mockCacheService.get.mockImplementation(async (key: string) => {
        if (key === `auth:lockout:${loginDto.email}`) return 'locked';
        return null;
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Conta temporariamente bloqueada',
      );

      // Should not even attempt to find the user
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should clear failed attempts on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithCompany);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login(loginDto);

      expect(mockCacheService.del).toHaveBeenCalledWith(
        `auth:attempts:${loginDto.email}`,
      );
    });
  });

  // =========================================================================
  // refreshTokens()
  // =========================================================================

  describe('refreshTokens()', () => {
    const oldRefreshToken = 'old-refresh-token';

    const mockPayload = {
      sub: 'user-1',
      email: 'user@example.com',
      role: 'SUPPLIER',
      type: 'refresh',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    const mockActiveUser = {
      id: 'user-1',
      email: 'user@example.com',
      role: 'SUPPLIER',
      isActive: true,
    };

    beforeEach(() => {
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockCacheService.get.mockResolvedValue(null); // not blacklisted
    });

    it('should return new access and refresh tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockActiveUser);
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await service.refreshTokens(oldRefreshToken);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should blacklist the old refresh token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockActiveUser);
      mockJwtService.sign.mockReturnValue('new-token');

      await service.refreshTokens(oldRefreshToken);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        `auth:refresh:blacklist:${oldRefreshToken}`,
        'revoked',
        expect.any(Number),
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(service.refreshTokens('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens('bad-token')).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw UnauthorizedException for blacklisted (revoked) token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockActiveUser);
      mockCacheService.get.mockResolvedValue('revoked');

      await expect(service.refreshTokens(oldRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(oldRefreshToken)).rejects.toThrow(
        'Token has been revoked',
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockActiveUser,
        isActive: false,
      });

      await expect(service.refreshTokens(oldRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(oldRefreshToken)).rejects.toThrow(
        'User not found or inactive',
      );
    });

    it('should throw UnauthorizedException if user no longer exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens(oldRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(oldRefreshToken)).rejects.toThrow(
        'User not found or inactive',
      );
    });

    it('should verify the token with the refresh secret', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockActiveUser);
      mockJwtService.sign.mockReturnValue('new-token');

      await service.refreshTokens(oldRefreshToken);

      expect(mockJwtService.verify).toHaveBeenCalledWith(oldRefreshToken, {
        secret: 'test-refresh-secret',
      });
    });
  });

  // =========================================================================
  // logout()
  // =========================================================================

  describe('logout()', () => {
    it('should blacklist the refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const futureExp = Math.floor(Date.now() / 1000) + 3600;

      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        exp: futureExp,
      });

      await service.logout(refreshToken);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        `auth:refresh:blacklist:${refreshToken}`,
        'revoked',
        expect.any(Number),
      );
    });

    it('should handle expired/invalid token gracefully (no throw)', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      // Should NOT throw
      await expect(service.logout('expired-token')).resolves.toBeUndefined();
    });

    it('should not blacklist if TTL is zero or negative', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 10; // already expired

      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        exp: pastExp,
      });

      await service.logout('almost-expired-token');

      // cache.set should not be called when ttl <= 0
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getProfile()
  // =========================================================================

  describe('getProfile()', () => {
    const mockProfileUser = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      role: 'SUPPLIER',
      isActive: true,
      createdAt: new Date('2025-01-01'),
      companyUsers: [
        {
          company: {
            id: 'company-1',
            tradeName: 'Test Company',
            legalName: 'Test Company Ltda',
            type: 'SUPPLIER',
            status: 'ACTIVE',
            avgRating: 4.5,
            logoUrl: 'https://example.com/logo.png',
          },
          createdAt: new Date('2025-01-01'),
        },
      ],
    };

    it('should return user profile with company data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockProfileUser);

      const result = await service.getProfile('user-1');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('user@example.com');
      expect(result.companyId).toBe('company-1');
      expect(result.companyName).toBe('Test Company');
      expect(result.companyType).toBe('SUPPLIER');
      expect(result.supplierId).toBe('company-1');
    });

    it('should resolve logoUrl via the storage provider', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockProfileUser);

      await service.getProfile('user-1');

      expect(mockStorage.resolveUrl).toHaveBeenCalledWith(
        'https://example.com/logo.png',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.getProfile('nonexistent')).rejects.toThrow(
        'User not found',
      );
    });
  });

  // =========================================================================
  // updateProfile()
  // =========================================================================

  describe('updateProfile()', () => {
    const mockProfileUser = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      role: 'SUPPLIER',
      isActive: true,
      createdAt: new Date('2025-01-01'),
      companyUsers: [
        {
          company: {
            id: 'company-1',
            tradeName: 'Test Company',
            legalName: 'Test Company Ltda',
            type: 'SUPPLIER',
            status: 'ACTIVE',
            avgRating: 4.5,
            logoUrl: null,
          },
          createdAt: new Date('2025-01-01'),
        },
      ],
    };

    it('should update user name', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null); // no conflict
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockProfileUser,
        name: 'New Name',
      });

      const result = await service.updateProfile('user-1', {
        name: 'New Name',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'New Name' },
      });
      expect(result.name).toBe('New Name');
    });

    it('should throw ConflictException if email already taken', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'other-user',
        email: 'taken@example.com',
      });

      await expect(
        service.updateProfile('user-1', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.updateProfile('user-1', { email: 'taken@example.com' }),
      ).rejects.toThrow('Este email já está em uso');
    });

    it('should check email uniqueness excluding the current user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(mockProfileUser);

      await service.updateProfile('user-1', { email: 'new@example.com' });

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'new@example.com',
          id: { not: 'user-1' },
        },
      });
    });

    it('should not check email uniqueness when email is not provided', async () => {
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(mockProfileUser);

      await service.updateProfile('user-1', { name: 'New Name' });

      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('should call getProfile after updating to return the full profile', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(mockProfileUser);

      const result = await service.updateProfile('user-1', {
        name: 'New Name',
      });

      // getProfile is called internally, which calls user.findUnique
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
      expect(result.companyId).toBe('company-1');
    });
  });

  // =========================================================================
  // Constructor / Token Generation
  // =========================================================================

  describe('constructor and token generation', () => {
    it('should initialise refreshSecret from config', () => {
      // The service was already created in beforeEach with 'test-refresh-secret'
      // Verify by checking that refreshTokens uses it
      const token = 'some-token';
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'SUPPLIER',
        isActive: true,
      });
      mockCacheService.get.mockResolvedValue(null);
      mockJwtService.sign.mockReturnValue('new-token');

      service.refreshTokens(token);

      expect(mockJwtService.verify).toHaveBeenCalledWith(token, {
        secret: 'test-refresh-secret',
      });
    });

    it('should fall back to jwt.secret + "-refresh" when refreshSecret is not configured', async () => {
      jest.clearAllMocks();

      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string | undefined> = {
          'jwt.refreshSecret': undefined,
          'jwt.secret': 'fallback-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return config[key];
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: JwtService, useValue: mockJwtService },
          { provide: ConfigService, useValue: mockConfigService },
          { provide: CacheService, useValue: mockCacheService },
          { provide: STORAGE_PROVIDER, useValue: mockStorage },
        ],
      }).compile();

      const fallbackService = module.get<AuthService>(AuthService);

      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'SUPPLIER',
        isActive: true,
      });
      mockCacheService.get.mockResolvedValue(null);
      mockJwtService.sign.mockReturnValue('new-token');

      await fallbackService.refreshTokens('some-token');

      expect(mockJwtService.verify).toHaveBeenCalledWith('some-token', {
        secret: 'fallback-secret-refresh',
      });
    });

    it('should call jwtService.sign with correct payload for access token', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) =>
        callback(mockPrisma),
      );
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.company.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);
      mockPrisma.company.create.mockResolvedValue(mockCreatedCompany);
      mockPrisma.companyUser.create.mockResolvedValue({});
      mockPrisma.supplierProfile.create.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue('token');

      await service.register(baseSupplierDto);

      // First call is the access token (generateToken)
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'supplier@example.com',
        role: 'SUPPLIER',
      });

      // Second call is the refresh token (generateRefreshToken)
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: 'user-1',
          email: 'supplier@example.com',
          role: 'SUPPLIER',
          type: 'refresh',
        },
        {
          secret: 'test-refresh-secret',
          expiresIn: '7d',
        },
      );
    });
  });
});
