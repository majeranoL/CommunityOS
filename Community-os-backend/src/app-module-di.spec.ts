import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

// CI has no .env file; provide safe placeholders so providers that read
// env vars during construction (JwtStrategy, JwtModule, PrismaClient)
// can be instantiated without connecting anywhere.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://unit:test@localhost:5432/unit';

describe('AppModule dependency resolution', () => {
  it('compiles the full module graph without DI errors', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();
  });
});
