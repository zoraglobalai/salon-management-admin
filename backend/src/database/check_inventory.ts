import { query } from "./pool";

async function checkInventory() {
  try {
    const res = await query("SELECT item_name, name, quantity, stock, reorder_level FROM inventory", []);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkInventory();
