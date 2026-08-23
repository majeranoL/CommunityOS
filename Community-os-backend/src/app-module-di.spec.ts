import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('AppModule dependency resolution', () => {
  it('compiles the full module graph without DI errors', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();
  });
});
