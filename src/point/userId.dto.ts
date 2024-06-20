import 'reflect-metadata';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class UserIdParam {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  id: number;
}
