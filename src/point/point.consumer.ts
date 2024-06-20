import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PointService } from './point.service';

@Processor('pointQueue')
export class PointConsumer {
  constructor(private readonly pointService: PointService) {}

  @Process('charge')
  async getChargeQueue(job: Job<{ userId: number; amount: number }>) {
    const charge = await this.pointService.charge(job.data.userId, job.data.amount);
    return charge;
  }

  @Process('use')
  async getUseQueue(job: Job<{ userId: number; amount: number }>) {
    const use = await this.pointService.use(job.data.userId, job.data.amount);
    return use;
  }
}
