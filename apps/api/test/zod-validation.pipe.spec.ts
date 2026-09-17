import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ count: z.number().int().positive() }));

  it('returns parsed data', () => {
    expect(pipe.transform({ count: 2 })).toEqual({ count: 2 });
  });

  it('returns field-level details for invalid input', () => {
    expect.assertions(2);
    try {
      pipe.transform({ count: -1 });
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        message: 'Validation failed',
        details: [expect.objectContaining({ path: 'count' })],
      });
    }
  });
});
