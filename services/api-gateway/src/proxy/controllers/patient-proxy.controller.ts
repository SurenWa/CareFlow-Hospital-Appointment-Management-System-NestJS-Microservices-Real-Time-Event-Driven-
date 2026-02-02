import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Query,
    Req,
    HttpCode,
    HttpStatus,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
    ApiConsumes,
    ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService, ServiceTarget } from '../proxy.service';
import { Roles, Permissions, CurrentUser } from '../../common/decorators';
import { UserRole, Permission, UserContext } from '@careflow/shared';

/**
 * Patient Proxy Controller
 *
 * Proxies patient-related requests to Patient Service.
 * Implements RBAC: Different roles have different access levels.
 *
 * - Admin: Full access
 * - Doctor/Nurse: Read access to assigned patients
 * - Patient: Read/write own profile only
 */
@ApiTags('Patients')
@Controller('patients')
@ApiBearerAuth()
export class PatientProxyController {
    constructor(private proxyService: ProxyService) {}

    @Get()
    @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
    @Permissions(Permission.PATIENT_READ)
    @ApiOperation({ summary: 'List all patients (paginated)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiResponse({ status: 200, description: 'List of patients' })
    async listPatients(@Req() request: Request): Promise<any> {
        return this.proxyService.forward(ServiceTarget.PATIENT, request, '/patients');
    }

    @Get('me')
    @Roles(UserRole.PATIENT)
    @ApiOperation({ summary: 'Get current patient profile (for patients only)' })
    @ApiResponse({ status: 200, description: 'Patient profile' })
    async getMyProfile(@CurrentUser() user: UserContext, @Req() request: Request): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.PATIENT,
            request,
            `/patients/user/${user.userId}`,
        );
    }

    @Get(':id')
    @Permissions(Permission.PATIENT_READ)
    @ApiOperation({ summary: 'Get patient by ID' })
    @ApiResponse({ status: 200, description: 'Patient details' })
    @ApiResponse({ status: 404, description: 'Patient not found' })
    async getPatient(@Param('id') id: string, @Req() request: Request): Promise<any> {
        return this.proxyService.forward(ServiceTarget.PATIENT, request, `/patients/${id}`);
    }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
    @Permissions(Permission.PATIENT_WRITE)
    @ApiOperation({ summary: 'Create a new patient record' })
    @ApiResponse({ status: 201, description: 'Patient created' })
    async createPatient(@Body() body: any, @Req() request: Request): Promise<any> {
        return this.proxyService.forward(ServiceTarget.PATIENT, request, '/patients', {
            data: body,
        });
    }

    @Put(':id')
    @Permissions(Permission.PATIENT_WRITE)
    @ApiOperation({ summary: 'Update patient record' })
    @ApiResponse({ status: 200, description: 'Patient updated' })
    async updatePatient(
        @Param('id') id: string,
        @Body() body: any,
        @Req() request: Request,
    ): Promise<any> {
        return this.proxyService.forward(ServiceTarget.PATIENT, request, `/patients/${id}`, {
            data: body,
        });
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @Permissions(Permission.PATIENT_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete patient record (Admin only)' })
    @ApiResponse({ status: 204, description: 'Patient deleted' })
    async deletePatient(@Param('id') id: string, @Req() request: Request): Promise<void> {
        await this.proxyService.forward(ServiceTarget.PATIENT, request, `/patients/${id}`);
    }

    // Medical Records endpoints
    @Get(':id/medical-records')
    @Permissions(Permission.PATIENT_READ)
    @ApiOperation({ summary: 'Get patient medical records' })
    async getMedicalRecords(@Param('id') id: string, @Req() request: Request): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.PATIENT,
            request,
            `/patients/${id}/medical-records`,
        );
    }

    @Post(':id/medical-records')
    @Roles(UserRole.ADMIN, UserRole.DOCTOR)
    @Permissions(Permission.PATIENT_WRITE)
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload medical record document' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                type: { type: 'string', enum: ['lab_result', 'imaging', 'prescription', 'report'] },
                description: { type: 'string' },
            },
        },
    })
    async uploadMedicalRecord(
        @Param('id') id: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
                    new FileTypeValidator({ fileType: /(pdf|jpg|jpeg|png|dicom)$/i }),
                ],
            }),
        )
        file: Express.Multer.File,
        @Body() body: any,
        @Req() request: Request,
    ): Promise<any> {
        // For file uploads, we need to forward the multipart data
        // This would typically go through a different path
        // For now, we'll forward metadata and handle file separately
        return this.proxyService.forward(
            ServiceTarget.PATIENT,
            request,
            `/patients/${id}/medical-records`,
            {
                data: {
                    ...body,
                    fileName: file.originalname,
                    fileSize: file.size,
                    mimeType: file.mimetype,
                    // In real implementation, upload to Cloudinary first
                    // then send the URL to Patient Service
                },
            },
        );
    }
}
