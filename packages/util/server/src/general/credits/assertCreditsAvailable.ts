import { CREDIT_COSTS, CreditOperation } from "./creditCosts";
import { CreditLimitExceededError } from "./errors";
import { getDailyCreditUsage } from "./getDailyCreditUsage";

export const assertCreditsAvailable = async (
  userId: string,
  operation: CreditOperation,
): Promise<void> => {
  const { used, limit } = await getDailyCreditUsage(userId);
  const cost = CREDIT_COSTS[operation];
  if (used + cost > limit) {
    throw new CreditLimitExceededError();
  }
};
