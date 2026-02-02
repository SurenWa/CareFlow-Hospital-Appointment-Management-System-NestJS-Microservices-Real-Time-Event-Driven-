import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsString,
    IsNotEmpty,
    MinLength,
    MaxLength,
    IsEnum,
    IsOptional,
} from 'class-validator';
import { UserRole } from '@careflow/shared';

/**
 * Login request DTO
 */
export class LoginDto {
    @ApiProperty({ example: 'doctor@careflow.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'SecurePass123!' })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    password: string;
}

/**
 * Register request DTO
 */
export class RegisterDto {
    @ApiProperty({ example: 'john@careflow.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'SecurePass123!' })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(72) // bcrypt limit
    password: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    lastName: string;

    @ApiPropertyOptional({ enum: UserRole, example: UserRole.PATIENT })
    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole;

    @ApiPropertyOptional({ example: '+1234567890' })
    @IsString()
    @IsOptional()
    phoneNumber?: string;
}

/**
 * Refresh token request DTO
 */
export class RefreshTokenDto {
    @ApiProperty({ description: 'Refresh token received during login' })
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}

/**
 * User profile DTO
 */
export class UserProfileDto {
    @ApiProperty({ description: 'User unique identifier' })
    id: string;

    @ApiProperty({ description: 'User email address' })
    email: string;

    @ApiProperty({ description: 'First name' })
    firstName: string;

    @ApiProperty({ description: 'Last name' })
    lastName: string;

    @ApiProperty({ enum: UserRole, isArray: true, description: 'User roles' })
    roles: UserRole[];

    @ApiPropertyOptional({ description: 'Phone number' })
    phoneNumber?: string;

    @ApiPropertyOptional({ description: 'Department ID for staff members' })
    departmentId?: string;

    @ApiProperty({ description: 'Account creation timestamp' })
    createdAt: string;

    @ApiProperty({ description: 'Last update timestamp' })
    updatedAt: string;
}


/**
 * Login response DTO
 */
export class LoginResponseDto {
    @ApiProperty({ description: 'JWT access token' })
    accessToken: string;

    @ApiProperty({ description: 'Refresh token for obtaining new access tokens' })
    refreshToken: string;

    @ApiProperty({ description: 'Token expiration time in seconds' })
    expiresIn: number;

    @ApiProperty({ description: 'Token type', example: 'Bearer' })
    tokenType: string;

    @ApiProperty({ description: 'User profile information' })
    user: UserProfileDto;
}

/**
 * Register response DTO
 */
export class RegisterResponseDto {
    @ApiProperty({ description: 'Newly created user ID' })
    userId: string;

    @ApiProperty({ description: 'User email' })
    email: string;

    @ApiProperty({ description: 'Success message' })
    message: string;
}

