import { Test, TestingModule } from '@nestjs/testing';
import { CutterController } from './cutter.controller';

describe('CutterController', () => {
  let controller: CutterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CutterController],
    }).compile();

    controller = module.get<CutterController>(CutterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
