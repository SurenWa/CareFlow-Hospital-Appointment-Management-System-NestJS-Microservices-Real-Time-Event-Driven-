import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserDocument } from '../user/schemas/user.schema';
import { UserService } from '../user/user.service';
import { AppConfigService } from '../config';
import { RabbitMQService } from '../rabbitmq';
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
import { JwtPayload, EventName, UserRole } from '@careflow/shared';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private jwtService: JwtService,
        private userService: UserService,
        private config: AppConfigService,
        private rabbitMQ: RabbitMQService,
    ) { }

    async register(dto: RegisterDto, correlationId?: string): Promise<RegisterResponseDto> {
        const user = await this.userService.create(
            {
                email: dto.email,
                password: dto.password,
                firstName: dto.firstName,
                lastName: dto.lastName,
                phoneNumber: dto.phoneNumber,
                roles: [UserRole.PATIENT],
            },
            correlationId,
        );

        return {
            userId: user.id,
            email: user.email,
            message: 'Registration successful',
        };
    }

    async login(
        dto: LoginDto,
        ipAddress?: string,
        userAgent?: string,
        correlationId?: string,
    ): Promise<LoginResponseDto> {
        const user = await this.userService.findByEmail(dto.email);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Account is deactivated');
        }

        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
            const remainingMinutes = Math.ceil(
                (user.lockoutUntil.getTime() - Date.now()) / 60000,
            );
            throw new UnauthorizedException(
                `Account locked. Try again in ${remainingMinutes} minutes`,
            );
        }

        const isPasswordValid = await this.userService.validatePassword(
            dto.password,
            user.passwordHash,
        );

        if (!isPasswordValid) {
            await this.userService.recordFailedLogin(user._id.toString());
            throw new UnauthorizedException('Invalid credentials');
        }

        await this.userService.recordSuccessfulLogin(user._id.toString(), ipAddress);

        const tokens = await this.generateTokens(user, userAgent, ipAddress);

        await this.rabbitMQ.publishEvent(
            EventName.USER_LOGIN,
            {
                userId: user._id.toString(),
                email: user.email,
                ipAddress,
                timestamp: new Date().toISOString(),
            },
            correlationId,
        );

        this.logger.log(`User logged in: ${user.email}`);

        return {
            ...tokens,
            user: {
                id: user._id.toString(),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                roles: user.roles,
            },
        };
    }

    async refresh(
        dto: RefreshTokenDto,
        userAgent?: string,
        ipAddress?: string,
    ): Promise<TokensResponseDto> {
        const user = await this.userModel.findOne({
            'refreshTokens.token': dto.refreshToken,
        });

        if (!user) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const tokenEntry = user.refreshTokens.find(
            (rt) => rt.token === dto.refreshToken,
        );

        if (!tokenEntry || tokenEntry.expiresAt < new Date()) {
            user.refreshTokens = user.refreshTokens.filter(
                (rt) => rt.token !== dto.refreshToken,
            );
            await user.save();
            throw new UnauthorizedException('Refresh token expired');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Account is deactivated');
        }

        user.refreshTokens = user.refreshTokens.filter(
            (rt) => rt.token !== dto.refreshToken,
        );

        const tokens = await this.generateTokens(user, userAgent, ipAddress);

        this.logger.debug(`Token refreshed for user: ${user.email}`);

        return tokens;
    }

    async logout(
        userId: string,
        refreshToken?: string,
        correlationId?: string,
    ): Promise<void> {
        const user = await this.userModel.findById(userId);

        if (!user) return;

        if (refreshToken) {
            user.refreshTokens = user.refreshTokens.filter(
                (rt) => rt.token !== refreshToken,
            );
        } else {
            user.refreshTokens = [];
        }

        await user.save();

        await this.rabbitMQ.publishEvent(
            EventName.USER_LOGOUT,
            { userId: user._id.toString(), email: user.email },
            correlationId,
        );

        this.logger.log(`User logged out: ${user.email}`);
    }

    async forgotPassword(
        dto: ForgotPasswordDto,
        correlationId?: string,
    ): Promise<{ message: string }> {
        const user = await this.userService.findByEmail(dto.email);
        const successMessage = 'If an account exists, a password reset email will be sent';

        if (!user) {
            return { message: successMessage };
        }

        const resetToken = uuidv4();
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

        user.passwordResetToken = resetToken;
        user.passwordResetExpires = resetExpires;
        await user.save();

        await this.rabbitMQ.publishEvent(
            EventName.PASSWORD_RESET_REQUESTED,
            {
                userId: user._id.toString(),
                email: user.email,
                resetToken,
                expiresAt: resetExpires.toISOString(),
            },
            correlationId,
        );

        this.logger.log(`Password reset requested for: ${user.email}`);

        return { message: successMessage };
    }

    async resetPassword(
        dto: ResetPasswordDto,
        correlationId?: string,
    ): Promise<{ message: string }> {
        const user = await this.userModel.findOne({
            passwordResetToken: dto.token,
            passwordResetExpires: { $gt: new Date() },
        });

        if (!user) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        user.passwordHash = await bcrypt.hash(dto.newPassword, this.config.bcryptRounds);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.refreshTokens = [];

        await user.save();

        this.logger.log(`Password reset completed for: ${user.email}`);

        return { message: 'Password reset successful' };
    }

    private async generateTokens(
        user: UserDocument,
        userAgent?: string,
        ipAddress?: string,
    ): Promise<TokensResponseDto> {
        const payload: JwtPayload = {
            sub: user._id.toString(),
            email: user.email,
            roles: user.roles,
            permissions: user.permissions,
            departmentId: user.departmentId?.toString(),
        };

        const accessToken = this.jwtService.sign(payload, {
            expiresIn: this.config.jwt.accessExpiresIn,
        });

        const refreshToken = uuidv4();

        const refreshExpiresIn = this.parseExpiresIn(this.config.jwt.refreshExpiresIn);
        const refreshExpiresAt = new Date(Date.now() + refreshExpiresIn * 1000);

        user.refreshTokens.push({
            token: refreshToken,
            expiresAt: refreshExpiresAt,
            createdAt: new Date(),
            userAgent,
            ipAddress,
        });

        if (user.refreshTokens.length > 5) {
            user.refreshTokens = user.refreshTokens.slice(-5);
        }

        await user.save();

        const accessExpiresIn = this.parseExpiresIn(this.config.jwt.accessExpiresIn);

        return {
            accessToken,
            refreshToken,
            expiresIn: accessExpiresIn,
            tokenType: 'Bearer',
        };
    }

    private parseExpiresIn(expiresIn: string): number {
        const match = expiresIn.match(/^(\d+)([smhd])$/);
        if (!match) return 900;

        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 60 * 60;
            case 'd': return value * 24 * 60 * 60;
            default: return 900;
        }
    }
}