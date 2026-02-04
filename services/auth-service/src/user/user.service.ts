import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import {
    CreateUserDto,
    UpdateUserDto,
    ChangePasswordDto,
    UserResponseDto,
} from './dto/user.dto';
import { AppConfigService } from '../config';
import { RabbitMQService } from '../rabbitmq';
import { EventName, UserRole, Permission, UserCreatedPayload } from '@careflow/shared';

const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: [
        Permission.PATIENT_READ,
        Permission.PATIENT_WRITE,
        Permission.PATIENT_DELETE,
        Permission.APPOINTMENT_READ,
        Permission.APPOINTMENT_WRITE,
        Permission.APPOINTMENT_DELETE,
        Permission.BILLING_READ,
        Permission.BILLING_WRITE,
        Permission.USER_MANAGE,
        Permission.SYSTEM_ADMIN,
    ],
    [UserRole.DOCTOR]: [
        Permission.PATIENT_READ,
        Permission.PATIENT_WRITE,
        Permission.APPOINTMENT_READ,
        Permission.APPOINTMENT_WRITE,
        Permission.BILLING_READ,
    ],
    [UserRole.NURSE]: [
        Permission.PATIENT_READ,
        Permission.PATIENT_WRITE,
        Permission.APPOINTMENT_READ,
    ],
    [UserRole.PATIENT]: [
        Permission.PATIENT_READ_OWN,
        Permission.PATIENT_WRITE_OWN,
        Permission.APPOINTMENT_READ_OWN,
        Permission.APPOINTMENT_WRITE_OWN,
        Permission.BILLING_READ_OWN,
    ],
};

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private config: AppConfigService,
        private rabbitMQ: RabbitMQService,
    ) { }

    async create(dto: CreateUserDto, correlationId?: string): Promise<UserResponseDto> {
        const existingUser = await this.userModel.findOne({
            email: dto.email.toLowerCase(),
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await bcrypt.hash(dto.password, this.config.bcryptRounds);
        const roles = dto.roles || [UserRole.PATIENT];
        const permissions = this.calculatePermissions(roles);

        const user = new this.userModel({
            email: dto.email.toLowerCase(),
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            roles,
            permissions,
            phoneNumber: dto.phoneNumber,
            departmentId: dto.departmentId ? new Types.ObjectId(dto.departmentId) : undefined,
            isActive: true,
            isEmailVerified: false,
        });

        await user.save();

        this.logger.log(`User created: ${user.email} [${user._id}]`);

        await this.rabbitMQ.publishEvent<UserCreatedPayload>(
            EventName.USER_CREATED,
            {
                userId: user._id.toString(),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: roles[0],
            },
            correlationId,
        );

        return UserResponseDto.fromDocument(user);
    }

    async findById(id: string): Promise<UserResponseDto> {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid user ID format');
        }

        const user = await this.userModel.findById(id);

        if (!user) {
            throw new NotFoundException(`User not found: ${id}`);
        }

        return UserResponseDto.fromDocument(user);
    }

    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email: email.toLowerCase() });
    }

    async findDocumentById(id: string): Promise<UserDocument> {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid user ID format');
        }

        const user = await this.userModel.findById(id);

        if (!user) {
            throw new NotFoundException(`User not found: ${id}`);
        }

        return user;
    }

    async findAll(
        page = 1,
        limit = 20,
        filters?: { role?: UserRole; isActive?: boolean; search?: string },
    ) {
        const query: any = {};

        if (filters?.role) {
            query.roles = filters.role;
        }

        if (filters?.isActive !== undefined) {
            query.isActive = filters.isActive;
        }

        if (filters?.search) {
            query.$or = [
                { email: { $regex: filters.search, $options: 'i' } },
                { firstName: { $regex: filters.search, $options: 'i' } },
                { lastName: { $regex: filters.search, $options: 'i' } },
            ];
        }

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            this.userModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
            this.userModel.countDocuments(query),
        ]);

        return {
            users: users.map(UserResponseDto.fromDocument),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async update(id: string, dto: UpdateUserDto, correlationId?: string): Promise<UserResponseDto> {
        const user = await this.findDocumentById(id);

        if (dto.firstName !== undefined) user.firstName = dto.firstName;
        if (dto.lastName !== undefined) user.lastName = dto.lastName;
        if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
        if (dto.isActive !== undefined) user.isActive = dto.isActive;
        if (dto.departmentId !== undefined) {
            user.departmentId = new Types.ObjectId(dto.departmentId);
        }

        if (dto.roles !== undefined) {
            user.roles = dto.roles;
            user.permissions = this.calculatePermissions(dto.roles);
        }

        await user.save();

        this.logger.log(`User updated: ${user.email} [${user._id}]`);

        await this.rabbitMQ.publishEvent(
            EventName.USER_UPDATED,
            { userId: user._id.toString(), email: user.email, changes: Object.keys(dto) },
            correlationId,
        );

        return UserResponseDto.fromDocument(user);
    }

    async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
        const user = await this.findDocumentById(id);

        const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);

        if (!isPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        const isSamePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);

        if (isSamePassword) {
            throw new BadRequestException('New password must be different');
        }

        user.passwordHash = await bcrypt.hash(dto.newPassword, this.config.bcryptRounds);
        user.refreshTokens = [];

        await user.save();

        this.logger.log(`Password changed for user: ${user.email}`);
    }

    async updateRoles(id: string, roles: UserRole[], correlationId?: string): Promise<UserResponseDto> {
        const user = await this.findDocumentById(id);

        user.roles = roles;
        user.permissions = this.calculatePermissions(roles);

        await user.save();

        this.logger.log(`Roles updated for user: ${user.email} -> ${roles.join(', ')}`);

        await this.rabbitMQ.publishEvent(
            EventName.USER_UPDATED,
            { userId: user._id.toString(), email: user.email, changes: ['roles', 'permissions'] },
            correlationId,
        );

        return UserResponseDto.fromDocument(user);
    }

    async deactivate(id: string, correlationId?: string): Promise<void> {
        const user = await this.findDocumentById(id);

        user.isActive = false;
        user.refreshTokens = [];

        await user.save();

        this.logger.log(`User deactivated: ${user.email}`);

        await this.rabbitMQ.publishEvent(
            EventName.USER_DELETED,
            { userId: user._id.toString(), email: user.email },
            correlationId,
        );
    }

    private calculatePermissions(roles: UserRole[]): Permission[] {
        const permissionSet = new Set<Permission>();

        for (const role of roles) {
            const rolePermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
            rolePermissions.forEach((p) => permissionSet.add(p));
        }

        return Array.from(permissionSet);
    }

    async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    async recordFailedLogin(userId: string): Promise<void> {
        const user = await this.userModel.findById(userId);
        if (!user) return;

        user.failedLoginAttempts += 1;

        if (user.failedLoginAttempts >= 5) {
            user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
            this.logger.warn(`Account locked: ${user.email}`);
        }

        await user.save();
    }

    async recordSuccessfulLogin(userId: string, ipAddress?: string): Promise<void> {
        await this.userModel.findByIdAndUpdate(userId, {
            failedLoginAttempts: 0,
            lockoutUntil: null,
            lastLoginAt: new Date(),
            lastLoginIp: ipAddress,
        });
    }
}