import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators';

/**
 * Root Controller
 * 
 * Provides basic API information at the root endpoint
 */
@ApiTags('API Info')
@Controller()
export class RootController {
    @Public()
    @Get()
    @ApiOperation({ summary: 'Get API information' })
    @ApiResponse({ status: 200, description: 'API information' })
    getApiInfo() {
        return {
            name: 'CareFlow API',
            version: '1.0.0',
            description: 'Hospital & Appointment Management System',
            documentation: '/docs',
            health: '/health',
            endpoints: {
                auth: '/api/v1/auth',
                patients: '/api/v1/patients',
                appointments: '/api/v1/appointments',
                billing: '/api/v1/billing',
            },
            timestamp: new Date().toISOString(),
        };
    }
}