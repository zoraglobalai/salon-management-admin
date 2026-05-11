import { getReportsSummary } from "./src/modules/reports/reports.service";
import { DataSource } from "typeorm";
import { config } from "./src/database/config";

async function test() {
  const ds = new DataSource(config);
  await ds.initialize();
  
  // We need to inject the datasource into the service if it uses one, 
  // but reports.service.ts uses getRepository which relies on the default connection.
  
  const user = {
    tenant_id: "77777777-7777-7777-7777-777777777777",
    type: "owner",
    id: "admin-id"
  } as any;
  
  const filters = {
    startDate: "2026-05-11",
    endDate: "2026-05-11"
  };
  
  try {
    const result = await getReportsSummary(user, filters);
    console.log("SUCCESS");
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error("ERROR DETECTED");
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
    if (err.query) console.error("Query:", err.query);
    if (err.parameters) console.error("Parameters:", err.parameters);
  } finally {
    await ds.destroy();
  }
}

test();
