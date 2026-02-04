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
import { UserService } from './user.service';
import {
    CreateUserDto,
    UpdateUserDto,
    ChangePasswordDto,
    AssignRolesDto,
    UserResponseDto,
    UserListResponseDto,
} from './dto/user.dto';
import { UserRole, INTERNAL_HEADERS } from '@careflow/shared';

@ApiTags('Users')
@Controller('users')
export class UserController {
    constructor(private userService: UserService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new user' })
    @ApiResponse({ status: 201, type: UserResponseDto })
    @ApiResponse({ status: 409, description: 'Email already exists' })
    async create(
        @Body() dto: CreateUserDto,
        @Headers(INTERNAL_HEADERS.CORRELATION_ID) correlationId?: string,
    ): Promise<UserResponseDto> {
        return this.userService.create(dto, correlationId);
    }

    @Get()
    @ApiOperation({ summary: 'List all users' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'role', required: false, enum: UserRole })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiResponse({ status: 200, type: UserListResponseDto })
    async findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('role') role?: UserRole,
        @Query('isActive') isActive?: boolean,
        @Query('search') search?: string,
    ): Promise<UserListResponseDto> {
        return this.userService.findAll(page || 1, limit || 20, { role, isActive, search });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, type: UserResponseDto })
    @ApiResponse({ status: 404, description: 'User not found' })
    async findById(@Param('id') id: string): Promise<UserResponseDto> {
        return this.userService.findById(id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update user' })
    @ApiResponse({ status: 200, type: UserResponseDto })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateUserDto,
        @Headers(INTERNAL_HEADERS.CORRELATION_ID) correlationId?: string,
    ): Promise<UserResponseDto> {
        return this.userService.update(id, dto, correlationId);
    }

    @Post(':id/change-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Change user password' })
    @ApiResponse({ status: 200 })
    async changePassword(
        @Param('id') id: string,
        @Body() dto: ChangePasswordDto,
    ): Promise<{ message: string }> {
        await this.userService.changePassword(id, dto);
        return { message: 'Password changed successfully' };
    }

    @Put(':id/roles')
    @ApiOperation({ summary: 'Update user roles' })
    @ApiResponse({ status: 200, type: UserResponseDto })
    async updateRoles(
        @Param('id') id: string,
        @Body() dto: AssignRolesDto,
        @Headers(INTERNAL_HEADERS.CORRELATION_ID) correlationId?: string,
    ): Promise<UserResponseDto> {
        return this.userService.updateRoles(id, dto.roles, correlationId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Deactivate user' })
    @ApiResponse({ status: 204 })
    async deactivate(
        @Param('id') id: string,
        @Headers(INTERNAL_HEADERS.CORRELATION_ID) correlationId?: string,
    ): Promise<void> {
        await this.userService.deactivate(id, correlationId);
    }
}