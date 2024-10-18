import { Injectable } from '@nestjs/common';
import * as Braintree from 'braintree';
import * as paypal from 'paypal-rest-sdk';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService {
  private readonly paypalClient: paypal.Client;
  private readonly braintreeGateway: Braintree.Gateway;

  constructor(private readonly configService: ConfigService) {
    // Load environment variables for credentials (replace with your actual values)

    this.paypalClient = paypal.configure({
      mode: 'sandbox', // Change to 'live' for production
      client_id: configService.get('PAYPAL_CLIENT_ID'),
      client_secret: configService.get('PAYPAL_CLIENT_SECRET'),
    });

    this.braintreeGateway = new Braintree.Gateway({
      environment: Braintree.Environment.Sandbox, // Change to 'Production' for production
      merchantId: configService.get('BRAINTREE_MERCHANT_ID'),
      publicKey: configService.get('BRAINTREE_PUBLIC_KEY'),
      privateKey: configService.get('BRAINTREE_PRIVATE_KEY'),
    });
  }

  public getPaypalClient() {
    return this.paypalClient;
  }

  public getBraintreeGateway() {
    return this.braintreeGateway;
  }

  async makePayment(data: CreatePaymentDto) {
    const {
      amount,
      currency,
      cardNumber,
      expirationMonth,
      expirationYear,
      cvv,
    } = data;

    if (currency !== 'USD' && cardNumber.startsWith('3')) {
      return {
        success: false,
        error: 'AMEX cards are only supported for USD transactions',
      };
    }

    try {
      if (
        currency === 'USD' ||
        currency === 'EUR' ||
        currency === 'AUD' ||
        cardNumber.startsWith('3')
      ) {
        const paypalPayment = {
          intent: 'sale',
          payer: {
            payment_method: 'credit_card',
            funding_instruments: [
              {
                credit_card: {
                  type: cardNumber.startsWith('3') ? 'amex' : undefined, // Set type only for AMEX
                  number: cardNumber,
                  expire_month: expirationMonth,
                  expire_year: expirationYear,
                  cvv2: cvv,
                  billing_address: {
                    // Optional: Add billing address details if needed
                  },
                },
              },
            ],
          },
          transactions: [
            {
              item_list: {
                items: [
                  {
                    name: 'Your Order',
                    price: amount,
                    currency: currency,
                    quantity: 1,
                  },
                ],
              },
              amount: {
                total: amount,
                currency: currency,
              },
            },
          ],
          redirect_urls: {
            return_url: 'http://localhost:3000/success', // Update with your success redirect URL
            cancel_url: 'http://localhost:3000/cancel', // Update with your cancellation redirect URL
          },
        };

        const paypalResponse =
          await this.paypalClient.payment.create(paypalPayment);
        return { success: true, redirectUrl: paypalResponse.links[0].href };
      } else {
        const braintreeTransaction =
          await this.braintreeGateway.transaction.sale({
            amount: amount,
            paymentMethod: {
              type: 'credit_card',
              card: {
                number: cardNumber,
                expirationMonth,
                expirationYear,
                cvv,
              },
            },
            options: {
              submitForSettlement: true, // Capture payment immediately
            },
          });

        if (braintreeTransaction.success) {
          return { success: true, message: 'Payment successful!' };
        } else {
          return { success: false, error: braintreeTransaction.message };
        }
      }
    } catch (error) {
      console.error(error);
      return { success: false, error: 'An unexpected error occurred.' };
    }
  }
}
