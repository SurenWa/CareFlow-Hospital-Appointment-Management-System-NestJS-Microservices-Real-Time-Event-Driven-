import { Module } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { AuthProxyController } from './controllers/auth-proxy.controller';
import { PatientProxyController } from './controllers/patient-proxy.controller';
import { AppointmentProxyController } from './controllers/appointment-proxy.controller';
import { BillingProxyController } from './controllers/billing-proxy.controller';

/**
 * Proxy Module
 *
 * Contains all proxy controllers that forward requests to internal services.
 * Each controller handles a specific domain (auth, patients, appointments, billing).
 */
@Module({
    providers: [ProxyService],
    controllers: [
        AuthProxyController,
        PatientProxyController,
        AppointmentProxyController,
        BillingProxyController,
    ],
    exports: [ProxyService],
})
export class ProxyModule {}
