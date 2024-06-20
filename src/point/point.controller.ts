import { Body, Controller, Get, Param, Patch, UsePipes, ValidationPipe } from '@nestjs/common';
import { PointHistory, TransactionType, UserPoint } from './point.model';
import { UserPointTable } from 'src/database/userpoint.table';
import { PointHistoryTable } from 'src/database/pointhistory.table';
import { PointBody as PointDto } from './point.dto';
import { UserIdParam } from './userId.dto';
import { PointService } from './point.service';

@Controller('/point')
export class PointController {
  constructor(
    private readonly userDb: UserPointTable,
    private readonly historyDb: PointHistoryTable,
    private pointService: PointService,
  ) {}

  /**
   * TODO - 특정 유저의 포인트를 조회하는 기능을 작성해주세요.
   */
  @Get(':id')
  async point(@Param() param: UserIdParam): Promise<UserPoint> {
    const userId = param.id;
    const point = await this.userDb.selectById(userId);
    return point;
  }

  /**
   * TODO - 특정 유저의 포인트 충전/이용 내역을 조회하는 기능을 작성해주세요.
   */
  @Get(':id/histories')
  async history(@Param() param: UserIdParam): Promise<PointHistory[]> {
    const userId = param.id;
    const history = await this.historyDb.selectAllByUserId(userId);
    return history;
  }

  /**
   * TODO - 특정 유저의 포인트를 충전하는 기능을 작성해주세요.
   */
  @Patch(':id/charge')
  async charge(@Param() param: UserIdParam, @Body(ValidationPipe) body: PointDto) {
    const userId = param.id;
    const amount = body.amount;
    const chargeJob = await this.pointService.addChargeQueue(userId, amount);
    return chargeJob;
  }

  /**
   * TODO - 특정 유저의 포인트를 사용하는 기능을 작성해주세요.
   */
  @Patch(':id/use')
  async use(@Param() param: UserIdParam, @Body(ValidationPipe) body: PointDto) {
    const userId = param.id;
    const amount = body.amount;
    const useJob = await this.pointService.addUseQueue(userId, amount);
    return useJob;
  }
}
