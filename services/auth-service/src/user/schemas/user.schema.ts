import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole, Permission } from '@careflow/shared';

@Schema({
    timestamps: true,
    collection: 'users',
})
export class User {
    _id: Types.ObjectId;

    @Prop({
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    })
    email: string;

    @Prop({ required: true })
    passwordHash: string;

    @Prop({ required: true, trim: true, maxlength: 50 })
    firstName: string;

    @Prop({ required: true, trim: true, maxlength: 50 })
    lastName: string;

    @Prop({
        type: [String],
        enum: Object.values(UserRole),
        default: [UserRole.PATIENT],
        index: true,
    })
    roles: UserRole[];

    @Prop({
        type: [String],
        enum: Object.values(Permission),
        default: [],
    })
    permissions: Permission[];

    @Prop({ trim: true })
    phoneNumber?: string;

    @Prop({ type: Types.ObjectId })
    departmentId?: Types.ObjectId;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: false })
    isEmailVerified: boolean;

    @Prop()
    emailVerificationToken?: string;

    @Prop()
    emailVerificationExpires?: Date;

    @Prop()
    passwordResetToken?: string;

    @Prop()
    passwordResetExpires?: Date;

    @Prop({ default: 0 })
    failedLoginAttempts: number;

    @Prop()
    lockoutUntil?: Date;

    @Prop()
    lastLoginAt?: Date;

    @Prop()
    lastLoginIp?: string;

    @Prop({
        type: [
            {
                token: String,
                expiresAt: Date,
                createdAt: { type: Date, default: Date.now },
                userAgent: String,
                ipAddress: String,
            },
        ],
        default: [],
    })
    refreshTokens: {
        token: string;
        expiresAt: Date;
        createdAt: Date;
        userAgent?: string;
        ipAddress?: string;
    }[];

    createdAt: Date;
    updatedAt: Date;
}

export type UserDocument = User & Document;

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1, isActive: 1 });
UserSchema.index({ roles: 1 });
UserSchema.index({ 'refreshTokens.token': 1 });

// Virtual fields
UserSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

UserSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// JSON transformation
UserSchema.set('toJSON', {
    virtuals: true,
    transform: (_, ret: any) => {
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.refreshTokens;
        delete ret.passwordResetToken;
        delete ret.emailVerificationToken;
        return ret;
    },
});

// Clean expired refresh tokens on save
UserSchema.pre('save', function (next) {
    if (this.refreshTokens && this.refreshTokens.length > 0) {
        const now = new Date();
        this.refreshTokens = this.refreshTokens.filter((rt) => rt.expiresAt > now);
    }
    next();
});