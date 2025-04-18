import { Test, TestingModule } from '@nestjs/testing';
import { CutterService } from './cutter.service';

describe('CutterService', () => {
  let service: CutterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CutterService],
    }).compile();

    service = module.get<CutterService>(CutterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
