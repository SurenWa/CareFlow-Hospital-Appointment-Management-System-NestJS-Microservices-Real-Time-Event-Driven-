import {
    Injectable,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import {
    CreatePatientDto,
    UpdatePatientDto,
    PatientQueryDto,
    PatientResponseDto,
    PatientListResponseDto,
} from './dto/patient.dto';
import { EventName } from '@careflow/shared';

@Injectable()
export class PatientService {
    private readonly logger = new Logger(PatientService.name);

    constructor(
        private prisma: PrismaService,
        private rabbitMQ: RabbitMQService,
    ) { }

    async create(
        dto: CreatePatientDto,
        correlationId?: string,
    ): Promise<PatientResponseDto> {
        // Check if patient with userId already exists
        const existingByUserId = await this.prisma.patient.findUnique({
            where: { userId: dto.userId },
        });

        if (existingByUserId) {
            throw new ConflictException('Patient profile already exists for this user');
        }

        // Check if email already exists
        const existingByEmail = await this.prisma.patient.findUnique({
            where: { email: dto.email },
        });

        if (existingByEmail) {
            throw new ConflictException('Patient with this email already exists');
        }

        const patient = await this.prisma.patient.create({
            data: {
                userId: dto.userId,
                firstName: dto.firstName,
                lastName: dto.lastName,
                dateOfBirth: new Date(dto.dateOfBirth),
                gender: dto.gender,
                email: dto.email,
                phone: dto.phone,
                addressLine1: dto.addressLine1,
                addressLine2: dto.addressLine2,
                city: dto.city,
                state: dto.state,
                postalCode: dto.postalCode,
                country: dto.country || 'US',
                bloodType: dto.bloodType,
                allergies: dto.allergies || [],
                chronicConditions: dto.chronicConditions || [],
                emergencyContactName: dto.emergencyContactName,
                emergencyContactPhone: dto.emergencyContactPhone,
                emergencyContactRelation: dto.emergencyContactRelation,
                insuranceProvider: dto.insuranceProvider,
                insurancePolicyNumber: dto.insurancePolicyNumber,
                insuranceGroupNumber: dto.insuranceGroupNumber,
            },
        });

        this.logger.log(`Patient created: ${patient.email} [${patient.id}]`);

        // Publish patient.created event
        await this.rabbitMQ.publishEvent(
            EventName.PATIENT_CREATED,
            {
                patientId: patient.id,
                userId: patient.userId,
                email: patient.email,
                firstName: patient.firstName,
                lastName: patient.lastName,
            },
            correlationId,
        );

        return PatientResponseDto.fromEntity(patient);
    }

    async findById(id: string): Promise<PatientResponseDto> {
        const patient = await this.prisma.patient.findUnique({
            where: { id },
        });

        if (!patient) {
            throw new NotFoundException(`Patient not found: ${id}`);
        }

        return PatientResponseDto.fromEntity(patient);
    }

    async findByUserId(userId: string): Promise<PatientResponseDto> {
        const patient = await this.prisma.patient.findUnique({
            where: { userId },
        });

        if (!patient) {
            throw new NotFoundException(`Patient not found for user: ${userId}`);
        }

        return PatientResponseDto.fromEntity(patient);
    }

    async findAll(query: PatientQueryDto): Promise<PatientListResponseDto> {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (query.search) {
            where.OR = [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        if (query.gender) {
            where.gender = query.gender;
        }

        if (query.bloodType) {
            where.bloodType = query.bloodType;
        }

        if (query.isActive !== undefined) {
            where.isActive = query.isActive;
        }

        const [patients, total] = await Promise.all([
            this.prisma.patient.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.patient.count({ where }),
        ]);

        return {
            patients: patients.map(PatientResponseDto.fromEntity),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async update(
        id: string,
        dto: UpdatePatientDto,
        correlationId?: string,
    ): Promise<PatientResponseDto> {
        // Check if patient exists
        const existing = await this.prisma.patient.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new NotFoundException(`Patient not found: ${id}`);
        }

        // Check email uniqueness if being updated
        if (dto.email && dto.email !== existing.email) {
            const emailExists = await this.prisma.patient.findUnique({
                where: { email: dto.email },
            });

            if (emailExists) {
                throw new ConflictException('Email already in use');
            }
        }

        const patient = await this.prisma.patient.update({
            where: { id },
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
                gender: dto.gender,
                email: dto.email,
                phone: dto.phone,
                addressLine1: dto.addressLine1,
                addressLine2: dto.addressLine2,
                city: dto.city,
                state: dto.state,
                postalCode: dto.postalCode,
                country: dto.country,
                bloodType: dto.bloodType,
                allergies: dto.allergies,
                chronicConditions: dto.chronicConditions,
                emergencyContactName: dto.emergencyContactName,
                emergencyContactPhone: dto.emergencyContactPhone,
                emergencyContactRelation: dto.emergencyContactRelation,
                insuranceProvider: dto.insuranceProvider,
                insurancePolicyNumber: dto.insurancePolicyNumber,
                insuranceGroupNumber: dto.insuranceGroupNumber,
                isActive: dto.isActive,
            },
        });

        this.logger.log(`Patient updated: ${patient.email} [${patient.id}]`);

        // Publish patient.updated event
        await this.rabbitMQ.publishEvent(
            EventName.PATIENT_UPDATED,
            {
                patientId: patient.id,
                userId: patient.userId,
                changes: Object.keys(dto),
            },
            correlationId,
        );

        return PatientResponseDto.fromEntity(patient);
    }

    async delete(id: string, correlationId?: string): Promise<void> {
        const patient = await this.prisma.patient.findUnique({
            where: { id },
        });

        if (!patient) {
            throw new NotFoundException(`Patient not found: ${id}`);
        }

        // Soft delete - just mark as inactive
        await this.prisma.patient.update({
            where: { id },
            data: { isActive: false },
        });

        this.logger.log(`Patient deactivated: ${patient.email} [${patient.id}]`);

        // Publish patient.deleted event
        await this.rabbitMQ.publishEvent(
            EventName.PATIENT_DELETED,
            {
                patientId: patient.id,
                userId: patient.userId,
            },
            correlationId,
        );
    }

    // Called when user.created event is received
    async createFromUserEvent(userData: {
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
    }): Promise<PatientResponseDto | null> {
        // Check if patient already exists
        const existing = await this.prisma.patient.findUnique({
            where: { userId: userData.userId },
        });

        if (existing) {
            this.logger.debug(`Patient already exists for user: ${userData.userId}`);
            return null;
        }

        const patient = await this.prisma.patient.create({
            data: {
                userId: userData.userId,
                email: userData.email,
                firstName: userData.firstName,
                lastName: userData.lastName,
                dateOfBirth: new Date('1990-01-01'), // Placeholder - user needs to update
            },
        });

        this.logger.log(`Patient created from user event: ${patient.email}`);

        return PatientResponseDto.fromEntity(patient);
    }
}