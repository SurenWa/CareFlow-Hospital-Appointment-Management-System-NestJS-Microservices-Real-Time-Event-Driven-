import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    Query,
    Req,
    HttpCode,
    HttpStatus,
    Headers,
    RawBodyRequest,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
    ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ProxyService, ServiceTarget } from '../proxy.service';
import { Roles, Permissions, CurrentUser, Public } from '../../common/decorators';
import { UserRole, Permission, UserContext } from '@careflow/shared';

/**
 * Billing Proxy Controller
 *
 * Proxies billing and payment requests to Billing Service.
 *
 * Includes:
 * - Payment intent creation (for Stripe)
 * - Invoice management
 * - Payment history
 * - Stripe webhook handling (special case - no auth)
 */
@ApiTags('Billing')
@Controller('billing')
export class BillingProxyController {
    constructor(private proxyService: ProxyService) {}

    // ==================== Payment Intents ====================

    @Post('payment-intents')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create payment intent for appointment' })
    @ApiResponse({ status: 201, description: 'Payment intent created' })
    async createPaymentIntent(
        @Body() body: { appointmentId: string; amount?: number },
        @Req() request: Request,
    ): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.BILLING,
            request,
            '/billing/payment-intents',
            { data: body },
        );
    }

    @Get('payment-intents/:id')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get payment intent status' })
    async getPaymentIntent(@Param('id') id: string, @Req() request: Request): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.BILLING,
            request,
            `/billing/payment-intents/${id}`,
        );
    }

    // ==================== Invoices ====================

    @Get('invoices')
    @ApiBearerAuth()
    @Permissions(Permission.BILLING_READ)
    @ApiOperation({ summary: 'List invoices' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiQuery({ name: 'patientId', required: false, type: String })
    async listInvoices(@Req() request: Request): Promise<any> {
        return this.proxyService.forward(ServiceTarget.BILLING, request, '/billing/invoices');
    }

    @Get('invoices/my')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user invoices' })
    async getMyInvoices(@CurrentUser() user: UserContext, @Req() request: Request): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.BILLING,
            request,
            `/billing/invoices/user/${user.userId}`,
        );
    }

    @Get('invoices/:id')
    @ApiBearerAuth()
    @Permissions(Permission.BILLING_READ)
    @ApiOperation({ summary: 'Get invoice by ID' })
    async getInvoice(@Param('id') id: string, @Req() request: Request): Promise<any> {
        return this.proxyService.forward(ServiceTarget.BILLING, request, `/billing/invoices/${id}`);
    }

    @Get('invoices/:id/pdf')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Download invoice as PDF' })
    async downloadInvoicePdf(@Param('id') id: string, @Req() request: Request): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.BILLING,
            request,
            `/billing/invoices/${id}/pdf`,
        );
    }

    // ==================== Payment History ====================

    @Get('payments')
    @ApiBearerAuth()
    @Permissions(Permission.BILLING_READ)
    @ApiOperation({ summary: 'List payment transactions' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false, type: String })
    async listPayments(@Req() request: Request): Promise<any> {
        return this.proxyService.forward(ServiceTarget.BILLING, request, '/billing/payments');
    }

    @Get('payments/my')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user payment history' })
    async getMyPayments(@CurrentUser() user: UserContext, @Req() request: Request): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.BILLING,
            request,
            `/billing/payments/user/${user.userId}`,
        );
    }

    @Get('payments/:id')
    @ApiBearerAuth()
    @Permissions(Permission.BILLING_READ)
    @ApiOperation({ summary: 'Get payment details' })
    async getPayment(@Param('id') id: string, @Req() request: Request): Promise<any> {
        return this.proxyService.forward(ServiceTarget.BILLING, request, `/billing/payments/${id}`);
    }

    // ==================== Refunds ====================

    @Post('payments/:id/refund')
    @ApiBearerAuth()
    @Roles(UserRole.ADMIN)
    @Permissions(Permission.BILLING_WRITE)
    @ApiOperation({ summary: 'Issue refund for payment (Admin only)' })
    async refundPayment(
        @Param('id') id: string,
        @Body() body: { amount?: number; reason: string },
        @Req() request: Request,
    ): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.BILLING,
            request,
            `/billing/payments/${id}/refund`,
            { data: body },
        );
    }

    // ==================== Stripe Webhook ====================

    /**
     * Stripe Webhook Endpoint
     *
     * IMPORTANT: This endpoint is PUBLIC (no JWT auth)
     * Security is handled via Stripe signature verification in Billing Service
     *
     * We need raw body for signature verification, hence RawBodyRequest
     */
    @Public()
    @Post('webhooks/stripe')
    @HttpCode(HttpStatus.OK)
    @ApiExcludeEndpoint() // Hide from Swagger - internal use only
    async handleStripeWebhook(
        @Headers('stripe-signature') signature: string,
        @Req() request: RawBodyRequest<Request>,
    ): Promise<{ received: boolean }> {
        // Forward the raw body and signature to Billing Service
        // Billing Service will verify the signature
        return this.proxyService.forward(
            ServiceTarget.BILLING,
            request,
            '/billing/webhooks/stripe',
            {
                headers: {
                    'stripe-signature': signature,
                    'content-type': 'application/json',
                },
                data: request.body,
            },
        );
    }

    // ==================== Reports (Admin) ====================

    @Get('reports/revenue')
    @ApiBearerAuth()
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get revenue report' })
    @ApiQuery({ name: 'startDate', required: true, type: String })
    @ApiQuery({ name: 'endDate', required: true, type: String })
    @ApiQuery({ name: 'groupBy', required: false, enum: ['day', 'week', 'month'] })
    async getRevenueReport(@Req() request: Request): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.BILLING,
            request,
            '/billing/reports/revenue',
        );
    }

    @Get('reports/outstanding')
    @ApiBearerAuth()
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get outstanding payments report' })
    async getOutstandingReport(@Req() request: Request): Promise<any> {
        return this.proxyService.forward(
            ServiceTarget.BILLING,
            request,
            '/billing/reports/outstanding',
        );
    }
}
