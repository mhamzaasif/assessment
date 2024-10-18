export class CreatePaymentDto {
  amount: string;
  currency: string;
  customerName: string;
  cardHolderName: string;
  cardNumber: string;
  expirationMonth: string;
  expirationYear: string;
  cvv: string;
}
