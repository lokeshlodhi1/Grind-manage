import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cron from "node-cron";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json";
import { 
  Customer, Service, Order, OrderItem, LedgerEntry, AuditLog, StoreSettings, Tax 
} from "./src/types";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Initialize Firebase Admin
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    console.log("[Firebase] Initializing Admin SDK with Service Account for project:", projectId);
    console.log("[Firebase] Client Email present:", !!clientEmail);
    console.log("[Firebase] Private Key present:", !!privateKey);
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      })
    });
  } else {
    console.log("[Firebase] Initializing Admin SDK with Project ID only:", projectId);
    console.log("[Firebase] (Note: This may cause PERMISSION_DENIED if no ambient credentials exist)");
    admin.initializeApp({
      projectId: projectId
    });
  }
}

const dbId = firebaseConfig.firestoreDatabaseId;
console.log("[Firebase] Using database ID:", dbId || "(default)");
if (dbId) {
  console.log("[Firebase] Database ID is custom, ensure service account has access to this specific instance.");
}
// Use the explicit app instance to avoid ambiguity
const db = getFirestore(admin.apps[0]!, dbId);

// Sync DB helper (Legacy replaced by Firestore)
async function getSettings(): Promise<StoreSettings> {
  try {
    const settingsRef = db.collection("settings").doc("global");
    const snap = await settingsRef.get();
    if (snap.exists) return snap.data() as StoreSettings;
    
    const initialSettings = {
      storeName: "AgroGrind POS",
      defaultInterestRate: 12,
      currency: "₹"
    };
    await settingsRef.set(initialSettings);
    return initialSettings as StoreSettings;
  } catch (e) {
    console.error("[Settings] Error fetching settings:", e);
    return { 
      storeName: "AgroGrind POS", 
      defaultInterestRate: 12, 
      currency: "₹" 
    } as StoreSettings;
  }
}

