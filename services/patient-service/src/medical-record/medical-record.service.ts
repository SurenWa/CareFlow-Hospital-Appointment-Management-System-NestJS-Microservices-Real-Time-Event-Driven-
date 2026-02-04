import {
    Injectable,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import {
    CreateMedicalRecordDto,
    UpdateMedicalRecordDto,
    MedicalRecordQueryDto,
    MedicalRecordResponseDto,
    MedicalRecordListResponseDto,
} from './dto/medical-record.dto';
import { EventName } from '@careflow/shared';

@Injectable()
export class MedicalRecordService {
    private readonly logger = new Logger(MedicalRecordService.name);

    constructor(
        private prisma: PrismaService,
        private rabbitMQ: RabbitMQService,
    ) { }

    async create(
        patientId: string,
        dto: CreateMedicalRecordDto,
        correlationId?: string,
    ): Promise<MedicalRecordResponseDto> {
        // Verify patient exists
        const patient = await this.prisma.patient.findUnique({
            where: { id: patientId },
        });

        if (!patient) {
            throw new NotFoundException(`Patient not found: ${patientId}`);
        }

        const record = await this.prisma.medicalRecord.create({
            data: {
                patientId,
                type: dto.type,
                title: dto.title,
                description: dto.description,
                data: dto.data,
                providerId: dto.providerId,
                providerName: dto.providerName,
                recordDate: new Date(dto.recordDate),
                isConfidential: dto.isConfidential || false,
            },
        });

        this.logger.log(`Medical record created: ${record.title} [${record.id}]`);

        // Publish event
        await this.rabbitMQ.publishEvent(
            EventName.MEDICAL_RECORD_UPLOADED,
            {
                recordId: record.id,
                patientId: record.patientId,
                type: record.type,
                title: record.title,
            },
            correlationId,
        );

        return MedicalRecordResponseDto.fromEntity(record);
    }

    async findById(
        patientId: string,
        recordId: string,
    ): Promise<MedicalRecordResponseDto> {
        const record = await this.prisma.medicalRecord.findFirst({
            where: {
                id: recordId,
                patientId,
            },
        });

        if (!record) {
            throw new NotFoundException(`Medical record not found: ${recordId}`);
        }

        return MedicalRecordResponseDto.fromEntity(record);
    }

    async findAllByPatient(
        patientId: string,
        query: MedicalRecordQueryDto,
    ): Promise<MedicalRecordListResponseDto> {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = { patientId };

        if (query.type) {
            where.type = query.type;
        }

        if (query.fromDate || query.toDate) {
            where.recordDate = {};
            if (query.fromDate) {
                where.recordDate.gte = new Date(query.fromDate);
            }
            if (query.toDate) {
                where.recordDate.lte = new Date(query.toDate);
            }
        }

        const [records, total] = await Promise.all([
            this.prisma.medicalRecord.findMany({
                where,
                skip,
                take: limit,
                orderBy: { recordDate: 'desc' },
            }),
            this.prisma.medicalRecord.count({ where }),
        ]);

        return {
            records: records.map(MedicalRecordResponseDto.fromEntity),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async update(
        patientId: string,
        recordId: string,
        dto: UpdateMedicalRecordDto,
        correlationId?: string,
    ): Promise<MedicalRecordResponseDto> {
        // Verify record exists and belongs to patient
        const existing = await this.prisma.medicalRecord.findFirst({
            where: {
                id: recordId,
                patientId,
            },
        });

        if (!existing) {
            throw new NotFoundException(`Medical record not found: ${recordId}`);
        }

        const record = await this.prisma.medicalRecord.update({
            where: { id: recordId },
            data: {
                type: dto.type,
                title: dto.title,
                description: dto.description,
                data: dto.data,
                providerId: dto.providerId,
                providerName: dto.providerName,
                recordDate: dto.recordDate ? new Date(dto.recordDate) : undefined,
                isConfidential: dto.isConfidential,
            },
        });

        this.logger.log(`Medical record updated: ${record.title} [${record.id}]`);

        return MedicalRecordResponseDto.fromEntity(record);
    }

    async delete(
        patientId: string,
        recordId: string,
        correlationId?: string,
    ): Promise<void> {
        const record = await this.prisma.medicalRecord.findFirst({
            where: {
                id: recordId,
                patientId,
            },
        });

        if (!record) {
            throw new NotFoundException(`Medical record not found: ${recordId}`);
        }

        await this.prisma.medicalRecord.delete({
            where: { id: recordId },
        });

        this.logger.log(`Medical record deleted: [${recordId}]`);
    }
}