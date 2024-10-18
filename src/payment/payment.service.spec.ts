import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

describe('PaymentService', () => {
  let service: PaymentService;
  let braintreeGateway: any;
  let paypalClient: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentService],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paypalClient = service.getPaypalClient();
    braintreeGateway = service.getBraintreeGateway();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should make a successful PayPal payment', async () => {
    const paymentData = {
      amount: '100',
      currency: 'USD',
      cardNumber: '378282246310005',
      customerName: 'Test Customer',
      cardHolderName: 'Test Customer',
      expirationMonth: '12',
      expirationYear: '24',
      cvv: '123',
    };

    const result = await service.makePayment(paymentData);

    expect(result.success).toBe(true);
    expect(result.redirectUrl).toBeDefined();
  });

  it('should make a successful Braintree payment', async () => {
    const paymentData: CreatePaymentDto = {
      amount: '100',
      currency: 'THB',
      cardNumber: '378282246310005',
      customerName: 'Test Customer',
      cardHolderName: 'Test Customer',
      expirationMonth: '12',
      expirationYear: '24',
      cvv: '123',
    };

    const result = await service.makePayment(paymentData);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Payment successful!');
  });

  it('should handle AMEX cards correctly', async () => {
    const paymentData = {
      amount: '100',
      currency: 'THB',
      cardNumber: '3456789012345678',
      customerName: 'Test Customer',
      cardHolderName: 'Test Customer',
      expirationMonth: '12',
      expirationYear: '24',
      cvv: '123',
    };

    const result = await service.makePayment(paymentData);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      'AMEX cards are only supported for USD transactions',
    );
  });

  it('should handle errors gracefully', async () => {
    jest
      .spyOn(paypalClient.payment, 'create')
      .mockRejectedValueOnce(new Error('PayPal error'));
    jest
      .spyOn(braintreeGateway.transaction, 'sale')
      .mockRejectedValueOnce(new Error('Braintree error'));

    const paymentData = {
      amount: '100',
      currency: 'USD',
      cardNumber: '378282246310005',
      customerName: 'Test Customer',
      cardHolderName: 'Test Customer',
      expirationMonth: '12',
      expirationYear: '24',
      cvv: '123',
    };

    const result = await service.makePayment(paymentData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('An unexpected error occurred.');
  });
});
