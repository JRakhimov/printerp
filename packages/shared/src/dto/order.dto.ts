import { z } from 'zod';
import { OrderStatus, PaymentStatus } from '../enums/index.js';

export const OrderItemInputSchema = z.object({
  projectId: z.string().uuid(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  unitCost: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
});

export const CreateOrderSchema = z.object({
  clientId: z.string().uuid({ message: 'Valid client must be selected' }),
  deadline: z.string().datetime().optional().nullable(),
  comment: z.string().optional().nullable(),
  items: z.array(OrderItemInputSchema).min(1, 'At least one model item is required'),
  finalPrice: z.number().min(0).optional(),
  initialPaymentAmount: z.number().min(0).optional(),
  initialPaymentComment: z.string().optional(),
});

export const UpdateOrderSchema = z.object({
  clientId: z.string().uuid().optional(),
  deadline: z.string().datetime().optional().nullable(),
  comment: z.string().optional().nullable(),
  finalPrice: z.number().min(0).optional(),
});

export const ChangeOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  comment: z.string().optional(),
});

export type OrderItemInputDto = z.infer<typeof OrderItemInputSchema>;
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderDto = z.infer<typeof UpdateOrderSchema>;
export type ChangeOrderStatusDto = z.infer<typeof ChangeOrderStatusSchema>;
