import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService, ServiceTarget } from '../proxy.service';
import { Roles, Permissions, CurrentUser } from '../../common/decorators';
import { UserRole, Permission, UserContext } from '@careflow/shared';

/**
 * Appointment Proxy Controller
 *
 * Proxies appointment-related requests to Appointment Service.
 *
 * RBAC Rules:
 * - Admin: Full access
 * - Doctor: Manage own appointments
 * - Nurse: View and assist with appointments
 * - Patient: Book and manage own appointments
 */
@ApiTags('Appointments')
@Controller('appointments')
@ApiBearerAuth()
export class AppointmentProxyController {
    constructor(private proxyService: ProxyService) {}

    @Get()
    @Permissions(Permission.APPOINTMENT_READ)
    @ApiOperation({ summary: 'List appointments (filtered by role)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiQuery({ name: 'doctorId', required: false, type: String })
    @ApiQuery({ name: 'patientId', required: false, type: String })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiResponse({ status: 200, description: 'List of appointments' })
    async listAppointments(@Req() request: Request): Promise<any> {
        return this.proxyService.forward(ServiceTarget.APPOINTMENT, request, '/appointments');
    }

    @Get('my')
    @ApiOperation({ summary: 'Get current user appointments' })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiQuery({ name: 'upcoming', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'User appointments' })
    async getMyAppointments(
        @CurrentUser() user: UserContext,
        @Req() request: Request,
    ): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.APPOINTMENT,
            request,
            `/appointments/user/${user.userId}`,
        );
    }

    @Get('available-slots')
    @ApiOperation({ summary: 'Get available appointment slots' })
    @ApiQuery({ name: 'doctorId', required: true, type: String })
    @ApiQuery({ name: 'date', required: true, type: String, description: 'YYYY-MM-DD' })
    @ApiQuery({
        name: 'duration',
        required: false,
        type: Number,
        description: 'Duration in minutes',
    })
    @ApiResponse({ status: 200, description: 'Available time slots' })
    async getAvailableSlots(@Req() request: Request): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.APPOINTMENT,
            request,
            '/appointments/available-slots',
        );
    }

    @Get(':id')
    @Permissions(Permission.APPOINTMENT_READ)
    @ApiOperation({ summary: 'Get appointment by ID' })
    @ApiResponse({ status: 200, description: 'Appointment details' })
    @ApiResponse({ status: 404, description: 'Appointment not found' })
    async getAppointment(@Param('id') id: string, @Req() request: Request): Promise<any> {
        return this.proxyService.forward(ServiceTarget.APPOINTMENT, request, `/appointments/${id}`);
    }

    @Post()
    @Permissions(Permission.APPOINTMENT_WRITE)
    @ApiOperation({ summary: 'Create a new appointment' })
    @ApiResponse({ status: 201, description: 'Appointment created' })
    @ApiResponse({ status: 409, description: 'Time slot not available' })
    async createAppointment(@Body() body: any, @Req() request: Request): Promise<any> {
        return this.proxyService.forward(ServiceTarget.APPOINTMENT, request, '/appointments', {
            data: body,
        });
    }

    @Put(':id')
    @Permissions(Permission.APPOINTMENT_WRITE)
    @ApiOperation({ summary: 'Update appointment details' })
    @ApiResponse({ status: 200, description: 'Appointment updated' })
    async updateAppointment(
        @Param('id') id: string,
        @Body() body: any,
        @Req() request: Request,
    ): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.APPOINTMENT,
            request,
            `/appointments/${id}`,
            { data: body },
        );
    }

    @Patch(':id/status')
    @Permissions(Permission.APPOINTMENT_WRITE)
    @ApiOperation({ summary: 'Update appointment status' })
    @ApiResponse({ status: 200, description: 'Status updated' })
    async updateStatus(
        @Param('id') id: string,
        @Body() body: { status: string; reason?: string },
        @Req() request: Request,
    ): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.APPOINTMENT,
            request,
            `/appointments/${id}/status`,
            { data: body },
        );
    }

    @Post(':id/confirm')
    @HttpCode(HttpStatus.OK)
    @Permissions(Permission.APPOINTMENT_WRITE)
    @ApiOperation({ summary: 'Confirm appointment after payment' })
    @ApiResponse({ status: 200, description: 'Appointment confirmed' })
    async confirmAppointment(
        @Param('id') id: string,
        @Body() body: { paymentId: string },
        @Req() request: Request,
    ): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.APPOINTMENT,
            request,
            `/appointments/${id}/confirm`,
            { data: body },
        );
    }

    @Post(':id/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancel appointment' })
    @ApiResponse({ status: 200, description: 'Appointment cancelled' })
    async cancelAppointment(
        @Param('id') id: string,
        @Body() body: { reason: string },
        @Req() request: Request,
    ): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.APPOINTMENT,
            request,
            `/appointments/${id}/cancel`,
            { data: body },
        );
    }

    @Post(':id/reschedule')
    @HttpCode(HttpStatus.OK)
    @Permissions(Permission.APPOINTMENT_WRITE)
    @ApiOperation({ summary: 'Reschedule appointment to new time' })
    @ApiResponse({ status: 200, description: 'Appointment rescheduled' })
    async rescheduleAppointment(
        @Param('id') id: string,
        @Body() body: { newDateTime: string; reason?: string },
        @Req() request: Request,
    ): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.APPOINTMENT,
            request,
            `/appointments/${id}/reschedule`,
            { data: body },
        );
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @Permissions(Permission.APPOINTMENT_DELETE)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete appointment (Admin only)' })
    @ApiResponse({ status: 204, description: 'Appointment deleted' })
    async deleteAppointment(@Param('id') id: string, @Req() request: Request): Promise<void> {
        await this.proxyService.forward(ServiceTarget.APPOINTMENT, request, `/appointments/${id}`);
    }

    // Doctor Schedule Management
    @Get('doctors/:doctorId/schedule')
    @Permissions(Permission.APPOINTMENT_READ)
    @ApiOperation({ summary: 'Get doctor schedule' })
    @ApiQuery({ name: 'startDate', required: true, type: String })
    @ApiQuery({ name: 'endDate', required: true, type: String })
    async getDoctorSchedule(
        @Param('doctorId') doctorId: string,
        @Req() request: Request,
    ): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.APPOINTMENT,
            request,
            `/appointments/doctors/${doctorId}/schedule`,
        );
    }

    @Put('doctors/:doctorId/schedule')
    @Roles(UserRole.ADMIN, UserRole.DOCTOR)
    @ApiOperation({ summary: 'Update doctor schedule/availability' })
    async updateDoctorSchedule(
        @Param('doctorId') doctorId: string,
        @Body() body: any,
        @Req() request: Request,
    ): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.APPOINTMENT,
            request,
            `/appointments/doctors/${doctorId}/schedule`,
            { data: body },
        );
    }
}
