import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    Req,
    Headers,
    Get,
    Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import {
    LoginDto,
    RegisterDto,
    RefreshTokenDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    LoginResponseDto,
    RegisterResponseDto,
    TokensResponseDto,
} from './dto/auth.dto';
import { UserResponseDto } from '../user/dto/user.dto';
import { INTERNAL_HEADERS } from '@careflow/shared';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private userService: UserService,
    ) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, type: RegisterResponseDto })
    @ApiResponse({ status: 409, description: 'Email already exists' })
    async register(
        @Body() dto: RegisterDto,
        @Headers(INTERNAL_HEADERS.CORRELATION_ID) correlationId?: string,
    ): Promise<RegisterResponseDto> {
        return this.authService.register(dto, correlationId);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login and get tokens' })
    @ApiResponse({ status: 200, type: LoginResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(
        @Body() dto: LoginDto,
        @Req() req: Request,
        @Headers(INTERNAL_HEADERS.CORRELATION_ID) correlationId?: string,
    ): Promise<LoginResponseDto> {
        const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
        const userAgent = req.headers['user-agent'];

        return this.authService.login(dto, ipAddress, userAgent, correlationId);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({ status: 200, type: TokensResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refresh(
        @Body() dto: RefreshTokenDto,
        @Req() req: Request,
    ): Promise<TokensResponseDto> {
        const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
        const userAgent = req.headers['user-agent'];

        return this.authService.refresh(dto, userAgent, ipAddress);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout user' })
    @ApiResponse({ status: 200 })
    async logout(
        @Body() body: { refreshToken?: string },
        @Headers(INTERNAL_HEADERS.USER_ID) userId: string,
        @Headers(INTERNAL_HEADERS.CORRELATION_ID) correlationId?: string,
    ): Promise<{ message: string }> {
        await this.authService.logout(userId, body.refreshToken, correlationId);
        return { message: 'Logged out successfully' };
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request password reset' })
    @ApiResponse({ status: 200 })
    async forgotPassword(
        @Body() dto: ForgotPasswordDto,
        @Headers(INTERNAL_HEADERS.CORRELATION_ID) correlationId?: string,
    ): Promise<{ message: string }> {
        return this.authService.forgotPassword(dto, correlationId);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password with token' })
    @ApiResponse({ status: 200 })
    @ApiResponse({ status: 400, description: 'Invalid token' })
    async resetPassword(
        @Body() dto: ResetPasswordDto,
        @Headers(INTERNAL_HEADERS.CORRELATION_ID) correlationId?: string,
    ): Promise<{ message: string }> {
        return this.authService.resetPassword(dto, correlationId);
    }

    @Get('users/:id')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, type: UserResponseDto })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
        return this.userService.findById(id);
    }
}