import express, { json } from "express";
import data from "./courses.json" with { type: "json" };
import orders from "./orders.json" with { type: "json" };
import { writeFile, readFile } from 'fs/promises';

import cors from "cors";
import Razorpay from "razorpay";
const port = 4000;
const rzpInstance = new Razorpay({
  key_id: 'rzp_test_Rqbeszfqh8aoAV',
  key_secret: 'rxyCS2mJVX3H10umwxg5u2C6'
})

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json())

app.get("/", (req, res) => {
  res.json(data);
});

app.post('/create-order', async (req, res) => {
  console.log("Create order", req.body)
  const { course, user } = req.body;
  const exitsOrder = orders.find((order) => order.course.id == course.id);

  if (exitsOrder)
    return res.status(404).json({
      message: 'Course Already purchased',
      status: "Failed"
    });


  const order = await rzpInstance.orders.create({
    amount: course.price * 100,
    currency: 'INR',
    notes: {
      id: course.id,
      name: course.name
    }
  })
  orders.push({ orderId: order.id, user, course, status: 'Created' });

  await writeFile("./orders.json", JSON.stringify(orders, null, 2));
  res.json({ orderId: order.id })
});


app.post('/complete-order', async (req, res) => {
  console.log('in /complete-order api')

  const { orderId } = req.body

  const order = await rzpInstance.orders.fetch(orderId)
  const data = await readFile("./orders.json", "utf-8")

  if (!order) {
    return res.status(404).json({ error: 'invalid order ID', status: "Failed" })
  }

  const orders = JSON.parse(data)


  const orderIndex = orders.findIndex(o => o.orderId === orderId)

  if (orderIndex === -1) {
    return res.status(404).json({ message: "Order not found" })
  }

  if (orders[orderIndex].status === 'Created') {
    orders[orderIndex].status = "Paid"

    await writeFile("./orders.json", JSON.stringify(orders, null, 2))

    return res.json({ message: "Order Completed", status: "success" })
  }

  return res.status(400).json({ error: "Order already completed" })
})

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
