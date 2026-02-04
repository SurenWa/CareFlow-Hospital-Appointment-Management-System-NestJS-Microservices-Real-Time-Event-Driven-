// Run: npx ts-node scripts/create-admin.ts
import { MongoClient } from 'mongodb';
import * as bcrypt from 'bcrypt';

async function createAdmin() {
    const client = await MongoClient.connect('mongodb://careflow:careflow_dev@localhost:27018/careflow_auth?authSource=admin');
    const db = client.db('careflow_auth');

    const passwordHash = await bcrypt.hash('AdminPass123!', 12);

    await db.collection('users').insertOne({
        email: 'admin@careflow.com',
        passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        roles: ['ADMIN'],
        permissions: ['user:manage', 'system:admin'],
        isActive: true,
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    console.log('Admin created!');
    await client.close();
}

createAdmin();