import { Test, TestingModule } from '@nestjs/testing';
import { PointService } from './point.service';
import { PointConsumer } from './point.consumer';
import { DatabaseModule } from 'src/database/database.module';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { UserPointTable } from 'src/database/userpoint.table';
import { PointHistoryTable } from 'src/database/pointhistory.table';
import { PointHistory, TransactionType, UserPoint } from './point.model';

const userId = 1;

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

const userPoint50: UserPoint = { id: 1, point: 50, updateMillis: expect.any(Number) };
const userPoint100: UserPoint = { id: 1, point: 100, updateMillis: expect.any(Number) };

describe('PointService', () => {
  let moduleRef: TestingModule;
  let pointService: PointService;
  let pointConsumer: PointConsumer;
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
      providers: [PointService, PointConsumer],
    })
      .overrideProvider(getQueueToken('pointQueue'))
      .useValue(pointQueueMock)
      .compile();

    pointService = moduleRef.get<PointService>(PointService);
    pointConsumer = moduleRef.get<PointConsumer>(PointConsumer);
    userDb = moduleRef.get<UserPointTable>(UserPointTable);
    historyDb = moduleRef.get<PointHistoryTable>(PointHistoryTable);
    pointQueue = moduleRef.get('pointQueue');
  });

  it('should be defined', () => {
    expect(pointService).toBeDefined();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe('Charge service', () => {
    it('should charge user point', async () => {
      // 사용되는 함수 반환 값 mocking
      jest.spyOn(userDb, 'selectById').mockResolvedValue(userPoint50);
      jest.spyOn(userDb, 'insertOrUpdate').mockResolvedValue(userPoint100);
      jest.spyOn(historyDb, 'insert').mockResolvedValue(charge50History);
      // Service 결과값과 비교
      await expect(pointService.charge(userId, 50)).resolves.toEqual(userPoint100);
      // selectById, insertOrUpdate, insert 입력 파라미터, 호출 횟수 확인
      expect(userDb.selectById).toHaveBeenCalledTimes(1);
      expect(userDb.selectById).toHaveBeenCalledWith(userId);
      expect(userDb.insertOrUpdate).toHaveBeenCalledTimes(1);
      expect(userDb.insertOrUpdate).toHaveBeenCalledWith(userId, 100);
      expect(historyDb.insert).toHaveBeenCalledTimes(1);
    });

    it('should use user point', async () => {
      // 사용되는 함수 반환 값 mocking
      jest.spyOn(userDb, 'insertOrUpdate').mockResolvedValue(userPoint50);
      jest.spyOn(historyDb, 'insert').mockResolvedValue(use50History);
      // Service 결과값과 비교
      await expect(pointService.use(userId, 50)).resolves.toEqual(userPoint50);
      // selectById, insertOrUpdate, insert 입력 파라미터, 호출 횟수 확인
      expect(userDb.insertOrUpdate).toHaveBeenCalledTimes(1);
      expect(userDb.insertOrUpdate).toHaveBeenCalledWith(userId, 50);
      expect(historyDb.insert).toHaveBeenCalledTimes(1);
    });

    it('should add charge queue', async () => {
      // 사용되는 함수 반환 값 mocking
      // const bullJob = new Bull('pointQueue');
      // jest.spyOn(pointQueueMock, 'add').mockResolvedValue(bullJob);
      // await expect(pointService.addChargeQueue(userId, 50)).resolves.toEqual(bullJob.finished());
    });
  });
});
