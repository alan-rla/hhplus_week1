import { Module } from '@nestjs/common';
import { PointController } from './point.controller';
import { DatabaseModule } from 'src/database/database.module';
import { BullModule } from '@nestjs/bull';
import { PointService } from './point.service';
import { PointConsumer } from './point.consumer';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'pointQueue',
    }),
  ],
  controllers: [PointController],
  providers: [PointService, PointConsumer],
})
export class PointModule {}
