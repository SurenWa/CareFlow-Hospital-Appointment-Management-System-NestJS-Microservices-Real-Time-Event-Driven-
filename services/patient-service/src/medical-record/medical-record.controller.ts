import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
    Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MedicalRecordService } from './medical-record.service';
import {
    CreateMedicalRecordDto,
    UpdateMedicalRecordDto,
    MedicalRecordQueryDto,
    MedicalRecordResponseDto,
    MedicalRecordListResponseDto,
    RecordType,
} from './dto/medical-record.dto';
import { INTERNAL_HEADERS } from '@careflow/shared';

@ApiTags('Medical Records')
@Controller('patients/:patientId/medical-records')
export class MedicalRecordController {
    constructor(private medicalRecordService: MedicalRecordService) { }

    @Post()
    @ApiOperation({ summary: 'Create a medical record' })
    @ApiResponse({ status: 201, type: MedicalRecordResponseDto })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    async create(
        @Param('patientId') patientId: string,
        @Body() dto: CreateMedicalRecordDto,
        @Headers(INTERNAL_HEADERS.CORRELATION_ID) correlationId?: string,
    ): Promise<MedicalRecordResponseDto> {
        return this.medicalRecordService.create(patientId, dto, correlationId);
    }

    @Get()
    @ApiOperation({ summary: 'List patient medical records' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'type', required: false, enum: RecordType })
    @ApiQuery({ name: 'fromDate', required: false, type: String })
    @ApiQuery({ name: 'toDate', required: false, type: String })
    @ApiResponse({ status: 200, type: MedicalRecordListResponseDto })
    async findAll(
        @Param('patientId') patientId: string,
        @Query() query: MedicalRecordQueryDto,
    ): Promise<MedicalRecordListResponseDto> {
        return this.medicalRecordService.findAllByPatient(patientId, query);
    }

    @Get(':recordId')
    @ApiOperation({ summary: 'Get medical record by ID' })
    @ApiResponse({ status: 200, type: MedicalRecordResponseDto })
    @ApiResponse({ status: 404, description: 'Record not found' })
    async findById(
        @Param('patientId') patientId: string,
        @Param('recordId') recordId: string,
    ): Promise<MedicalRecordResponseDto> {
        return this.medicalRecordService.findById(patientId, recordId);
    }

    @Put(':recordId')
    @ApiOperation({ summary: 'Update medical record' })
    @ApiResponse({ status: 200, type: MedicalRecordResponseDto })
    @ApiResponse({ status: 404, description: 'Record not found' })
    async update(
        @Param('patientId') patientId: string,
        @Param('recordId') recordId: string,
        @Body() dto: UpdateMedicalRecordDto,
        @Headers(INTERNAL_HEADERS.CORRELATION_ID) correlationId?: string,
    ): Promise<MedicalRecordResponseDto> {
        return this.medicalRecordService.update(patientId, recordId, dto, correlationId);
    }

    @Delete(':recordId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete medical record' })
    @ApiResponse({ status: 204 })
    @ApiResponse({ status: 404, description: 'Record not found' })
    async delete(
        @Param('patientId') patientId: string,
        @Param('recordId') recordId: string,
        @Headers(INTERNAL_HEADERS.CORRELATION_ID) correlationId?: string,
    ): Promise<void> {
        await this.medicalRecordService.delete(patientId, recordId, correlationId);
    }
}