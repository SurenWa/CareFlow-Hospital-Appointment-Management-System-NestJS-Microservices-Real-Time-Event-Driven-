import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsEmail,
    IsOptional,
    IsDateString,
    IsEnum,
    IsArray,
    IsBoolean,
    MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum Gender {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
    OTHER = 'OTHER',
    PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum BloodType {
    A_POSITIVE = 'A_POSITIVE',
    A_NEGATIVE = 'A_NEGATIVE',
    B_POSITIVE = 'B_POSITIVE',
    B_NEGATIVE = 'B_NEGATIVE',
    AB_POSITIVE = 'AB_POSITIVE',
    AB_NEGATIVE = 'AB_NEGATIVE',
    O_POSITIVE = 'O_POSITIVE',
    O_NEGATIVE = 'O_NEGATIVE',
    UNKNOWN = 'UNKNOWN',
}

// ==================== Request DTOs ====================

export class CreatePatientDto {
    @ApiProperty({ description: 'User ID from Auth Service' })
    @IsString()
    @IsNotEmpty()
    userId: string;

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

    @ApiProperty({ example: '1990-05-15' })
    @IsDateString()
    @IsNotEmpty()
    dateOfBirth: string;

    @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender;

    @ApiProperty({ example: 'john.doe@example.com' })
    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => value?.toLowerCase().trim())
    email: string;

    @ApiPropertyOptional({ example: '+1234567890' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({ example: '123 Main St' })
    @IsString()
    @IsOptional()
    addressLine1?: string;

    @ApiPropertyOptional({ example: 'Apt 4B' })
    @IsString()
    @IsOptional()
    addressLine2?: string;

    @ApiPropertyOptional({ example: 'New York' })
    @IsString()
    @IsOptional()
    city?: string;

    @ApiPropertyOptional({ example: 'NY' })
    @IsString()
    @IsOptional()
    state?: string;

    @ApiPropertyOptional({ example: '10001' })
    @IsString()
    @IsOptional()
    postalCode?: string;

    @ApiPropertyOptional({ example: 'US' })
    @IsString()
    @IsOptional()
    country?: string;

    @ApiPropertyOptional({ enum: BloodType, example: BloodType.O_POSITIVE })
    @IsEnum(BloodType)
    @IsOptional()
    bloodType?: BloodType;

    @ApiPropertyOptional({ example: ['Penicillin', 'Peanuts'] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    allergies?: string[];

    @ApiPropertyOptional({ example: ['Diabetes', 'Hypertension'] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    chronicConditions?: string[];

    @ApiPropertyOptional({ example: 'Jane Doe' })
    @IsString()
    @IsOptional()
    emergencyContactName?: string;

    @ApiPropertyOptional({ example: '+1987654321' })
    @IsString()
    @IsOptional()
    emergencyContactPhone?: string;

    @ApiPropertyOptional({ example: 'Spouse' })
    @IsString()
    @IsOptional()
    emergencyContactRelation?: string;

    @ApiPropertyOptional({ example: 'Blue Cross' })
    @IsString()
    @IsOptional()
    insuranceProvider?: string;

    @ApiPropertyOptional({ example: 'POL123456' })
    @IsString()
    @IsOptional()
    insurancePolicyNumber?: string;

    @ApiPropertyOptional({ example: 'GRP789' })
    @IsString()
    @IsOptional()
    insuranceGroupNumber?: string;
}

export class UpdatePatientDto extends PartialType(CreatePatientDto) {
    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}

export class PatientQueryDto {
    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    page?: number;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    limit?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ enum: Gender })
    @IsEnum(Gender)
    @IsOptional()
    gender?: Gender;

    @ApiPropertyOptional({ enum: BloodType })
    @IsEnum(BloodType)
    @IsOptional()
    bloodType?: BloodType;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true')
    isActive?: boolean;
}

// ==================== Response DTOs ====================

export class PatientResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    userId: string;

    @ApiProperty()
    firstName: string;

    @ApiProperty()
    lastName: string;

    @ApiProperty()
    fullName: string;

    @ApiProperty()
    dateOfBirth: Date;

    @ApiProperty({ enum: Gender })
    gender: Gender;

    @ApiProperty()
    email: string;

    @ApiPropertyOptional()
    phone?: string;

    @ApiPropertyOptional()
    addressLine1?: string;

    @ApiPropertyOptional()
    addressLine2?: string;

    @ApiPropertyOptional()
    city?: string;

    @ApiPropertyOptional()
    state?: string;

    @ApiPropertyOptional()
    postalCode?: string;

    @ApiProperty()
    country: string;

    @ApiProperty({ enum: BloodType })
    bloodType: BloodType;

    @ApiProperty()
    allergies: string[];

    @ApiProperty()
    chronicConditions: string[];

    @ApiPropertyOptional()
    emergencyContactName?: string;

    @ApiPropertyOptional()
    emergencyContactPhone?: string;

    @ApiPropertyOptional()
    emergencyContactRelation?: string;

    @ApiPropertyOptional()
    insuranceProvider?: string;

    @ApiPropertyOptional()
    insurancePolicyNumber?: string;

    @ApiPropertyOptional()
    insuranceGroupNumber?: string;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    static fromEntity(patient: any): PatientResponseDto {
        return {
            id: patient.id,
            userId: patient.userId,
            firstName: patient.firstName,
            lastName: patient.lastName,
            fullName: `${patient.firstName} ${patient.lastName}`,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            email: patient.email,
            phone: patient.phone,
            addressLine1: patient.addressLine1,
            addressLine2: patient.addressLine2,
            city: patient.city,
            state: patient.state,
            postalCode: patient.postalCode,
            country: patient.country,
            bloodType: patient.bloodType,
            allergies: patient.allergies,
            chronicConditions: patient.chronicConditions,
            emergencyContactName: patient.emergencyContactName,
            emergencyContactPhone: patient.emergencyContactPhone,
            emergencyContactRelation: patient.emergencyContactRelation,
            insuranceProvider: patient.insuranceProvider,
            insurancePolicyNumber: patient.insurancePolicyNumber,
            insuranceGroupNumber: patient.insuranceGroupNumber,
            isActive: patient.isActive,
            createdAt: patient.createdAt,
            updatedAt: patient.updatedAt,
        };
    }
}

export class PatientListResponseDto {
    @ApiProperty({ type: [PatientResponseDto] })
    patients: PatientResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    totalPages: number;
}