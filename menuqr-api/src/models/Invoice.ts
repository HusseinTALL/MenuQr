import mongoose, { Document, Schema } from 'mongoose';

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  invoiceNumber: string;
  restaurantId: mongoose.Types.ObjectId;
  subscriptionId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  billingCycle: 'monthly' | 'yearly';
  periodStart: Date;
  periodEnd: Date;
  items: IInvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: Date;
  paidAt?: Date;
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
  paymentMethod?: string;
  notes?: string;
  billingAddress?: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    vatNumber?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 20, // 20% TVA in France
      min: 0,
      max: 100,
    },
    taxAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'EUR',
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'paid', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paidAt: Date,
    stripeInvoiceId: String,
    stripePaymentIntentId: String,
    paymentMethod: String,
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    billingAddress: {
      name: String,
      street: String,
      city: String,
      postalCode: String,
      country: { type: String, default: 'FR' },
      vatNumber: String,
    },
  },
  {
    timestamps: true,
  }
);

// Generate invoice number before saving
invoiceSchema.pre('save', async function () {
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Get the count of invoices for this month
    const Invoice = mongoose.model<IInvoice>('Invoice');
    const count = await Invoice.countDocuments({
      createdAt: {
        $gte: new Date(`${year}-${month}-01`),
        $lt: new Date(`${year}-${Number(month) + 1}-01`),
      },
    });

    this.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
});

// Indexes (invoiceNumber unique index created by unique: true in schema)
invoiceSchema.index({ restaurantId: 1 });
invoiceSchema.index({ subscriptionId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ createdAt: -1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
export default Invoice;
