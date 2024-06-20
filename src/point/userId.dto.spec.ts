import { validate } from 'class-validator';
import { UserIdParam } from './userId.dto';
import { plainToInstance } from 'class-transformer';

describe('UserIdParam Dto', () => {
  // userId가 float일 때 validation fail
  it('should fail validation when userId is not an integer', async () => {
    const id = '1.1';
    const userIdParam = plainToInstance(UserIdParam, { id });

    const errors = await validate(userIdParam);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isInt');
  });

  // userId가 음수일 때 validation fail
  it('should fail validation when userId is not positive', async () => {
    const id = '-1';
    const userIdParam = plainToInstance(UserIdParam, { id });

    const errors = await validate(userIdParam);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isPositive');
  });

  // userId가 0일 때 validation fail
  it('should fail validation when userId is zero', async () => {
    const id = '0';
    const userIdParam = plainToInstance(UserIdParam, { id });

    const errors = await validate(userIdParam);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isPositive');
  });

  // userId가 없을 때 validation fail
  it('should fail validation when userId is empty', async () => {
    const id = null;
    const userIdParam = plainToInstance(UserIdParam, { id });

    const errors = await validate(userIdParam);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });
});
