import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import {
    IsEmail,
    IsString,
    IsNotEmpty,
    MinLength,
    MaxLength,
    IsEnum,
    IsOptional,
    IsArray,
    IsBoolean,
    Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole, Permission } from '@careflow/shared';

const PASSWORD_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// ==================== Request DTOs ====================

export class CreateUserDto {
    @ApiProperty({ example: 'john.doe@careflow.com' })
    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => value?.toLowerCase().trim())
    email: string;

    @ApiProperty({ example: 'SecurePass123!' })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(72)
    @Matches(PASSWORD_REGEX, {
        message:
            'Password must contain uppercase, lowercase, number, and special character',
    })
    password: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @Transform(({ value }) => value?.trim())
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @Transform(({ value }) => value?.trim())
    lastName: string;

    @ApiPropertyOptional({ enum: UserRole, isArray: true })
    @IsArray()
    @IsEnum(UserRole, { each: true })
    @IsOptional()
    roles?: UserRole[];

    @ApiPropertyOptional({ example: '+1234567890' })
    @IsString()
    @IsOptional()
    phoneNumber?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    departmentId?: string;
}

export class UpdateUserDto extends PartialType(
    OmitType(CreateUserDto, ['email', 'password'] as const),
) {
    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class ChangePasswordDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    currentPassword: string;

    @ApiProperty({ example: 'NewSecurePass456!' })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(72)
    @Matches(PASSWORD_REGEX, {
        message:
            'Password must contain uppercase, lowercase, number, and special character',
    })
    newPassword: string;
}

export class AssignRolesDto {
    @ApiProperty({ enum: UserRole, isArray: true })
    @IsArray()
    @IsEnum(UserRole, { each: true })
    roles: UserRole[];
}

// ==================== Response DTOs ====================

export class UserResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    firstName: string;

    @ApiProperty()
    lastName: string;

    @ApiProperty()
    fullName: string;

    @ApiProperty({ enum: UserRole, isArray: true })
    roles: UserRole[];

    @ApiProperty({ enum: Permission, isArray: true })
    permissions: Permission[];

    @ApiPropertyOptional()
    phoneNumber?: string;

    @ApiPropertyOptional()
    departmentId?: string;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty()
    isEmailVerified: boolean;

    @ApiPropertyOptional()
    lastLoginAt?: Date;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    static fromDocument(user: any): UserResponseDto {
        return {
            id: user._id?.toString() || user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName} ${user.lastName}`,
            roles: user.roles,
            permissions: user.permissions,
            phoneNumber: user.phoneNumber,
            departmentId: user.departmentId?.toString(),
            isActive: user.isActive,
            isEmailVerified: user.isEmailVerified,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}

export class UserListResponseDto {
    @ApiProperty({ type: [UserResponseDto] })
    users: UserResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    totalPages: number;
}