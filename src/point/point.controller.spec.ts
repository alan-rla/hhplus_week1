import { Test, TestingModule } from '@nestjs/testing';
import { PointController } from './point.controller';
import { PointBody } from './point.dto';
import { PointHistory, TransactionType, UserPoint } from './point.model';
import { DatabaseModule } from 'src/database/database.module';
import { plainToInstance } from 'class-transformer';
import { UserIdParam } from './userId.dto';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { PointConsumer } from './point.consumer';
import { PointService } from './point.service';
import { UserPointTable } from 'src/database/userpoint.table';
import { PointHistoryTable } from 'src/database/pointhistory.table';

const userId = 1;
const param = plainToInstance(UserIdParam, { id: userId });
const bodyAmount50 = plainToInstance(PointBody, { amount: 50 });
const bodyAmount100 = plainToInstance(PointBody, { amount: 100 });

const charge = TransactionType.CHARGE;
const use = TransactionType.USE;

const charge50History: PointHistory = {
  id: expect.any(Number),
  userId: 1,
  type: charge,
  amount: 50,
  timeMillis: expect.any(Number),
};
const charge100History: PointHistory = {
  id: expect.any(Number),
  userId: 1,
  type: charge,
  amount: 100,
  timeMillis: expect.any(Number),
};
const use50History: PointHistory = {
  id: expect.any(Number),
  userId: 1,
  type: use,
  amount: 50,
  timeMillis: expect.any(Number),
};

// const userPoint0: UserPoint = { id: 1, point: 0, updateMillis: expect.any(Number) };
const userPoint50: UserPoint = { id: 1, point: 50, updateMillis: expect.any(Number) };
const userPoint100: UserPoint = { id: 1, point: 100, updateMillis: expect.any(Number) };
const userPoint500: UserPoint = { id: 1, point: 500, updateMillis: expect.any(Number) };

