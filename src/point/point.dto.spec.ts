import { validate } from 'class-validator';
import { PointBody } from './point.dto';
import { plainToInstance } from 'class-transformer';

describe('PointBody Dto', () => {
  // amount가 float일 때 validation fail
  it('should fail validation when amount is not an integer', async () => {
    const amount = 1.1;
    const pointBody = plainToInstance(PointBody, { amount });

    const errors = await validate(pointBody);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isInt');
  });

  // amount가 음수일 때 validation fail
  it('should fail validation when amount is not positive', async () => {
    const amount = -1;
    const pointBody = plainToInstance(PointBody, { amount });

    const errors = await validate(pointBody);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isPositive');
  });

  // amount가 0일 때 validation fail
  it('should fail validation when amount is zero', async () => {
    const amount = 0;
    const pointBody = plainToInstance(PointBody, { amount });

    const errors = await validate(pointBody);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isPositive');
  });

  // amount가 없을 때 validation fail
  it('should fail validation when amount is empty', async () => {
    const amount = null;
    const pointBody = plainToInstance(PointBody, { amount });

    const errors = await validate(pointBody);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });
});