async function logAction(action: string, module: string, data: any) {
  try {
    await db.collection("logs").add({
      action,
      module,
      data: JSON.parse(JSON.stringify(data)), // Ensure serializable
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error("Log failed:", e);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  
  // Health Check
  app.get("/api/health", async (req, res) => {
    try {
      const snap = await db.collection("settings").doc("global").get();
      res.json({ 
        status: "ok", 
        database: firebaseConfig.firestoreDatabaseId,
        settingsFound: snap.exists
      });
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  // Auth
  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const { username, password } = req.body;
      console.log(`[Login] Attempt for username: ${username}`);

      const snap = await db.collection("users")
        .where("username", "==", username)
        .where("password", "==", password)
        .limit(1)
        .get();
      
      if (!snap.empty) {
        const userDoc = snap.docs[0];
        const user = userDoc.data();
        console.log(`[Login] Success for user: ${username}`);
        res.json({ id: userDoc.id, username: user.username, role: user.role });
      } else {
        // Bootstrap default admin if it doesn't exist and credentials match
        if (username === "admin" && password === "admin") {
          const adminCheck = await db.collection("users").where("username", "==", "admin").limit(1).get();
          if (adminCheck.empty) {
            console.log(`[Login] Bootstrapping default admin user`);
            const newUser = { username: "admin", password: "admin", role: "ADMIN", createdAt: new Date().toISOString() };
            const docRef = await db.collection("users").add(newUser);
            return res.json({ id: docRef.id, username: newUser.username, role: newUser.role });
          }
        }
        console.warn(`[Login] Failed for user: ${username}`);
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (e) { 
      console.error("[Login] Error:", e);
      next(e); 
    }
  });

  app.get("/api/users", async (req, res, next) => {
    try {
      const snap = await db.collection("users").get();
      res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) { next(e); }
  });

  app.post("/api/users", async (req, res, next) => {
    try {
      const newUser = { ...req.body, createdAt: new Date().toISOString() };
      const docRef = await db.collection("users").add(newUser);
      res.json({ id: docRef.id, ...newUser });
    } catch (e) { next(e); }
  });

  app.delete("/api/users/:id", async (req, res, next) => {
    try {
      await db.collection("users").doc(req.params.id).delete();
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  // Sync to Sheet Helper
  async function syncToSheet(sheetName: string, row: any) {
    const config = await getSettings();
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

  app.get("/api/stats", async (req, res, next) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const ordersSnap = await db.collection("orders").where("status", "!=", "PENDING_DELIVERY").get();
      const orders = ordersSnap.docs.map(d => d.data() as Order);
      const todayCompleted = orders.filter(o => o.date.startsWith(today));
      
      const ledgerSnap = await db.collection("ledger").get();
      const customersSnap = await db.collection("customers").get();
      
      const dailyRevenue = todayCompleted.reduce((sum, o) => sum + (o.paymentType !== 'CREDIT' ? o.totalAmount : 0), 0);
      const totalCreditOutstanding = ledgerSnap.docs.reduce((sum, d) => {
        const l = d.data() as LedgerEntry;
        return sum + (Number(l.debit || 0) - Number(l.credit || 0) + Number(l.interest || 0));
      }, 0);
      
      res.json({
        dailyRevenue,
        totalCreditOutstanding,
        totalOrders: orders.length,
        totalCustomers: customersSnap.size
      });
    } catch (e) { next(e); }
  });

  // Services
  app.get("/api/services", async (req, res, next) => {
    try {
      const snap = await db.collection("services").get();
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { next(e); }
  });

  app.post("/api/services", async (req, res, next) => {
    try {
      const serviceName = req.body.name?.trim().toLowerCase();
      const exists = await db.collection("services").where("name", "==", serviceName).get();
      
      if (!exists.empty) {
        return res.status(400).json({ error: "Service name already exists" });
      }

      const service = { ...req.body, createdAt: new Date().toISOString() };
      const docRef = await db.collection("services").add(service);
      const finalService = { id: docRef.id, ...service };
      logAction("Created Service", "Inventory", finalService);
      res.json(finalService);
    } catch (e) { next(e); }
  });

  app.put("/api/services/:id", async (req, res, next) => {
    try {
      const newName = req.body.name?.trim().toLowerCase();
      const nameCollisionSnap = await db.collection("services").where("name", "==", newName).get();
      const collidingId = nameCollisionSnap.docs.find(d => d.id !== req.params.id);

      if (collidingId) {
        return res.status(400).json({ error: "Another service already has this name" });
      }

      const serviceRef = db.collection("services").doc(req.params.id);
      const oldSnap = await serviceRef.get();
      if (!oldSnap.exists) return res.status(404).json({ error: "Service not found" });

      await serviceRef.update(req.body);
      const updated = { id: req.params.id, ...oldSnap.data(), ...req.body };
      logAction("Updated Service", "Inventory", { before: oldSnap.data(), after: updated });
      res.json(updated);
    } catch (e) { next(e); }
  });

  app.delete("/api/services/:id", async (req, res, next) => {
    try {
      const serviceRef = db.collection("services").doc(req.params.id);
      const snap = await serviceRef.get();
      if (!snap.exists) return res.status(404).json({ error: "Service not found" });

      await serviceRef.delete();
      logAction("Deleted Service", "Inventory", snap.data());
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  // Customers
  app.get("/api/customers", async (req, res, next) => {
    try {
      const customersSnap = await db.collection("customers").get();
      const ledgerSnap = await db.collection("ledger").where("type", "!=", "CASH").get();
      
      const customersWithBalances = customersSnap.docs.map(doc => {
        const c = doc.data() as Customer;
        const entries = ledgerSnap.docs
          .filter(l => l.data().customerId === doc.id)
          .map(l => l.data())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const balance = entries.length > 0 ? entries[entries.length - 1].balance : 0;
        return { ...c, id: doc.id, balance, status: c.status || 'ACTIVE' };
      });
      res.json(customersWithBalances);
    } catch (e) { next(e); }
  });

  app.post("/api/customers", async (req, res, next) => {
    try {
      const settings = await getSettings();
      const customer = { 
        ...req.body, 
        interestRate: req.body.interestRate || settings.defaultInterestRate,
        createdAt: new Date().toISOString(),
        status: 'ACTIVE'
      };
      const docRef = await db.collection("customers").add(customer);
      const finalCustomer = { id: docRef.id, ...customer };
      logAction("Created Customer", "Customers", finalCustomer);

      syncToSheet('Customers', {
        Date: new Date().toLocaleDateString(),
        Name: customer.name,
        Phone: customer.phone,
        Address: customer.address
      });

      res.json(finalCustomer);
    } catch (e) { next(e); }
  });

  app.put("/api/customers/:id", async (req, res, next) => {
    try {
      const customerRef = db.collection("customers").doc(req.params.id);
      await customerRef.update(req.body);
      logAction("Updated Customer", "Customers", { id: req.params.id, updates: req.body });
      const snap = await customerRef.get();
      res.json({ id: snap.id, ...snap.data() });
    } catch (e) { next(e); }
  });

  app.delete("/api/customers/:id", async (req, res, next) => {
    try {
      const customerRef = db.collection("customers").doc(req.params.id);
      const customerSnap = await customerRef.get();
      if (!customerSnap.exists) return res.status(404).json({ error: "Customer not found" });

      const ledgerSnap = await db.collection("ledger").where("customerId", "==", req.params.id).where("type", "!=", "CASH").get();
      const entries = ledgerSnap.docs.map(d => d.data()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const balance = entries.length > 0 ? entries[entries.length - 1].balance : 0;
      
      if (balance > 1) {
        return res.status(400).json({ error: "Cannot delete customer with outstanding balance" });
      }

      await customerRef.delete();
      logAction("Deleted Customer", "Customers", customerSnap.data());
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  // Orders
  app.get("/api/orders", async (req, res, next) => {
    try {
      const ordersSnap = await db.collection("orders").get();
      const itemsSnap = await db.collection("orderItems").get();
      
      res.json(ordersSnap.docs.map(doc => {
        const o = doc.data() as Order;
        return {
          ...o,
          id: doc.id,
          items: itemsSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as OrderItem))
            .filter(i => i.orderId === doc.id)
        };
      }));
    } catch (e) { next(e); }
  });

  app.get("/api/orders/:id", async (req, res, next) => {
    try {
      const orderRef = db.collection("orders").doc(req.params.id);
      const snap = await orderRef.get();
      if (!snap.exists) return res.status(404).json({ error: "Order not found" });
      
      const order = { id: snap.id, ...snap.data() } as Order;
      const customerSnap = await db.collection("customers").doc(order.customerId).get();
      const itemsSnap = await db.collection("orderItems").where("orderId", "==", snap.id).get();
      
      res.json({
        ...order,
        customerDetails: customerSnap.exists ? { phone: customerSnap.data()?.phone, address: customerSnap.data()?.address } : null,
        items: itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      });
    } catch (e) { next(e); }
  });

  app.delete("/api/orders/:id", async (req, res, next) => {
    try {
      const orderRef = db.collection("orders").doc(req.params.id);
      const snap = await orderRef.get();
      if (!snap.exists) return res.status(404).json({ error: "Order not found" });
      const order = snap.data() as Order;

      if (order.status === 'DELIVERED' || order.status === 'PARTIAL') {
        return res.status(400).json({ error: "Cannot delete fulfilled orders. Void them via ledger if needed." });
      }

      await orderRef.delete();
      const itemsSnap = await db.collection("orderItems").where("orderId", "==", req.params.id).get();
      const batch = db.batch();
      itemsSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      
      logAction("Deleted Order", "Orders", order);
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  app.post("/api/orders", async (req, res, next) => {
    try {
      const { order, items } = req.body;
      const totalQuantity = items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
      const unit = items.length > 0 ? items[0].pricingType : 'FIXED';
      
      const newOrderData = { 
        ...order, 
        date: new Date().toISOString(),
        totalQuantity,
        subtotal: order.subtotal || order.totalAmount,
        taxAmount: order.taxAmount || 0,
        unit,
        paymentType: 'UNSET',
        status: 'PENDING_DELIVERY'
      };
      
      const orderRef = await db.collection("orders").add(newOrderData);
      const orderId = orderRef.id;

      const batch = db.batch();
      items.forEach((item: any) => {
        const itemRef = db.collection("orderItems").doc();
        batch.set(itemRef, { ...item, orderId });
      });
      await batch.commit();
      
      logAction("Generated Order (Pending Delivery)", "Orders", { orderId, total: newOrderData.totalAmount });

      syncToSheet('Orders', {
        Date: new Date().toLocaleString(),
        OrderID: orderId,
        Total: newOrderData.totalAmount,
        Status: 'PENDING'
      });

      res.json({ id: orderId, ...newOrderData });
    } catch (e) { next(e); }
  });

  app.post("/api/orders/:id/deliver", async (req, res, next) => {
    try {
      const { paymentType, deliveredItemIds, remarks, partialCashAmount, status } = req.body;
      const orderRef = db.collection("orders").doc(req.params.id);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) return res.status(404).json({ error: "Order not found" });
      
      const order = orderSnap.data() as Order;
      const updates: any = { remarks: remarks || order.remarks || "" };

      if (status === 'REJECTED') {
        updates.status = 'REJECTED';
        updates.deliveryDate = new Date().toISOString();
        await orderRef.update(updates);

        await db.collection("ledger").add({
          customerId: order.customerId,
          orderId: req.params.id,
          debit: 0,
          credit: 0,
          interest: 0,
          balance: 0,
          date: new Date().toISOString(),
          notes: `Order Rejected: ${req.params.id} - ${remarks || 'No reason provided'}`,
          type: 'CASH'
        });
        
        logAction("Order Rejected", "Orders", { orderId: req.params.id, remarks });
        return res.json({ id: req.params.id, ...order, ...updates });
      }
      
      const itemsSnap = await db.collection("orderItems").where("orderId", "==", req.params.id).get();
      const batch = db.batch();
      itemsSnap.docs.forEach(doc => {
        if (deliveredItemIds.includes(doc.id)) {
          batch.update(doc.ref, { delivered: true });
        }
      });
      await batch.commit();

      const updatedItemsSnap = await db.collection("orderItems").where("orderId", "==", req.params.id).get();
      const allDelivered = updatedItemsSnap.docs.every(d => d.data().delivered);

      if (allDelivered) {
        updates.paymentType = paymentType;
        updates.status = 'DELIVERED';
        updates.deliveryDate = new Date().toISOString();
        
        const cashPaid = Number(partialCashAmount) || 0;
        
        if (paymentType === 'CASH') {
          await db.collection("ledger").add({
            customerId: order.customerId,
            orderId: req.params.id,
            debit: order.totalAmount,
            credit: order.totalAmount,
            interest: 0,
            balance: 0,
            date: new Date().toISOString(),
            notes: `Full Cash Settlement - Order ${req.params.id}`,
            type: 'CASH'
          });
        } else if (paymentType === 'CREDIT') {
          const creditBalance = Number((order.totalAmount - cashPaid).toFixed(2));

          if (cashPaid > 0) {
            await db.collection("ledger").add({
              customerId: order.customerId,
              orderId: req.params.id,
              debit: cashPaid,
              credit: cashPaid,
              interest: 0,
              balance: 0,
              date: new Date().toISOString(),
              notes: `Partial Cash Received - Order ${req.params.id}`,
              type: 'CASH'
            });
          }

          if (creditBalance > 0) {
            const lEntriesSnap = await db.collection("ledger")
              .where("customerId", "==", order.customerId)
              .where("type", "!=", "CASH")
              .get();
            const ledgerEntries = lEntriesSnap.docs.map(d => d.data()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const currentBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0;
            
            await db.collection("ledger").add({
              customerId: order.customerId,
              orderId: req.params.id,
              debit: creditBalance,
              credit: 0,
              interest: 0,
              balance: Number((currentBalance + creditBalance).toFixed(2)),
              date: new Date().toISOString(),
              notes: `Purchase Balance (On Credit) - Order ${req.params.id}`,
              type: 'CREDIT'
            });
          }
        }
      } else {
         updates.status = 'PARTIAL';
      }
      
      await orderRef.update(updates);
      logAction("Order Delivery Update", "Orders", { orderId: req.params.id, allDelivered, paymentType, remarks });
      res.json({ id: req.params.id, ...order, ...updates, items: updatedItemsSnap.docs.map(d => d.data()) });
    } catch (e) { next(e); }
  });

  // Ledger
  app.get("/api/ledger/:customerId", async (req, res, next) => {
    try {
      const snap = await db.collection("ledger").where("customerId", "==", req.params.customerId).get();
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { next(e); }
  });

  app.get("/api/ledger/:customerId/cash", async (req, res, next) => {
    try {
      const snap = await db.collection("ledger")
        .where("customerId", "==", req.params.customerId)
        .where("type", "==", "CASH")
        .get();
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { next(e); }
  });

  app.post("/api/ledger/payment", async (req, res, next) => {
    try {
      const { customerId, amount, notes } = req.body;
      const lSnap = await db.collection("ledger").where("customerId", "==", customerId).get();
      const entries = lSnap.docs.map(d => d.data()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const currentBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

      const ledgerEntry = {
        customerId,
        debit: 0,
        credit: amount,
        interest: 0,
        balance: Number((currentBalance - amount).toFixed(2)),
        date: new Date().toISOString(),
        notes: notes || "Payment received"
      };

      const docRef = await db.collection("ledger").add(ledgerEntry);
      logAction("Payment Received", "Ledger", { customerId, amount });
      res.json({ id: docRef.id, ...ledgerEntry });
    } catch (e) { next(e); }
  });

  // Interest Calculation Logic
  async function calculateDailyInterest() {
    console.log("[System] Triggering Automated Interest Calculation...");
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const dateStr = today.toISOString().split('T')[0];
      let interestAdded = 0;

      const customersSnap = await db.collection("customers").get();
      const ledgerSnap = await db.collection("ledger").get();
      const allLedger = ledgerSnap.docs.map(d => ({ id: d.id, ...d.data() } as LedgerEntry));

      for (const customerDoc of customersSnap.docs) {
        const customer = { id: customerDoc.id, ...customerDoc.data() } as Customer;
        const customerLedger = allLedger
          .filter((l: LedgerEntry) => l.customerId === customer.id)
          .sort((a: LedgerEntry, b: LedgerEntry) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (customerLedger.length === 0) continue;
        const lastEntry = customerLedger[customerLedger.length - 1];
        if (lastEntry.balance <= 0) continue;

        const lastDateStr = new Date(lastEntry.date).toISOString().split('T')[0];
        if (lastDateStr === dateStr && lastEntry.notes?.includes("Interest")) continue;

        const annualRate = (customer.interestRate || 12) / 100;
        const dailyRate = annualRate / 365;
        const interest = lastEntry.balance * dailyRate;
        
        if (interest > 0.01) {
          await db.collection("ledger").add({
            customerId: customer.id,
            debit: 0,
            credit: 0,
            interest: Number(interest.toFixed(2)),
            balance: Number((lastEntry.balance + interest).toFixed(2)),
            date: today.toISOString(),
            notes: `Interest (Daily Accrual) - ${dateStr}`
          });
          interestAdded++;
        }
      }

      if (interestAdded > 0) {
        await logAction("Auto Interest Calculation", "System", { count: interestAdded, date: dateStr });
        console.log(`[System] Interest posted for ${interestAdded} accounts.`);
      }
      return interestAdded;
    } catch (e) {
      console.error("Auto interest failed:", e);
      return 0;
    }
  }

  cron.schedule("59 23 * * *", calculateDailyInterest);

  app.post("/api/ledger/calculate-interest", async (req, res, next) => {
    try {
      const count = await calculateDailyInterest();
      res.json({ success: true, count });
    } catch (e) { next(e); }
  });

  // Settings
  app.get("/api/settings", async (req, res, next) => {
    try { res.json(await getSettings()); } catch (e) { next(e); }
  });
  
  app.get("/api/logs", async (req, res, next) => {
    try {
      const snap = await db.collection("logs").orderBy("timestamp", "desc").limit(100).get();
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { next(e); }
  });

  app.post("/api/settings", async (req, res, next) => {
    try {
      const settingsRef = db.collection("settings").doc("global");
      const oldSnap = await settingsRef.get();
      const oldSettings = oldSnap.exists ? oldSnap.data() : {};
      
      await settingsRef.set(req.body, { merge: true });
      const newSettings = { ...oldSettings, ...req.body };
      logAction("Updated Store Settings", "Administrative", { before: oldSettings, after: newSettings });
      res.json(newSettings);
    } catch (e) { next(e); }
  });

  // Taxes
  app.get("/api/taxes", async (req, res, next) => {
    try {
      const snap = await db.collection("taxes").get();
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { next(e); }
  });

  app.post("/api/taxes", async (req, res, next) => {
    try {
      const tax = { ...req.body };
      const docRef = await db.collection("taxes").add(tax);
      logAction("Created Tax Rule", "Administrative", tax);
      res.json({ id: docRef.id, ...tax });
    } catch (e) { next(e); }
  });

  app.put("/api/taxes/:id", async (req, res, next) => {
    try {
      const taxRef = db.collection("taxes").doc(req.params.id);
      const oldSnap = await taxRef.get();
      if (oldSnap.exists) {
        await taxRef.update(req.body);
        const updated = { id: req.params.id, ...oldSnap.data(), ...req.body };
        logAction("Updated Tax Rule", "Administrative", { before: oldSnap.data(), after: updated });
        res.json(updated);
      } else {
        res.status(404).json({ error: "Tax not found" });
      }
    } catch (e) { next(e); }
  });

  app.delete("/api/taxes/:id", async (req, res, next) => {
    try {
      const taxRef = db.collection("taxes").doc(req.params.id);
      const snap = await taxRef.get();
      if (!snap.exists) return res.status(404).json({ error: "Tax not found" });
      
      await taxRef.delete();
      logAction("Deleted Tax Rule", "Administrative", snap.data());
      res.json({ success: true });
    } catch (e) { next(e); }
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("API Error:", err);
    res.status(500).json({ 
      error: err.message || "Internal Server Error",
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack
    });
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
;
