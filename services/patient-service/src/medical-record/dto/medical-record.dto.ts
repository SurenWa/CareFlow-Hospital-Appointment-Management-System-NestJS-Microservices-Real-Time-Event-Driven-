import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsDateString,
    IsEnum,
    IsBoolean,
    IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum RecordType {
    LAB_RESULT = 'LAB_RESULT',
    PRESCRIPTION = 'PRESCRIPTION',
    IMAGING = 'IMAGING',
    DIAGNOSIS = 'DIAGNOSIS',
    PROCEDURE = 'PROCEDURE',
    VACCINATION = 'VACCINATION',
    ALLERGY = 'ALLERGY',
    NOTE = 'NOTE',
    OTHER = 'OTHER',
}

// ==================== Request DTOs ====================

export class CreateMedicalRecordDto {
    @ApiProperty({ enum: RecordType, example: RecordType.LAB_RESULT })
    @IsEnum(RecordType)
    @IsNotEmpty()
    type: RecordType;

    @ApiProperty({ example: 'Blood Test Results' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional({ example: 'Annual checkup blood work' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Additional structured data' })
    @IsObject()
    @IsOptional()
    data?: Record<string, any>;

    @ApiPropertyOptional({ example: 'dr-123' })
    @IsString()
    @IsOptional()
    providerId?: string;

    @ApiPropertyOptional({ example: 'Dr. Jane Smith' })
    @IsString()
    @IsOptional()
    providerName?: string;

    @ApiProperty({ example: '2024-01-15' })
    @IsDateString()
    @IsNotEmpty()
    recordDate: string;

    @ApiPropertyOptional({ default: false })
    @IsBoolean()
    @IsOptional()
    isConfidential?: boolean;
}

export class UpdateMedicalRecordDto extends PartialType(CreateMedicalRecordDto) { }

export class MedicalRecordQueryDto {
    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    page?: number;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    limit?: number;

    @ApiPropertyOptional({ enum: RecordType })
    @IsEnum(RecordType)
    @IsOptional()
    type?: RecordType;

    @ApiPropertyOptional()
    @IsDateString()
    @IsOptional()
    fromDate?: string;

    @ApiPropertyOptional()
    @IsDateString()
    @IsOptional()
    toDate?: string;
}

// ==================== Response DTOs ====================

export class MedicalRecordResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    patientId: string;

    @ApiProperty({ enum: RecordType })
    type: RecordType;

    @ApiProperty()
    title: string;

    @ApiPropertyOptional()
    description?: string;

    @ApiPropertyOptional()
    data?: Record<string, any>;

    @ApiPropertyOptional()
    fileName?: string;

    @ApiPropertyOptional()
    fileUrl?: string;

    @ApiPropertyOptional()
    fileMimeType?: string;

    @ApiPropertyOptional()
    fileSize?: number;

    @ApiPropertyOptional()
    providerId?: string;

    @ApiPropertyOptional()
    providerName?: string;

    @ApiProperty()
    recordDate: Date;

    @ApiProperty()
    isConfidential: boolean;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    static fromEntity(record: any): MedicalRecordResponseDto {
        return {
            id: record.id,
            patientId: record.patientId,
            type: record.type,
            title: record.title,
            description: record.description,
            data: record.data,
            fileName: record.fileName,
            fileUrl: record.fileUrl,
            fileMimeType: record.fileMimeType,
            fileSize: record.fileSize,
            providerId: record.providerId,
            providerName: record.providerName,
            recordDate: record.recordDate,
            isConfidential: record.isConfidential,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        };
    }
}

export class MedicalRecordListResponseDto {
    @ApiProperty({ type: [MedicalRecordResponseDto] })
    records: MedicalRecordResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    totalPages: number;
}