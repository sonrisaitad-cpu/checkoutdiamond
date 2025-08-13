require('dotenv').config();


const express = require("express");
const path = require("path");
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


// Serve all files in /public automatically
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.post("/create-payment-intent", async (req, res) => {
  const { buyerName, buyerEmail, tickets, couponCode } = req.body;
  const amountPerTicket = 109900; // $1099.00
  let totalAmount = amountPerTicket * tickets.length;

  // Define valid coupon codes and discount amounts
  const couponList = {
    COD20: 0.20,
    COD30: 0.30
};

let discountPercent = 0;

if (couponCode && couponList[couponCode]) {
  discountPercent = couponList[couponCode];
  totalAmount = Math.floor(totalAmount * (1 - discountPercent));
}


  try {
    const customer = await stripe.customers.create({
      name: buyerName,
      email: buyerEmail,
      metadata: {
        ticket_count: tickets.length.toString(),
	coupon_used: couponCode || "none",
        ...tickets.reduce((acc, ticket, index) => {
          acc[`ticket_${index + 1}_name`] = ticket.name;
          acc[`ticket_${index + 1}_email`] = ticket.email;
          return acc;
        }, {})
      }
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "usd",
      customer: customer.id,
      metadata: {
        event: "My Event",
        buyer_email: buyerEmail,
        buyer_name: buyerName
      }
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.send({ error: err.message });
  }
});

app.get("/success", (req, res) => {
  res.send("<h2>✅ Payment successful! Thank you!</h2>");
});

app.listen(4242, () => {
  console.log("🚀 Server running at http://localhost:4242");
});
