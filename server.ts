import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cron from "node-cron";
import { fileURLToPath } from "url";
import { 
  Customer, Service, Order, OrderItem, LedgerEntry, AuditLog, StoreSettings, Tax 
} from "./src/types";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_FILE = path.join(__dirname, "db.json");

// Initial DB state
const initialData = {
  users: [
    { id: "u1", username: "admin", password: "admin", role: "ADMIN" }
  ],
  customers: [],
  services: [
    { id: "s1", name: "Wheat Grinding", pricingType: "KG", rate: 5, createdAt: new Date().toISOString() },
    { id: "s2", name: "Corn Grinding", pricingType: "KG", rate: 7, createdAt: new Date().toISOString() },
    { id: "s3", name: "Packing", pricingType: "FIXED", rate: 2, createdAt: new Date().toISOString() },
  ],
  taxes: [
    { id: "t1", name: "GST", rate: 5, isEnabled: true },
    { id: "t2", name: "Service Tax", rate: 2, isEnabled: false }
  ],
  orders: [],
  orderItems: [],
  ledger: [],
  logs: [],
  settings: {
    storeName: "AgroGrind POS",
    defaultInterestRate: 12,
    currency: "₹"
  }
};

// Sync DB helper
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDB(initialData);
      return initialData;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    if (!data || !data.trim()) {
      writeDB(initialData);
      return initialData;
    }
    const db = JSON.parse(data);
    // Ensure all top-level keys exist by merging with initialData
    if (!db.users) {
      db.users = initialData.users;
      writeDB(db);
    }
    return { ...initialData, ...db };
  } catch (e) {
    console.error("Database Read Error:", e);
    return initialData;
  }
}

