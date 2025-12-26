import mongoose, { Document, Schema } from 'mongoose';

export type TableLocation = 'indoor' | 'outdoor' | 'terrace' | 'private';

export interface ITable extends Document {
  _id: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  capacity: number;
  minCapacity: number;
  location: TableLocation;
  description?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const tableSchema = new Schema<ITable>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Le nom de la table est requis'],
      trim: true,
      maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères'],
    },
    capacity: {
      type: Number,
      required: [true, 'La capacité est requise'],
      min: [1, 'La capacité minimum est 1'],
      max: [20, 'La capacité maximum est 20'],
    },
    minCapacity: {
      type: Number,
      default: 1,
      min: [1, 'La capacité minimum est 1'],
    },
    location: {
      type: String,
      enum: {
        values: ['indoor', 'outdoor', 'terrace', 'private'],
        message: 'Emplacement invalide',
      },
      default: 'indoor',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'La description ne peut pas dépasser 200 caractères'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
tableSchema.index({ restaurantId: 1, name: 1 }, { unique: true });
tableSchema.index({ restaurantId: 1, isActive: 1, capacity: 1 });
tableSchema.index({ restaurantId: 1, order: 1 });

// Pre-save: ensure minCapacity <= capacity
tableSchema.pre('save', function () {
  if (this.minCapacity > this.capacity) {
    this.minCapacity = 1;
  }
});

export const Table = mongoose.model<ITable>('Table', tableSchema);
