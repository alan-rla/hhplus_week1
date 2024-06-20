import 'reflect-metadata';
import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class PointBody {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  amount: number;
}