describe('PointController', () => {
  let moduleRef: TestingModule;
  let pointController: PointController;
  let pointService: PointService;
  let userDb: UserPointTable;
  let historyDb: PointHistoryTable;
  const pointQueueMock = { add: jest.fn(), process: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();

    moduleRef = await Test.createTestingModule({
      imports: [
        DatabaseModule,
        BullModule.registerQueue({
          name: 'pointQueue',
        }),
      ],
      controllers: [PointController],
      providers: [PointService, PointConsumer],
    })
      .overrideProvider(getQueueToken('pointQueue'))
      .useValue(pointQueueMock)
      .compile();

    pointController = moduleRef.get<PointController>(PointController);
    pointService = moduleRef.get<PointService>(PointService);
    userDb = moduleRef.get<UserPointTable>(UserPointTable);
    historyDb = moduleRef.get<PointHistoryTable>(PointHistoryTable);
  });

  it('PointController toBeDefined 테스트', () => {
    expect(pointController).toBeDefined();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe('GET /point/:id', () => {
    // 포인트 조회 성공 케이스
    it('should return user point', async () => {
      // UserPointTable selectById 값 mocking
      jest.spyOn(userDb, 'selectById').mockResolvedValue(userPoint100);
      // Controller 결과값과 비교
      await expect(pointController.point(param)).resolves.toEqual(userPoint100);
      // selectById 입력된 userId로 1번 호출됐는지 확인
      expect(userDb.selectById).toHaveBeenCalledTimes(1);
      expect(userDb.selectById).toHaveBeenCalledWith(userId);
    });
  });

  // 포인트 충전 후 history 조회
  describe('GET /point/:id/histories', () => {
    it('should return point history of a user', async () => {
      const historyArray = [charge50History, charge100History];
      // PointHistoryTable selectAllByUserId 값 mocking
      jest.spyOn(historyDb, 'selectAllByUserId').mockResolvedValue(historyArray);
      // Controller 결과값과 비교
      await expect(pointController.history(param)).resolves.toEqual(historyArray);
      // selectAllByUserId 입력된 userId로 1번 호출됐는지 확인
      expect(historyDb.selectAllByUserId).toHaveBeenCalledTimes(1);
      expect(historyDb.selectAllByUserId).toHaveBeenCalledWith(userId);
    });
  });

  /**
   * 유저의 기존 포인트 50, 충전 포인트 100, 충전 후 포인트 150에 대한 테스트
   * 충전 후 현재 포인트 150, 충전 기록 50/100 존재해야 함
   */
  describe('PATCH /point/:id/charge', () => {
    it('should charge point of a user', async () => {
      // pointService addChargeQueue 값 mocking
      jest.spyOn(pointService, 'addChargeQueue').mockResolvedValue(charge50History);
      // Controller 결과값과 비교
      await expect(pointController.charge(param, bodyAmount50)).resolves.toEqual(charge50History);
      // addChargeQueue 입력된 userId + amount 로 1번 호출됐는지 확인
      expect(pointService.addChargeQueue).toHaveBeenCalledTimes(1);
      expect(pointService.addChargeQueue).toHaveBeenCalledWith(userId, 50);
    });

    /**
     * 포인트 충전 동시성 테스트
     * 100 포인트 충전 10번 동시 시도
     * 기대 결과값: pointHistory 10건, 유저 포인트 1000
     */
    it('should charge point when concurrent requests come in', async () => {
      const historyArray = [];
      for (let i = 0; i < 5; i++) historyArray.push(charge100History);

      // pointService addChargeQueue 값 mocking
      jest.spyOn(pointService, 'addChargeQueue').mockResolvedValue(charge100History);
      // charge 5번 동시 진행
      await Promise.all([
        expect(pointController.charge(param, bodyAmount100)).resolves.toEqual(charge100History),
        expect(pointController.charge(param, bodyAmount100)).resolves.toEqual(charge100History),
        expect(pointController.charge(param, bodyAmount100)).resolves.toEqual(charge100History),
        expect(pointController.charge(param, bodyAmount100)).resolves.toEqual(charge100History),
        expect(pointController.charge(param, bodyAmount100)).resolves.toEqual(charge100History),
      ]);
      // addChargeQueue 호출 횟수 확인 (동시성)
      expect(pointService.addChargeQueue).toHaveBeenCalledTimes(5);
      expect(pointService.addChargeQueue).toHaveBeenCalledWith(userId, 100);
      // 100 포인트 5번 충전해 point = 500, history = 5개 확인
      jest.spyOn(userDb, 'selectById').mockResolvedValue(userPoint500);
      await expect(pointController.point(param)).resolves.toEqual(userPoint500);
      jest.spyOn(historyDb, 'selectAllByUserId').mockResolvedValue(historyArray);
      await expect(pointController.history(param)).resolves.toEqual(historyArray);
    });
  });

  describe('PATCH /point/:id/use', () => {
    // 사용하려는 포인트 > 가진 포인트의 경우 실패
    it('tries to use point but fails (point not enough)', async () => {
      // addUseQueue로 에러 반환
      jest.spyOn(pointService, 'addUseQueue').mockRejectedValue(new Error('NOT_ENOUGH_POINT'));
      await expect(pointController.use(param, bodyAmount50)).rejects.toThrow('NOT_ENOUGH_POINT');
    });

    // 현재 포인트 100, 50 포인트 사용, 남는 포인트 50
    it('should use point of a user', async () => {
      const historyArray = [charge100History, use50History];
      jest.spyOn(userDb, 'selectById').mockResolvedValue(userPoint100);
      jest.spyOn(pointService, 'addUseQueue').mockResolvedValue(userPoint50);
      jest.spyOn(historyDb, 'selectAllByUserId').mockResolvedValue(historyArray);
      await expect(pointController.use(param, bodyAmount50)).resolves.toEqual(userPoint50);
    });
  });
});
