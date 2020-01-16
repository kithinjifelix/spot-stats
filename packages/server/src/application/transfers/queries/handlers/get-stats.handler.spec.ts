import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { QueryBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { TestDbHelper } from '../../../../../test/test-db.helper';
import {
  getTestFacilities,
  getTestStatsData,
} from '../../../../../test/test.data';
import { TransfersModule } from '../../transfers.module';
import { CourtsInfrastructureModule } from '../../../../infrastructure/courts';
import { GetStatsHandler } from './get-stats.handler';
import { GetStatsQuery } from '../get-stats.query';

describe('Get Manifests Stats', () => {
  let module: TestingModule;
  const { dockets, masterfacilities } = getTestStatsData();
  const { facilities, manifests } = getTestFacilities();
  const dbHelper = new TestDbHelper();
  const liveData = facilities[0];
  liveData.summaries = [];
  let queryBus: QueryBus;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(dbHelper.url, dbHelper.options),
        TransfersModule,
        CourtsInfrastructureModule,
      ],
    }).compile();

    await dbHelper.initConnection();
    await dbHelper.seedDb('dockets', dockets);
    await dbHelper.seedDb('masterfacilities', masterfacilities);
    liveData.code = masterfacilities[0].code;
    await dbHelper.seedDb('facilities', [liveData]);
    await dbHelper.seedDb('manifests', manifests);

    const handler = module.get<GetStatsHandler>(GetStatsHandler);

    queryBus = module.get<QueryBus>(QueryBus);
    queryBus.bind(handler, GetStatsQuery.name);
  });

  afterAll(async () => {
    await dbHelper.clearDb();
    await dbHelper.closeConnection();
  });

  it('should get Manifest Stats', async () => {
    const query = new GetStatsQuery();
    const result = await queryBus.execute<GetStatsQuery, any>(query);
    expect(result.length).toBeGreaterThan(0);
    result.forEach(c => Logger.debug(`${c}`));
  });
});
