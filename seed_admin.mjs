import { initializeApp } from 'firebase/app';
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sdk = require('./src/dataconnect-generated/index.cjs.js');

const firebaseConfig = {
  projectId: "pharaoh-54a0e",
  appId: "1:909637352706:web:98a9ef33d6b680d6e8d61b",
  storageBucket: "pharaoh-54a0e.firebasestorage.app",
  apiKey: "AIzaSyBWy2AP5d-YTdpirVipzs2tvd0hVqqfeIw",
  authDomain: "pharaoh-54a0e.firebaseapp.com",
  messagingSenderId: "909637352706",
};

const app = initializeApp(firebaseConfig);
const dc = getDataConnect(app, sdk.connectorConfig);

async function seed() {
  console.log("Seeding admin user...");
  try {
    await sdk.createAppUser(dc, {
      email: "innovations@billiondollarboy.com",
      role: "admin",
      addedBy: "system"
    });
    console.log("Successfully seeded innovations@billiondollarboy.com as admin!");
  } catch (error) {
    if (error.message && error.message.includes("already exists")) {
       console.log("Admin user already exists, skipping...");
    } else {
       console.error("Error seeding admin:", error);
    }
  }
}

seed();
