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
import { PatientService } from './patient.service';
import {
    CreatePatientDto,
    UpdatePatientDto,
    PatientQueryDto,
    PatientResponseDto,
    PatientListResponseDto,
    Gender,
    BloodType,
} from './dto/patient.dto';
import { INTERNAL_HEADERS } from '@careflow/shared';

@ApiTags('Patients')
@Controller('patients')
export class PatientController {
    constructor(private patientService: PatientService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new patient' })
    @ApiResponse({ status: 201, type: PatientResponseDto })
    @ApiResponse({ status: 409, description: 'Patient already exists' })
    async create(
        @Body() dto: CreatePatientDto,
        @Headers(INTERNAL_HEADERS.CORRELATION_ID) correlationId?: string,
    ): Promise<PatientResponseDto> {
        return this.patientService.create(dto, correlationId);
    }

    @Get()
    @ApiOperation({ summary: 'List all patients' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'gender', required: false, enum: Gender })
    @ApiQuery({ name: 'bloodType', required: false, enum: BloodType })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiResponse({ status: 200, type: PatientListResponseDto })
    async findAll(@Query() query: PatientQueryDto): Promise<PatientListResponseDto> {
        return this.patientService.findAll(query);
    }

    @Get('user/:userId')
    @ApiOperation({ summary: 'Get patient by user ID' })
    @ApiResponse({ status: 200, type: PatientResponseDto })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    async findByUserId(@Param('userId') userId: string): Promise<PatientResponseDto> {
        return this.patientService.findByUserId(userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get patient by ID' })
    @ApiResponse({ status: 200, type: PatientResponseDto })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    async findById(@Param('id') id: string): Promise<PatientResponseDto> {
        return this.patientService.findById(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update patient' })
    @ApiResponse({ status: 200, type: PatientResponseDto })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdatePatientDto,
        @Headers(INTERNAL_HEADERS.CORRELATION_ID) correlationId?: string,
    ): Promise<PatientResponseDto> {
        return this.patientService.update(id, dto, correlationId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Deactivate patient' })
    @ApiResponse({ status: 204 })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    async delete(
        @Param('id') id: string,
        @Headers(INTERNAL_HEADERS.CORRELATION_ID) correlationId?: string,
    ): Promise<void> {
        await this.patientService.delete(id, correlationId);
    }
}