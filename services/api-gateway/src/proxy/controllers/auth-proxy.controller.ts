import { Controller, Post, Body, Req, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService, ServiceTarget } from '../proxy.service';
import { Public, CurrentUser } from '../../common/decorators';
import { UserContext } from '@careflow/shared';
import {
    LoginDto,
    RegisterDto,
    RefreshTokenDto,
    LoginResponseDto,
    RegisterResponseDto,
    UserProfileDto,
} from './dto/auth.dto';

/**
 * Auth Proxy Controller
 *
 * Proxies authentication requests to Auth Service.
 *
 * Public endpoints (no JWT required):
 * - POST /auth/login
 * - POST /auth/register
 * - POST /auth/refresh
 *
 * Protected endpoints:
 * - GET /auth/me
 * - POST /auth/logout
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthProxyController {
    constructor(private proxyService: ProxyService) {}

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Authenticate user and get JWT tokens' })
    @ApiResponse({ status: 200, description: 'Login successful', type: LoginResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() loginDto: LoginDto, @Req() request: Request): Promise<LoginResponseDto> {
        return this.proxyService.forward<LoginResponseDto>(
            ServiceTarget.AUTH,
            request,
            '/auth/login',
            { data: loginDto },
        );
    }

    @Public()
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register a new user account' })
    @ApiResponse({ status: 201, description: 'Registration successful', type: RegisterResponseDto })
    @ApiResponse({ status: 409, description: 'Email already exists' })
    async register(
        @Body() registerDto: RegisterDto,
        @Req() request: Request,
    ): Promise<RegisterResponseDto> {
        return this.proxyService.forward<RegisterResponseDto>(
            ServiceTarget.AUTH,
            request,
            '/auth/register',
            { data: registerDto },
        );
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
    @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
    async refreshToken(
        @Body() refreshDto: RefreshTokenDto,
        @Req() request: Request,
    ): Promise<LoginResponseDto> {
        return this.proxyService.forward<LoginResponseDto>(
            ServiceTarget.AUTH,
            request,
            '/auth/refresh',
            { data: refreshDto },
        );
    }

    @Get('me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'User profile', type: UserProfileDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getProfile(
        @CurrentUser() user: UserContext,
        @Req() request: Request,
    ): Promise<UserProfileDto> {
        return this.proxyService.forward<UserProfileDto>(
            ServiceTarget.AUTH,
            request,
            `/auth/users/${user.userId}`,
        );
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout and invalidate tokens' })
    @ApiResponse({ status: 200, description: 'Logout successful' })
    async logout(
        @CurrentUser() user: UserContext,
        @Req() request: Request,
    ): Promise<{ message: string }> {
        return this.proxyService.forward(ServiceTarget.AUTH, request, '/auth/logout');
    }

    @Public()
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request password reset email' })
    @ApiResponse({ status: 200, description: 'Password reset email sent' })
    async forgotPassword(
        @Body() body: { email: string },
        @Req() request: Request,
    ): Promise<{ message: string }> {
        return this.proxyService.forward(ServiceTarget.AUTH, request, '/auth/forgot-password', {
            data: body,
        });
    }

    @Public()
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password with token' })
    @ApiResponse({ status: 200, description: 'Password reset successful' })
    async resetPassword(
        @Body() body: { token: string; newPassword: string },
        @Req() request: Request,
    ): Promise<{ message: string }> {
        return this.proxyService.forward(ServiceTarget.AUTH, request, '/auth/reset-password', {
            data: body,
        });
    }
}
