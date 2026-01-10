import { stripe } from "./stripe";

export const MONTHLY_PYO_PRODUCT_ID = "pyo-monthly";

export async function createRecurringPYOSession(args: {
  amount: number;
  stripeCustomerId?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  let product;

  try {
    product = await stripe.products.retrieve(MONTHLY_PYO_PRODUCT_ID);
  } catch (_e) {
    product = await stripe.products.create({
      id: MONTHLY_PYO_PRODUCT_ID,
      name: "RecipeSage Monthly Membership - Choose Your Own Price",
      type: "service",
    });
  }

  const lookupKey = `pyo-monthly-${args.amount}`;

  let price = (
    await stripe.prices.list({
      lookup_keys: [lookupKey],
    })
  ).data.at(0);

  if (!price) {
    price = await stripe.prices.create({
      unit_amount: args.amount,
      recurring: {
        interval: "month",
      },
      product: product.id,
      currency: "usd",
      lookup_key: lookupKey,
    });
  }

  return await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: args.stripeCustomerId || undefined,
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
  });
}
