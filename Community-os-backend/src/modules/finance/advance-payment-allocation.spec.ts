import { allocateAdvanceAmount } from './advance-payment-allocation';

describe('allocateAdvanceAmount', () => {
  it('allocates oldest collectible assessments first and returns credit remainder', () => {
    const result = allocateAdvanceAmount(
      [
        {
          id: 'newer',
          dueDate: new Date('2026-02-01'),
          createdAt: new Date('2026-01-01'),
          collectible: 500,
        },
        {
          id: 'oldest',
          dueDate: new Date('2026-01-01'),
          createdAt: new Date('2026-01-01'),
          collectible: 700,
        },
      ],
      1500,
    );

    expect(result.allocations).toEqual([
      { assessmentId: 'oldest', amount: 700 },
      { assessmentId: 'newer', amount: 500 },
    ]);
    expect(result.remainder).toBe(300);
  });
});
