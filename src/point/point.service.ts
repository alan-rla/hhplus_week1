import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { PointHistoryTable } from 'src/database/pointhistory.table';
import { UserPointTable } from 'src/database/userpoint.table';
import { TransactionType } from './point.model';

@Injectable()
export class PointService {
  constructor(
    private readonly userDb: UserPointTable,
    private readonly historyDb: PointHistoryTable,
    @InjectQueue('pointQueue') private pointQueue: Queue,
  ) {}

  /**
   * 질문: 컨트롤러 테스트시 실행된 함수의 결과값이 필요해서 await job.finished()를 사용했는데
   * 정작 addChargeQueue의 테스트 코드를 짜는 방법을 찾지 못하고 막혔습니다 ㅠㅠ
   * 동시성의 기능을 살리리면 bull에 넣어둔 작업이 끝날 때 까지 기다리지 않는게 맞는것 같은데 테스트 목적을 위해 기다리는게 맞는걸까요?
   * 그리고 테스트 코드가 실행되면 .finished() 에서 undefined 에러가 반환되는데 테스트를 위해 다른 좋은 방법이 있을까요?
   */
  async addChargeQueue(userId: number, amount: number) {
    const job = await this.pointQueue.add('charge', { userId, amount }, { removeOnComplete: true, removeOnFail: true });
    const chargeJob = await job.finished();
    return chargeJob;
  }

  async charge(userId: number, amount: number) {
    const pointBefore = await this.userDb.selectById(userId);
    pointBefore.point += amount;
    const userPoint = await this.userDb.insertOrUpdate(userId, pointBefore.point);
    const updateMillis = Date.now();
    await this.historyDb.insert(userId, amount, TransactionType.CHARGE, updateMillis);
    return userPoint;
  }

  async addUseQueue(userId: number, amount: number) {
    const pointBefore = await this.userDb.selectById(userId);
    pointBefore.point -= amount;

    if (pointBefore.point < 0) throw new Error('NOT_ENOUGH_POINT');
    else {
      const job = await this.pointQueue.add(
        'use',
        { userId, amount: pointBefore.point },
        { removeOnComplete: true, removeOnFail: true },
      );
      const useJob = await job.finished();
      return useJob;
    }
  }

  async use(userId: number, amount: number) {
    const updateMillis = Date.now();
    const userPoint = await this.userDb.insertOrUpdate(userId, amount);
    await this.historyDb.insert(userId, amount, TransactionType.USE, updateMillis);
    return userPoint;
  }
}