function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function logAction(action: string, module: string, data: any) {
  const db = readDB();
  db.logs.push({
    id: uuidv4(),
    action,
    module,
    data,
    timestamp: new Date().toISOString()
  });
  writeDB(db);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  
  // Auth
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    const user = db.users.find((u: any) => u.username === username && u.password === password);
    
    if (user) {
      res.json({ id: user.id, username: user.username, role: user.role });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.get("/api/users", (req, res) => {
    const db = readDB();
    res.json(db.users.map((u: any) => ({ id: u.id, username: u.username, role: u.role })));
  });

  app.post("/api/users", (req, res) => {
    const db = readDB();
    const newUser = { ...req.body, id: uuidv4() };
    db.users.push(newUser);
    writeDB(db);
    res.json(newUser);
  });

  app.delete("/api/users/:id", (req, res) => {
    const db = readDB();
    db.users = db.users.filter((u: any) => u.id !== req.params.id);
    writeDB(db);
    res.json({ success: true });
  });

  // Dashboard Stats
  // Sync to Sheet Helper
  async function syncToSheet(sheetName: string, row: any) {
    const db = readDB();
    const config = db.settings;
    if (config.isSheetIntegrationEnabled && config.googleSheetUrl) {
      try {
        await fetch(config.googleSheetUrl, {
          method: 'POST',
          body: JSON.stringify({ sheetName, row }),
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Sheet sync failed:', error);
      }
    }
  }

  app.get("/api/stats", (req, res) => {
    const db = readDB();
    const today = new Date().toISOString().split('T')[0];
    const completedOrders = db.orders.filter((o: Order) => o.status !== 'PENDING_DELIVERY');
    const todayCompleted = completedOrders.filter((o: Order) => o.date.startsWith(today));
    
    const dailyRevenue = todayCompleted.reduce((sum: number, o: Order) => sum + (o.paymentType !== 'CREDIT' ? o.totalAmount : 0), 0);
    const totalCreditOutstanding = db.ledger.reduce((sum: number, l: LedgerEntry) => sum + (l.debit - l.credit + l.interest), 0);
    
    res.json({
      dailyRevenue,
      totalCreditOutstanding,
      totalOrders: completedOrders.length,
      totalCustomers: db.customers.length
    });
  });

  // Services
  app.get("/api/services", (req, res) => res.json(readDB().services));
  app.post("/api/services", (req, res) => {
    const db = readDB();
    const serviceName = req.body.name?.trim().toLowerCase();
    
    const exists = db.services.some((s: Service) => s.name.trim().toLowerCase() === serviceName);
    if (exists) {
      return res.status(400).json({ error: "Service name already exists" });
    }

    const service = { ...req.body, id: uuidv4(), createdAt: new Date().toISOString() };
    db.services.push(service);
    writeDB(db);
    logAction("Created Service", "Inventory", service);
    res.json(service);
  });

  app.put("/api/services/:id", (req, res) => {
    const db = readDB();
    const index = db.services.findIndex((s: Service) => s.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Service not found" });

    const newName = req.body.name?.trim().toLowerCase();
    const nameCollision = db.services.some((s: Service) => 
      s.id !== req.params.id && s.name.trim().toLowerCase() === newName
    );

    if (nameCollision) {
      return res.status(400).json({ error: "Another service already has this name" });
    }

    const oldService = db.services[index];
    db.services[index] = { ...oldService, ...req.body };
    writeDB(db);
    logAction("Updated Service", "Inventory", { before: oldService, after: db.services[index] });
    res.json(db.services[index]);
  });

  app.delete("/api/services/:id", (req, res) => {
    const db = readDB();
    const service = db.services.find((s: Service) => s.id === req.params.id);
    if (!service) return res.status(404).json({ error: "Service not found" });

    db.services = db.services.filter((s: Service) => s.id !== req.params.id);
    writeDB(db);
    logAction("Deleted Service", "Inventory", service);
    res.json({ success: true });
  });

  // Customers
  app.get("/api/customers", (req, res) => {
    const db = readDB();
    const customersWithBalances = db.customers.map((c: Customer) => {
      // Find the last credit ledger entry for this customer to get the balance
      const entries = db.ledger.filter((l: any) => l.customerId === c.id && l.type !== 'CASH');
      const balance = entries.length > 0 ? entries[entries.length - 1].balance : 0;
      return { ...c, balance, status: c.status || 'ACTIVE' };
    });
    res.json(customersWithBalances);
  });

  app.post("/api/customers", (req, res) => {
    const db = readDB();
    const settings = db.settings;
    const customer = { 
      ...req.body, 
      id: uuidv4(), 
      interestRate: req.body.interestRate || settings.defaultInterestRate,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    };
    db.customers.push(customer);
    writeDB(db);
    logAction("Created Customer", "Customers", customer);

    // Sync to Cloud
    syncToSheet('Customers', {
      Date: new Date().toLocaleDateString(),
      Name: customer.name,
      Phone: customer.phone,
      Address: customer.address
    });

    res.json(customer);
  });

  app.put("/api/customers/:id", (req, res) => {
    const db = readDB();
    const index = db.customers.findIndex((c: Customer) => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Customer not found" });
    
    db.customers[index] = { ...db.customers[index], ...req.body };
    writeDB(db);
    logAction("Updated Customer", "Customers", { id: req.params.id, updates: req.body });
    res.json(db.customers[index]);
  });

  // Orders
  app.get("/api/orders", (req, res) => {
    const db = readDB();
    res.json(db.orders.map((o: Order) => ({
      ...o,
      items: db.orderItems.filter((i: OrderItem) => i.orderId === o.id)
    })));
  });

  app.get("/api/orders/:id", (req, res) => {
    const db = readDB();
    const order = db.orders.find((o: Order) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    
    // Find customer for additional details
    const customer = db.customers.find((c: Customer) => c.id === order.customerId);
    
    res.json({
      ...order,
      customerDetails: customer ? { phone: customer.phone, address: customer.address } : null,
      items: db.orderItems.filter((i: OrderItem) => i.orderId === order.id)
    });
  });

  app.post("/api/orders", (req, res) => {
    const db = readDB();
    const { order, items } = req.body;
    const orderId = uuidv4();
    const totalQuantity = items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
    const unit = items.length > 0 ? items[0].pricingType : 'FIXED';
    
    const newOrder = { 
      ...order, 
      id: orderId, 
      date: new Date().toISOString(),
      totalQuantity,
      subtotal: order.subtotal || order.totalAmount,
      taxAmount: order.taxAmount || 0,
      unit,
      paymentType: 'UNSET',
      status: 'PENDING_DELIVERY'
    };
    
    const newItems = items.map((i: any) => ({ ...i, id: uuidv4(), orderId }));
    
    db.orders.push(newOrder);
    db.orderItems.push(...newItems);
    
    writeDB(db);
    logAction("Generated Order (Pending Delivery)", "Orders", { orderId, total: newOrder.totalAmount });

    // Sync Order to Cloud
    syncToSheet('Orders', {
      Date: new Date().toLocaleString(),
      OrderID: orderId,
      Total: newOrder.totalAmount,
      Status: 'PENDING'
    });

    res.json(newOrder);
  });

  app.post("/api/orders/:id/deliver", (req, res) => {
    const db = readDB();
    const { paymentType, deliveredItemIds, remarks, partialCashAmount, status } = req.body;
    const orderIndex = db.orders.findIndex((o: Order) => o.id === req.params.id);
    
    if (orderIndex === -1) return res.status(404).json({ error: "Order not found" });
    
    const order = db.orders[orderIndex];
    order.remarks = remarks || order.remarks;

    if (status === 'REJECTED') {
      order.status = 'REJECTED';
      order.deliveryDate = new Date().toISOString();
      
      // Record rejection in cash ledger for audit trail
      const rejectionEntry = {
        id: uuidv4(),
        customerId: order.customerId,
        orderId: order.id,
        debit: 0,
        credit: 0,
        interest: 0,
        balance: 0,
        date: new Date().toISOString(),
        notes: `Order Rejected: ${order.id} - ${remarks || 'No reason provided'}`,
        type: 'CASH'
      };
      db.ledger.push(rejectionEntry);
      
      writeDB(db);
      logAction("Order Rejected", "Orders", { orderId: order.id, remarks });
      return res.json(order);
    }
    
    // Update individual items
    db.orderItems = db.orderItems.map((item: OrderItem) => {
      if (item.orderId === order.id && deliveredItemIds.includes(item.id)) {
        return { ...item, delivered: true };
      }
      return item;
    });

    const orderItems = db.orderItems.filter((i: OrderItem) => i.orderId === order.id);
    const allDelivered = orderItems.every((i: OrderItem) => i.delivered);

    if (allDelivered) {
      order.paymentType = paymentType;
      order.status = 'DELIVERED';
      order.deliveryDate = new Date().toISOString();
      
      const cashPaid = Number(partialCashAmount) || 0;
      
      if (paymentType === 'CASH') {
        const cashEntry = {
          id: uuidv4(),
          customerId: order.customerId,
          orderId: order.id,
          debit: order.totalAmount,
          credit: order.totalAmount,
          interest: 0,
          balance: 0,
          date: new Date().toISOString(),
          notes: `Full Cash Settlement - Order ${order.id}`,
          type: 'CASH'
        };
        db.ledger.push(cashEntry);
      } else if (paymentType === 'CREDIT') {
        const creditBalance = Number((order.totalAmount - cashPaid).toFixed(2));

        // Record cash portion if any
        if (cashPaid > 0) {
          const cashPortionEntry = {
            id: uuidv4(),
            customerId: order.customerId,
            orderId: order.id,
            debit: cashPaid,
            credit: cashPaid,
            interest: 0,
            balance: 0,
            date: new Date().toISOString(),
            notes: `Partial Cash Received - Order ${order.id}`,
            type: 'CASH'
          };
          db.ledger.push(cashPortionEntry);
        }

        // Record credit balance
        if (creditBalance > 0) {
          const lastEntry = db.ledger.filter((l: any) => l.customerId === order.customerId && l.type !== 'CASH').pop();
          const currentBalance = lastEntry ? lastEntry.balance : 0;
          
          const ledgerEntry = {
            id: uuidv4(),
            customerId: order.customerId,
            orderId: order.id,
            debit: creditBalance,
            credit: 0,
            interest: 0,
            balance: Number((currentBalance + creditBalance).toFixed(2)),
            date: new Date().toISOString(),
            notes: `Purchase Balance (On Credit) - Order ${order.id}`,
            type: 'CREDIT'
          };
          db.ledger.push(ledgerEntry);
        }
      }
    } else {
       order.status = 'PARTIAL';
    }
    
    writeDB(db);
    logAction("Order Delivery Update", "Orders", { orderId: order.id, allDelivered, paymentType, remarks });
    res.json({ ...order, items: orderItems });
  });

  // Ledger
  app.get("/api/ledger/:customerId", (req, res) => {
    const db = readDB();
    const ledger = db.ledger.filter((l: LedgerEntry) => l.customerId === req.params.customerId);
    res.json(ledger);
  });

  app.get("/api/ledger/:customerId/cash", (req, res) => {
    const db = readDB();
    const cashLedger = db.ledger.filter((l: LedgerEntry) => l.customerId === req.params.customerId && l.type === 'CASH');
    res.json(cashLedger);
  });

  app.post("/api/ledger/payment", (req, res) => {
    const db = readDB();
    const { customerId, amount, notes } = req.body;
    const lastEntry = db.ledger.filter((l: any) => l.customerId === customerId).pop();
    const currentBalance = lastEntry ? lastEntry.balance : 0;

    const ledgerEntry = {
      id: uuidv4(),
      customerId,
      debit: 0,
      credit: amount,
      interest: 0,
      balance: currentBalance - amount,
      date: new Date().toISOString(),
      notes: notes || "Payment received"
    };
    db.ledger.push(ledgerEntry);
    writeDB(db);
    logAction("Payment Received", "Ledger", { customerId, amount });
    res.json(ledgerEntry);
  });

  // Interest Calculation Logic
  function calculateDailyInterest() {
    console.log("[System] Triggering Automated Interest Calculation...");
    const db = readDB();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const dateStr = today.toISOString().split('T')[0];
    
    let interestAdded = 0;

    db.customers.forEach((customer: Customer) => {
      const customerLedger = db.ledger.filter((l: any) => l.customerId === customer.id);
      if (customerLedger.length === 0) return;

      const lastEntry = customerLedger[customerLedger.length - 1];
      if (lastEntry.balance <= 0) return;

      // Prevent duplicate runs for same day
      const lastDateStr = new Date(lastEntry.date).toISOString().split('T')[0];
      if (lastDateStr === dateStr && lastEntry.notes.includes("Interest")) return;

      const annualRate = (customer.interestRate || 12) / 100;
      const dailyRate = annualRate / 365;
      const interest = lastEntry.balance * dailyRate;
      
      if (interest > 0.01) {
        const interestEntry = {
          id: uuidv4(),
          customerId: customer.id,
          debit: 0,
          credit: 0,
          interest: Number(interest.toFixed(2)),
          balance: Number((lastEntry.balance + interest).toFixed(2)),
          date: today.toISOString(),
          notes: `Interest (Daily Accrual) - ${dateStr}`
        };
        db.ledger.push(interestEntry);
        interestAdded++;
      }
    });

    if (interestAdded > 0) {
      writeDB(db);
      logAction("Auto Interest Calculation", "System", { count: interestAdded, date: dateStr });
      console.log(`[System] Interest posted for ${interestAdded} accounts.`);
    }
    return interestAdded;
  }

  // Schedule task: 11:59 PM daily
  cron.schedule("59 23 * * *", calculateDailyInterest);

  // Interest Calculation API (Manual Trigger)
  app.post("/api/ledger/calculate-interest", (req, res) => {
    const count = calculateDailyInterest();
    res.json({ success: true, count });
  });

  // Settings
  app.get("/api/settings", (req, res) => res.json(readDB().settings));
  app.get("/api/logs", (req, res) => res.json(readDB().logs));
  app.post("/api/settings", (req, res) => {
    const db = readDB();
    const oldSettings = db.settings;
    db.settings = { ...db.settings, ...req.body };
    writeDB(db);
    logAction("Updated Store Settings", "Administrative", { before: oldSettings, after: db.settings });
    res.json(db.settings);
  });

  // Taxes
  app.get("/api/taxes", (req, res) => res.json(readDB().taxes));
  app.post("/api/taxes", (req, res) => {
    const db = readDB();
    const tax = { ...req.body, id: uuidv4() };
    db.taxes.push(tax);
    writeDB(db);
    logAction("Created Tax Rule", "Administrative", tax);
    res.json(tax);
  });
  app.put("/api/taxes/:id", (req, res) => {
    const db = readDB();
    const index = db.taxes.findIndex((t: Tax) => t.id === req.params.id);
    if (index !== -1) {
      const oldTax = db.taxes[index];
      db.taxes[index] = { ...db.taxes[index], ...req.body };
      writeDB(db);
      logAction("Updated Tax Rule", "Administrative", { before: oldTax, after: db.taxes[index] });
      res.json(db.taxes[index]);
    } else {
      res.status(404).json({ error: "Tax not found" });
    }
  });
  app.delete("/api/taxes/:id", (req, res) => {
    const db = readDB();
    const tax = db.taxes.find((t: Tax) => t.id === req.params.id);
    if (!tax) return res.status(404).json({ error: "Tax not found" });
    
    db.taxes = db.taxes.filter((t: Tax) => t.id !== req.params.id);
    writeDB(db);
    logAction("Deleted Tax Rule", "Administrative", tax);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
