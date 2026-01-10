import { createRecurringPYOSession } from "./createRecurringPYOSession";
import { createYearlyPYOSession } from "./createYearlyPYOSession";
import { createSinglePYOSession } from "./createSinglePYOSession";

export function createPYOSession(args: {
  frequency: "monthly" | "yearly" | "single";
  amount: number;
  stripeCustomerId?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  if (args.frequency === "monthly") {
    return createRecurringPYOSession(args);
  } else if (args.frequency === "yearly") {
    return createYearlyPYOSession(args);
  } else {
    return createSinglePYOSession(args);
  }
}
